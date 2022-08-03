/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import {ILogOption} from '../types';

import winston = require('winston');
import Config = require('../common/Config');

class Logger {
    private static instance: Logger;
    private logger: winston.Logger;
    private logOption: ILogOption;

    private constructor() {
        if (Logger.instance === undefined) {
            // Get log option
            this.logOption = Config.getInstance().getLogOption();

            // const {combine, timestamp, colorize, label, printf} = winston.format;
            const {combine, timestamp, printf} = winston.format;

            // Define customized format
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
            const bnzFormat = printf(({timestamp, level, message, label}: any) => {
                return `${timestamp} [${level.toUpperCase()}] ${message}`;
            });

            // Create logger instance
            this.logger = winston.createLogger( {
                level: this.logOption.level, // error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5
                //   format: winston.format.combine(winston.format.timestamp(), winston.format.colorize(), winston.format.simple()),
                transports: [new winston.transports.File({
                    filename: this.logOption.filePath,
                    maxsize: <number><unknown> this.logOption.maximumSize,
                    maxFiles: <number><unknown> this.logOption.maximumFiles,
                    format: combine(timestamp(), bnzFormat),
                    options: {flags: 'w'}}),
                ],
            });

            // Remove console log output in production and test env.
            if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test' ) {
                this.logger.add( new winston.transports.Console({format: combine(timestamp(), bnzFormat)}));
            }

            Logger.instance = this;
        }

        return Logger.instance;
    }

    static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }

        return Logger.instance;
    }

    // Print start log
    //  - functionName: function name or function object can be specified here
    //  - className: class name or class instance can be specified here
    //  - fileName: file name can be specified here
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    start(functionName: string | Record<string, any>, className?: string | Record<string, any>, fileName?: string) {
        // Get function name
        let funName = '';
        if (arguments.length >= 1) {
            switch (typeof functionName) {
                case 'function':
                    funName = functionName.name;
                    break;
                case 'string':
                    funName = functionName;
                    break;
                default:
                    funName = '';
            }
        }

        // Get class name
        let clsName = '';
        if (arguments.length >= 2) {
            switch (typeof className) {
                case 'string':
                    clsName = className;
                    break;
                case 'object':
                    if (className !== null && className.constructor !== undefined) {
                        clsName = className.constructor.name;
                    } else {
                        clsName = '';
                    }
                    break;
                default:
                    clsName = '';
            }
        }

        // Print start log
        if (arguments.length >= 3) {
            this.logger.info(`${fileName} : ${clsName} : ${funName.replace(/bound /, '')}    start ===>`);
        } else if (arguments.length == 2) {
            this.logger.info(`${clsName} : ${funName.replace(/bound /, '')}    start ===>`);
        } else {
            this.logger.info(`${funName.replace(/bound /, '')}    start ===>`);
        }
    }

    // Print end log
    //  - functionName: function name or function object can be specified here
    //  - className: class name or class instance can be specified here
    //  - fileName: file name can be specified here
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    end(functionName: string | Record<string, any>, className?: string | Record<string, any>, fileName?: string) {
        // Get function name
        let funName = '';
        if (arguments.length >= 1) {
            switch (typeof functionName) {
                case 'function':
                    funName = functionName.name;
                    break;
                case 'string':
                    funName = functionName;
                    break;
                default:
                    funName = '';
            }
        }

        // Get class name
        let clsName = '';
        if (arguments.length >= 2) {
            switch (typeof className) {
                case 'string':
                    clsName = className;
                    break;
                case 'object':
                    if (className !== null && className.constructor !== undefined) {
                        clsName = className.constructor.name;
                    } else {
                        clsName = '';
                    }
                    break;
                default:
                    clsName = '';
            }
        }

        // Print end log
        if (arguments.length >= 3) {
            this.logger.info(`${fileName} : ${clsName} : ${funName.replace(/bound /, '')}      end <===`);
        } else if (arguments.length == 2) {
            this.logger.info(`${clsName} : ${funName.replace(/bound /, '')}      end <===`);
        } else {
            this.logger.info(`${funName.replace(/bound /, '')}      end <===`);
        }
    }

    // Get error stack with current file name and line number
    getErrorStack(newError: Error, caughtError: Error) {
        if (newError.stack === undefined && caughtError.stack === undefined) {
            return '';
        } else if (newError.stack !== undefined && caughtError.stack === undefined) {
            return newError.stack;
        } else if (newError.stack === undefined && caughtError.stack !== undefined) {
            return caughtError.stack;
        } else {
            // Get error stack
            const stack1 = newError.stack.split('\n');
            const stack2 = caughtError.stack.split('\n');

            // Add first and second lines of new error
            stack2.splice(0, 0, stack1[0]);
            stack2.splice(1, 0, stack1[1]);

            // Add error code and message
            // stack2.splice(2, 0, `  Error Code: ${caughtError.code}   Error Message: ${caughtError.message}`);

            // Add additional 4 spaces to make output nice
            stack2[2] = '    ' + stack2[2];

            return stack2.join('\n');
        }
    }

    debug(log: string) {
        this.logger.debug(log);
    }

    error(log: string) {
        this.logger.error(log);
    }

    warn(log: string) {
        this.logger.warn(log);
    }

    info(log: string) {
        this.logger.info(log);
    }
}

// Create instance
// const logger = Logger.getInstance();
// Object.freeze(logger);

export = Logger;
