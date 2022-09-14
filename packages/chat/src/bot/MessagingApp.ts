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
import * as fs from "fs";
import helmet from 'helmet';
import http from "http";
import https from "https";
import { ServerOptions } from '../config/base/AppConfig';
import { SecurityManager } from '../security/SecurityManager';
import { CredentialType } from "../security/user/ChatCredential";
import { ChatPrincipal } from '../security/user/ChatPrincipal';
import { ChatUser } from '../security/user/ChatUser';
import { Logger } from '../utils/Logger';

export class MessagingApp {

    private readonly log: Logger;
    private readonly option: ServerOptions;
    private readonly app: Application;
    private readonly securityFacility: SecurityManager;
    private readonly activeChallenges: Map<string, IUser>;
    private server: https.Server | http.Server;

    constructor(option: ServerOptions, securityFac: SecurityManager, log: Logger) {
        // Set app option
        this.option = option;
        this.log = log;
        this.securityFacility = securityFac;
        this.activeChallenges = new Map<string, IUser>()
        // Create express app
        this.app = express();
        this.app.use(cors(this.corsOptions()))
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: false }));
        this.app.use(helmet()); // Secure Express apps with various HTTP headers
        const staticFiles = (process.env.ZOWE_CHAT_WEB_DIR == undefined) ? "../chat-react-ui/build/" : process.env.ZOWE_CHAT_WEB_DIR

        //  this.app.use(express.static(staticFiles));
        this.setRoutes()
        const rootRoute = express.Router();
        //  rootRoute.get('(/*)?', (req, res) => {
        //     res.sendFile(path.resolve(staticFiles, "index.html"));
        //   });
        this.app.use(rootRoute)
    }

    public generateChallenge(user: IUser) {
        let challengeString = Buffer.from(`${user.name}:${user.email}:${user.id}:${crypto.randomBytes(15).toString('hex')}`).toString('base64')
        //  return `${this.option.protocol}://${this.option.hostName}:${this.option.port}/login/${challengeString}`
        this.activeChallenges.set(challengeString, user)
        return `${this.option.protocol}://${this.option.hostName}:3000/login?__key=${challengeString}`

    }

    private getUser(userId: number) {
        return true
    }

    private setRoutes() {
        this.app.get('/api/v1/auth/user/:userId', this.getUser.bind(this));
        this.app.post('/api/v1/auth/login', async (req, res) => {
            try {




                // add defensive block
                let challenge: string = req.body.challenge
                let user: string = req.body.user;
                let password: string = req.body.password;

                let iUser = this.activeChallenges.get(challenge)
                if (challenge == undefined || iUser == undefined) {
                    res.status(403).send('The link you used to login is either expired or invalid. Please request a new one from Zowe ChatBot.')
                    return
                }
                let authN = await this.securityFacility.authenticateUser(new ChatPrincipal(new ChatUser(iUser.name, user), {
                    type: CredentialType.PASSWORD,
                    value: password
                }));
                if (authN) {
                    this.activeChallenges.delete(challenge)
                    res.status(200).send('OK')
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

    // Get messaging application
    getApplication(): Application {
        return this.app;
    }

    // Start messaging application server
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

    // Normalize a port into a number, string, or false.
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

    // Event listener for error event.
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

    // Event listener for listening event
    private onListening(server: https.Server | http.Server) {
        return function () {
            const addr = server.address();
            const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`;
            console.info(`The messaging app server is listening on ${bind}`);
        };
    }

    private corsOptions(): any {

        const whitelist: string[] = ["http://localhost", "http://localhost:8081", "http://localhost:3000"];

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