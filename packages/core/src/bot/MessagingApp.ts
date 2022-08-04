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
import helmet from 'helmet';
import { IAppOption } from '../config/base/AppConfig';

import fs = require('fs');
import express = require('express');
import https = require('https');
import http = require('http');

export class MessagingApp {
    private option: IAppOption;
    private app: Application;
    private server: https.Server | http.Server;

    constructor(option: IAppOption) {
        // Set app option
        this.option = option;

        // Create express app
        this.app = express();
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: false }));
        this.app.use(helmet()); // Secure Express apps with various HTTP headers
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
}