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
import path from "path";
import * as winston from "winston";
import { AppConfigLoader } from "../config/AppConfigLoader";
import { AppConfig, LogLevel } from "../config/base/AppConfig";

/**
 * This class uses console.log and process.env, as classes which assist with those functions require the logger
 */
export class Logger {

    private static instance: Logger;
    private readonly log: winston.Logger;
    private readonly appConfig: AppConfig;

    // TODO: move into constructor
    private logFile: string;

    private constructor(appConfig: AppConfig) {
        this.appConfig = appConfig;

        // override values in appConfig if we have environment variables setup
        try {
            this.logFile = process.env.ZOWE_CHAT_LOG_FILE_PATH || `./log/zoweChatServer.log`;
            fs.ensureFileSync(this.logFile);
            if (process.env.ZOWE_CHAT_LOG_LEVEL != undefined) {
                if ((Object.values<string>(LogLevel)).includes(process.env.ZOWE_CHAT_LOG_LEVEL)) {
                    this.appConfig.app.log.level = <LogLevel>process.env.ZOWE_CHAT_LOG_LEVEL;
                } else {
                    console.error('Unsupported value specified in the variable ZOWE_CHAT_LOG_LEVEL!');
                }
            }
            if (process.env.ZOWE_CHAT_LOG_MAX_SIZE != undefined) {
                this.appConfig.app.log.maximumSize = process.env.ZOWE_CHAT_LOG_MAX_SIZE;
            }
            if (process.env.ZOWE_CHAT_LOG_MAX_FILES != undefined) {
                if (+process.env.ZOWE_CHAT_LOG_MAX_FILES != undefined) {
                    this.appConfig.app.log.maximumFiles = +process.env.ZOWE_CHAT_LOG_MAX_FILES;
                }
            }
        } catch (error) {
            console.error(`Failed to config the log!`);
            console.error(error.stack);
            process.exit(3);
        }
        // end override

        // const {combine, timestamp, colorize, label, printf} = winston.format;
        const { combine, timestamp, printf } = winston.format;

        // Define customized format
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
        const bnzFormat = printf(({ timestamp, level, message, label }: any) => {
            return `${timestamp} [${level.toUpperCase()}] ${message}`;
        });

        // TODO: fix file logging - not working
        // Create logger instance
        this.log = winston.createLogger({
            level: this.appConfig.app.log.level, // error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5
            handleExceptions: true,
            format: combine(timestamp(), bnzFormat),
            exitOnError: true,
            //   format: winston.format.combine(winston.format.timestamp(), winston.format.colorize(), winston.format.simple()),
        });

        const fileTransport = new winston.transports.File({
            filename: path.resolve(this.logFile),
            maxsize: 10 * 1024 * 1024,
            maxFiles: this.appConfig.app.log.maximumFiles,
            format: combine(timestamp(), bnzFormat),
            options: { flags: 'a' }
        });

        this.log.add(fileTransport);

        // TODO: this is an express env, should we use something else more specific? ZOWE_CHAT_DEV_MODE?
        // Only use console logger in development mode.
        if (process.env.NODE_ENV === 'development') {
            this.log.add(new winston.transports.Console({ format: combine(timestamp(), bnzFormat) }));
        }

        process.on("beforeExit", (code) => {
            this.log.clear();
        });

        process.on("exit", (code) => {
            this.log.end();
        });

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
            this.log.info(`${fileName} : ${clsName} : ${funName.replace(/bound /, '')}    start ===>`);
        } else if (arguments.length == 2) {
            this.log.info(`${clsName} : ${funName.replace(/bound /, '')}    start ===>`);
        } else {
            this.log.info(`${funName.replace(/bound /, '')}    start ===>`);
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
            this.log.info(`${fileName} : ${clsName} : ${funName.replace(/bound /, '')}      end <===`);
        } else if (arguments.length == 2) {
            this.log.info(`${clsName} : ${funName.replace(/bound /, '')}      end <===`);
        } else {
            this.log.info(`${funName.replace(/bound /, '')}      end <===`);
        }
    }

    // Get error stack with current file name and line number
    public getErrorStack(newError: Error, caughtError: Error) {
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

    public silly(log: string) {
        this.log.silly(log);
    }

    public debug(log: string) {
        this.log.debug(log);
    }

    public error(log: string) {
        this.log.error(log);
    }

    public warn(log: string) {
        this.log.warn(log);
    }

    public info(log: string) {
        this.log.info(log);
    }


    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger(AppConfigLoader.loadAppConfig());
        }
        return Logger.instance;
    }


}