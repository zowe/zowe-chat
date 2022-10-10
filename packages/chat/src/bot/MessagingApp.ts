/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import { IUser } from "@zowe/commonbot";
import cors from "cors";
import crypto from "crypto";
import type { Application } from 'express';
import express from "express";
import * as fs from "fs-extra";
import http from "http";
import https from "https";
import path from "path";
import { ServerOptions } from '../config/base/AppConfig';
import { EnvironmentVariables } from "../const/EnvironmentVariables";
import { SecurityManager } from '../security/SecurityManager';
import { CredentialType } from "../security/user/ChatCredential";
import { ChatPrincipal } from "../security/user/ChatPrincipal";
import { ChatUser } from "../security/user/ChatUser";
import { Logger } from '../utils/Logger';

/**
 *  This class contains server-side endpoints and static web elements, serviced under-the-hood by an express application.
 *  This class is capable of generating a one-time user challenge link, which users can visit to authenticate against Zowe ChatBot.
 * 
 *  There should only be one instance of the class active at a time.
 */
export class MessagingApp {

    private readonly log: Logger;
    private readonly option: ServerOptions;
    private readonly app: Application;
    private readonly securityFacility: SecurityManager;
    private readonly activeChallenges: Map<string, ChallengeComplete>;
    // server is readonly, but set outside the class constructor
    private server: https.Server | http.Server;

