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
import express from 'express';
import * as fs from 'fs-extra';
import helmet from 'helmet';
import http from 'http';
import https from 'https';
import { IAppOption, IProtocol } from '../types';
import { logger } from '../utils/Logger';
import { Util } from '../utils/Util';

export class MessagingApp {
    private readonly option: IAppOption;
    private readonly app: Application;
    // server is readonly, but set outside the class constructor
    private server: https.Server | http.Server;

    /**
     * Creates a new instance of the MessagingApp
     *
     * @param option
     */
    constructor(option: IAppOption) {
        // Set app option
        this.option = option;

        // Create express app
        this.app = express();
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: false }));
        this.app.use(helmet()); // Secure Express apps with various HTTP headers
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
        // Print start log
        logger.start(this.startServer, this);

        try {
            // Set port
            const port = this.normalizePort(this.option.port.toString());
            this.app.set('port', port);

            // Create Http/Https server
            if (this.option.protocol.toLowerCase() === IProtocol.HTTPS) {
                // Check TLS key and certificate
                if (fs.existsSync(this.option.tlsKey) === false) {
                    logger.error(`The TLS key file "${this.option.tlsKey}" does not exist!`);
                    process.exit(1);
                }
                if (fs.existsSync(this.option.tlsCert) === false) {
                    logger.error(`The TLS certificate file "${this.option.tlsCert}" does not exist!`);
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
            // ZWECC001E: Internal server error: {{error}}
            logger.error(Util.getErrorMessage('ZWECC001E', { error: 'Message app server start exception', ns: 'ChatMessage' }));
            logger.error(logger.getErrorStack(new Error(error.name), error));
            process.exit(3);
        } finally {
            // Print end log
            logger.end(this.startServer, this);
        }
    }

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
                logger.error(`Listen is not called!`);
                logger.error(error.stack);
                throw error;
            }

            const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`;

            // handle specific listen errors with friendly messages
            switch (error.code) {
                case 'EACCES':
                    logger.error(`${bind} requires elevated privileges`);
                    logger.error(error.stack);
                    process.exit(4);
                    break;
                case 'EADDRINUSE':
                    logger.error(`${bind} is already in use`);
                    logger.error(error.stack);
                    process.exit(5);
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
            logger.info(`The messaging app server is listening on ${bind}`);
        };
    }

}