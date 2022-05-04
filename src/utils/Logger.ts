/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */


import {ILogLevel, ILogOption} from '../types';
import winston = require('winston');
import fs = require('fs');

class Logger {
    private static instance: Logger;
    private logger: winston.Logger;

    private constructor() {
        if (Logger.instance === undefined) {
            // const {combine, timestamp, colorize, label, printf} = winston.format;
            const {combine, timestamp, printf} = winston.format;

            // Define customized format
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
            const bnzFormat = printf(({timestamp, level, message, label}: any) => {
                return `${timestamp} [${level.toUpperCase()}] ${message}`;
            });

            // Get log option
            const logOption: ILogOption = {
                level: ILogLevel.INFO,
                maximumSize: null,
                maximumFiles: null,
            };
            if (process.env.COMMONBOT_LOG_LEVEL !== undefined && process.env.COMMONBOT_LOG_LEVEL.trim() !== '') {
                const logLevels: string[] = [ILogLevel.ERROR, ILogLevel.WARN, ILogLevel.INFO, ILogLevel.DEBUG, ILogLevel.VERBOSE, ILogLevel.SILLY];
                if (logLevels.includes(process.env.COMMONBOT_LOG_LEVEL)) {
                    logOption.level = <ILogLevel>process.env.COMMONBOT_LOG_LEVEL;
                } else {
                    console.error('Unsupported value specified in the variable COMMONBOT_LOG_LEVEL.');
                }
            }
            if (process.env.COMMONBOT_LOG_MAX_SIZE !== undefined && process.env.COMMONBOT_LOG_MAX_SIZE.trim() !== '') {
                logOption.maximumSize = process.env.COMMONBOT_LOG_MAX_SIZE;
            }
            if (process.env.COMMONBOT_LOG_MAX_FILES !== undefined && process.env.COMMONBOT_LOG_MAX_FILES.trim() !== '') {
                logOption.maximumFiles = process.env.COMMONBOT_LOG_MAX_FILES;
            }

            // Get log file
            let logFile = `${__dirname}/../logs/common-bot.log`;
            if (process.env.COMMONBOT_LOG_FILE !== undefined) {
                if (fs.existsSync(process.env.COMMONBOT_LOG_FILE)) {
                    logFile = process.env.COMMONBOT_LOG_FILE;
                } else {
                    console.log(`The log File specified in the variable COMMONBOT_LOG_FILE does not exist!`);
                }
            }

            // Create logger instance
            this.logger = winston.createLogger( {
                level: logOption.level, // error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5
                //   format: winston.format.combine(winston.format.timestamp(), winston.format.colorize(), winston.format.simple()),
                transports: [new winston.transports.File({
                    filename: logFile,
                    maxsize: <number><unknown>logOption.maximumSize,
                    maxFiles: <number><unknown>logOption.maximumFiles,
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

    // Get errork stack with current file name and line number
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

const logger: Logger = Logger.getInstance();
export = logger;