    /**
     * Creates a new instance of the MessagingApp based on Zowe ChatBot's server options. 
     * Sets express API routes and serves the frontend web deployment. 
     * 
     * @param option 
     * @param securityFac used to generate challenge links and authenticate users
     * @param log 
     */
    constructor(option: ServerOptions, securityFac: SecurityManager, log: Logger) {
        // Set app option
        this.option = option;
        this.log = log;
        this.securityFacility = securityFac;
        this.activeChallenges = new Map<string, ChallengeComplete>()
        // Create express app
        this.app = express();
        this.app.use(cors(this.corsOptions()))
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: false }));

        this.setApiRoutes()

        if (EnvironmentVariables.ZOWE_CHAT_DEPLOY_UI) {
            const staticFiles = EnvironmentVariables.ZOWE_CHAT_STATIC_DIR

            fs.writeFileSync(path.resolve(staticFiles, "env.js"),
                `
            window.env = {
                API_HOST: '${this.option.protocol}://${this.option.hostName}:${this.option.port}'
            };
            `, { flag: 'w' }
            )

            this.app.use(express.static(staticFiles));
            const rootRoute = express.Router();
            rootRoute.get('(/*)?', (req, res) => {
                res.sendFile(path.resolve(staticFiles, "index.html"));
            });
            this.app.use(rootRoute)
        } else {
            this.log.warn("Not deploying static frontend elements. This is intended for use by developers")
        }

    }

    /**
     * Generates a challenge link users can visit to authenticate against Zowe ChatBot. This challenge link leads to the 
     * Zowe ChatBot Web UI, which is served from the same express application as its REST APIs. After a user successfully logs
     * in, the challenge link is expired. 
     * 
     * @future The challenge link should expire after a period of time, even if the user does not log in.
     * 
     * @param user the user who will authenticate against the link
     * @param onDone an action the caller can take after a successful authentication, such as sending a follow up message
     * @returns the fully qualified challenge link
     */
    public generateChallenge(user: IUser, onDone: () => void): string {

        // challenge string is base64 encoded - username:email:id:randombytes 
        let challengeString = Buffer.from(`${user.name}:${user.email}:${user.id}:${crypto.randomBytes(15).toString('hex')}`).toString('base64')
        this.activeChallenges.set(challengeString, {
            user: user,
            onDone: onDone,
        })

        let port = this.option.port
        // if we're in development mode and not serving static elements, use the local react development port
        if (!EnvironmentVariables.ZOWE_CHAT_DEPLOY_UI && process.env.NODE_ENV == "development") {
            port = 3000
        }
        return `${this.option.protocol}://${this.option.hostName}:${port}/login?__key=${challengeString}`
    }

    /**
     * Defines Express REST API Routes. 
     * 
     * - POST /api/v1/auth/login 
     *    - used to authenticate a user and requires a valid challenge link as part of the POST body.
     */
    private setApiRoutes() {

        this.app.post('/api/v1/auth/login', async (req, res) => {
            try {

                // add defensive block
                let challenge: string = req.body.challenge
                let user: string = req.body.user;
                let password: string = req.body.password;

                let storedChallenge = this.activeChallenges.get(challenge)
                if (challenge == undefined || storedChallenge == undefined) {
                    res.status(403).send('The link you used to login is either expired or invalid. Please request a new one from Zowe ChatBot.')
                    return
                }
                let authN = await this.securityFacility.authenticateUser(new ChatPrincipal(new ChatUser(storedChallenge.user.name, user), {
                    type: CredentialType.PASSWORD, // always considered a password, even if using MFA credential
                    value: password
                }));
                if (authN) {
                    this.activeChallenges.delete(challenge)
                    res.status(200).send('OK')
                    storedChallenge.onDone()
                } else {
                    res.status(401).send('Unauthorized')
                }
            } catch (error) {
                this.log.debug("Error trying to authenticate user " + req.body.user + ".")
                this.log.debug("Error: " + error)
                this.log.debug(error.getErrorStack())
                res.status(500).send('Interal Server Error')
            }
        })
    }

    /**
     * This function should not be used by most callers. The CommonBot framework requires access to this app.
     * 
     * @returns the underlying express application
     */
    getApplication(): Application {
        return this.app;
    }

    /**
     * Configures and creates the http/https server underlying the express application, and then starts it.
     * 
     */
    startServer(): void {
        try {
            // Set port
            const port = this.normalizePort(this.option.port.toString());
            this.app.set('port', port);

            // Create Http/Https server
            if (this.option.protocol.toLowerCase() === 'https') {
                // Check TLS key and certificate
                if (fs.existsSync(this.option.tlsKey) === false) {
                    console.error(`The TLS key file "${this.option.tlsKey}" does not exist!`);
                    process.exit(1);
                }
                if (fs.existsSync(this.option.tlsCert) === false) {
                    console.error(`The TLS certificate file "${this.option.tlsCert}" does not exist!`);
                    process.exit(2);
                }

                // Create HTTPS server
                this.server = https.createServer({
                    key: fs.readFileSync(this.option.tlsKey),
                    cert: fs.readFileSync(this.option.tlsCert),
                }, this.app);
            } else {
                this.server = http.createServer(this.app);
            }

            // Listen on provided port, on all network interfaces.
            this.server.listen(port);
            this.server.on('error', this.onError(port));
            this.server.on('listening', this.onListening(this.server));
        } catch (error) {
            console.error(`There's some problem to create the messaging app server!`);
            console.error(error.stack);
            process.exit(1);
        }
    }

    // TODO: is there a place where port will be NaN and the app should not fail? named pipes?
    /** 
     * Normalize a port into a number, string, or false.
     */
    private normalizePort(val: string) {
        const port = parseInt(val, 10);

        if (isNaN(port)) {
            // named pipe
            return val;
        }

        if (port >= 0) {
            // port number
            return port;
        }

        return false;
    }

    /**
     * Event listener for error event. 
     */
    private onError(port: string | number | boolean) {
        return function (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            if (error.syscall !== 'listen') {
                console.error(`Listen is not called!`);
                console.error(error.stack);
                throw error;
            }

            const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`;

            // handle specific listen errors with friendly messages
            switch (error.code) {
                case 'EACCES':
                    console.error(`${bind} requires elevated privileges`);
                    console.error(error.stack);
                    process.exit(2);
                    break;
                case 'EADDRINUSE':
                    console.error(`${bind} is already in use`);
                    console.error(error.stack);
                    process.exit(3);
                    break;
                default:
                    throw error;
            }
        };
    }

    /**
     * Event listener for listening event
     * 
     * @param server 
     * @returns 
     */
    private onListening(server: https.Server | http.Server) {
        return function () {
            const addr = server.address();
            const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`;
            console.info(`The messaging app server is listening on ${bind}`);
        };
    }

    /**
     * Sets Cross-Origin-Request-Forgery options for the express server.
     * 
     * @returns 
     * 
     */
    private corsOptions(): any {
        const whitelist: string[] = [`${this.option.protocol}://${this.option.hostName}`,
        `${this.option.protocol}://${this.option.hostName}:${this.option.port}`]

        if (!EnvironmentVariables.ZOWE_CHAT_DEPLOY_UI ||
            process.env.NODE_ENV == "development") {
            whitelist.push("http://localhost", "http://localhost:3000")
        }
        return {
            origin: (origin: string, callback: Function) => {
                if (whitelist.indexOf(origin) !== -1 || (origin == null || origin == undefined)) {
                    callback(null, true);
                }
                else {
                    callback(new Error(origin + "Domain not allowed by CORS"));
                }
            }
        };
    }

}

/**
 * Type used as part of tracking login challenges.
 */
type ChallengeComplete = {
    user: IUser,
    onDone: () => void
}