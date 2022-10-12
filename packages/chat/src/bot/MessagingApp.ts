/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import type { Application } from 'express';
import express from "express";
import * as fs from "fs-extra";
import helmet from "helmet";
import http from "http";
import https from "https";
import { ServerOptions } from '../config/base/AppConfig';
import { SecurityManager } from '../security/SecurityManager';
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
        // Create express app
        this.app = express();
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: false }));
        this.app.use(helmet());

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
            const port = this.normalizePort(this.option.messagePort.toString());
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

}