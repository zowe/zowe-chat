/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import * as fs from "fs-extra";
import * as path from "path";
import { AppConfig, ILogLevel } from "../config/base/AppConfig";
import winston = require('winston');

export class Logger {

    private readonly mLog: winston.Logger;
    private readonly appConfig: AppConfig;

    constructor(appConfig: AppConfig) {

        this.appConfig = appConfig

        // TODO: Don't update the mConfig object? Keep computed properties separate?
        try {
            // Handle environment variables
            if (process.env.ZOWE_CHAT_LOG_FILE_PATH !== undefined && process.env.ZOWE_CHAT_LOG_FILE_PATH.trim() !== '') {
                this.appConfig.app.log.filePath = process.env.ZOWE_CHAT_LOG_FILE_PATH; // Set log file
            } else {
                this.appConfig.app.log.filePath = `${__dirname}/../log/zoweChatServer.log`;
            }
            const filePath = path.dirname(this.appConfig.app.log.filePath);
            fs.ensureFileSync(filePath)
            if (process.env.ZOWE_CHAT_LOG_LEVEL !== undefined && process.env.ZOWE_CHAT_LOG_LEVEL.trim() !== '') {
                if ((Object.values<string>(ILogLevel)).includes(process.env.ZOWE_CHAT_LOG_LEVEL)) {
                    this.appConfig.app.log.level = <ILogLevel>process.env.ZOWE_CHAT_LOG_LEVEL;
                } else {
                    console.error('Unsupported value specified in the variable ZOWE_CHAT_LOG_LEVEL!');
                }
            }
            if (process.env.ZOWE_CHAT_LOG_MAX_SIZE !== undefined && process.env.ZOWE_CHAT_LOG_MAX_SIZE.trim() !== '') {
                this.appConfig.app.log.maximumSize = process.env.ZOWE_CHAT_LOG_MAX_SIZE;
            }
            if (process.env.ZOWE_CHAT_LOG_MAX_FILES !== undefined && process.env.ZOWE_CHAT_LOG_MAX_FILES.trim() !== '') {
                this.appConfig.app.log.maximumFiles = process.env.ZOWE_CHAT_LOG_MAX_FILES;
            }
        } catch (error) {
            console.error(`Failed to config the log!`);
            console.error(error.stack);
            process.exit(3);
        }

        // const {combine, timestamp, colorize, label, printf} = winston.format;
        const { combine, timestamp, printf } = winston.format;

        // Define customized format
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
        const bnzFormat = printf(({ timestamp, level, message, label }: any) => {
            return `${timestamp} [${level.toUpperCase()}] ${message}`;
        });

        // Create logger instance
        this.mLog = winston.createLogger({
            level: this.appConfig.app.log.level, // error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5
            //   format: winston.format.combine(winston.format.timestamp(), winston.format.colorize(), winston.format.simple()),
            transports: [new winston.transports.File({
                filename: this.appConfig.app.log.filePath,
                maxsize: <number><unknown>this.appConfig.app.log.maximumSize,
                maxFiles: <number><unknown>this.appConfig.app.log.maximumFiles,
                format: combine(timestamp(), bnzFormat),
                options: { flags: 'w' }
            }),
            ],
        });

        // TODO: this is an express env, should we use something else more specific? ZOWE_CHAT_DEV_MODE?
        // Only use console logger in development mode.
        if (process.env.NODE_ENV === 'development') {
            this.mLog.add(new winston.transports.Console({ format: combine(timestamp(), bnzFormat) }));
        }

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
            this.mLog.info(`${fileName} : ${clsName} : ${funName.replace(/bound /, '')}    start ===>`);
        } else if (arguments.length == 2) {
            this.mLog.info(`${clsName} : ${funName.replace(/bound /, '')}    start ===>`);
        } else {
            this.mLog.info(`${funName.replace(/bound /, '')}    start ===>`);
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
            this.mLog.info(`${fileName} : ${clsName} : ${funName.replace(/bound /, '')}      end <===`);
        } else if (arguments.length == 2) {
            this.mLog.info(`${clsName} : ${funName.replace(/bound /, '')}      end <===`);
        } else {
            this.mLog.info(`${funName.replace(/bound /, '')}      end <===`);
        }
    }

    // TODO: Marked private, see what breaks.
    // Get error stack with current file name and line number
    private getErrorStack(newError: Error, caughtError: Error) {
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

    public debug(log: string) {
        this.mLog.debug(log);
    }

    public error(log: string) {
        this.mLog.error(log);
    }

    public warn(log: string) {
        this.mLog.warn(log);
    }

    public info(log: string) {
        this.mLog.info(log);
    }

}