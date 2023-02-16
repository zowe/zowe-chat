/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import fs from 'fs';
import path from 'path';
import * as winston from 'winston';

import { config } from '../settings/Config';
import { EnvironmentVariable } from '../settings/EnvironmentVariable';
import { ILogLevel, ILogOption } from '../types';
import { Util } from './Util';

/**
 * This class uses console.log, as classes which assist with those functions require the logger
 */
class Logger {
  private readonly logger: winston.Logger;
  private option: ILogOption;

  constructor() {
    // override values in appConfig if we have environment variables setup
    try {
      this.option = {
        filePath: `${__dirname}/../log/chatServer.log`,
        level: ILogLevel.INFO,
        maximumSize: -1,
        maximumFile: -1,
        consoleSilent: true,
      };

      // Get log configuration
      const logConfig = config.getLogOption();

      // Get log file path
      if (EnvironmentVariable.ZOWE_CHAT_LOG_FILE_PATH !== null && EnvironmentVariable.ZOWE_CHAT_LOG_FILE_PATH !== undefined) {
        this.option.filePath = EnvironmentVariable.ZOWE_CHAT_LOG_FILE_PATH;
      } else {
        if (logConfig.filePath !== null && logConfig.filePath !== undefined && logConfig.filePath.trim() !== '') {
          if (logConfig.filePath.indexOf('${ZOWE_CHAT_HOME}') >= 0) {
            this.option.filePath = logConfig.filePath.replace('${ZOWE_CHAT_HOME}', EnvironmentVariable.ZOWE_CHAT_HOME);
          } else if (logConfig.filePath.indexOf('$ZOWE_CHAT_HOME') >= 0) {
            this.option.filePath = logConfig.filePath.replace('$ZOWE_CHAT_HOME', EnvironmentVariable.ZOWE_CHAT_HOME);
          } else if (logConfig.filePath.indexOf('/') < 0) {
            this.option.filePath = `${__dirname}/../log/${logConfig.filePath}`;
          } else if (logConfig.filePath.startsWith('../')) {
            this.option.filePath = `${__dirname}/${logConfig.filePath}`;
          } else if (logConfig.filePath.startsWith('./')) {
            this.option.filePath = `${__dirname}/log/${logConfig.filePath}`;
          } else {
            this.option.filePath = logConfig.filePath;
          }
        }
      }
      console.info(`Log option:\n${JSON.stringify(this.option, null, 4)}`);

      // Create log directory if not exist
      const dirName = path.dirname(this.option.filePath);
      if (fs.existsSync(dirName) === false) {
        fs.mkdirSync(dirName, { recursive: true });
      }

      // Get log level
      const logLevels: string[] = [
        ILogLevel.ERROR,
        ILogLevel.WARN,
        ILogLevel.INFO,
        ILogLevel.DEBUG,
        ILogLevel.VERBOSE,
        ILogLevel.SILLY,
      ];
      if (EnvironmentVariable.ZOWE_CHAT_LOG_LEVEL !== null && EnvironmentVariable.ZOWE_CHAT_LOG_LEVEL !== undefined) {
        if (logLevels.includes(EnvironmentVariable.ZOWE_CHAT_LOG_LEVEL)) {
          this.option.level = <ILogLevel>EnvironmentVariable.ZOWE_CHAT_LOG_LEVEL;
        }
      } else {
        if (logConfig.level !== null && logConfig.level !== undefined) {
          if (logLevels.includes(logConfig.level)) {
            this.option.level = logConfig.level;
          }
        }
      }

      // Get log max size
      if (EnvironmentVariable.ZOWE_CHAT_LOG_MAX_SIZE !== null && EnvironmentVariable.ZOWE_CHAT_LOG_MAX_SIZE !== undefined) {
        this.option.maximumSize = EnvironmentVariable.ZOWE_CHAT_LOG_MAX_SIZE;
      } else {
        if (logConfig.maximumSize !== null && logConfig.maximumSize !== undefined) {
          this.option.maximumSize = logConfig.maximumSize;
        }
      }

      // Get log max file
      if (EnvironmentVariable.ZOWE_CHAT_LOG_MAX_FILE !== null && EnvironmentVariable.ZOWE_CHAT_LOG_MAX_FILE !== undefined) {
        this.option.maximumFile = EnvironmentVariable.ZOWE_CHAT_LOG_MAX_FILE;
      } else {
        if (logConfig.maximumFile !== null && logConfig.maximumFile !== undefined) {
          this.option.maximumFile = logConfig.maximumFile;
        }
      }
      // Get console silent
      if (
        EnvironmentVariable.ZOWE_CHAT_LOG_CONSOLE_SILENT !== null &&
        EnvironmentVariable.ZOWE_CHAT_LOG_CONSOLE_SILENT !== undefined
      ) {
        this.option.consoleSilent = EnvironmentVariable.ZOWE_CHAT_LOG_CONSOLE_SILENT;
      } else {
        if (logConfig.consoleSilent !== null && logConfig.consoleSilent !== undefined) {
          this.option.consoleSilent = logConfig.consoleSilent;
        }
      }
      // end override

      // const {combine, timestamp, colorize, label, printf} = winston.format;
      const { combine, timestamp, printf } = winston.format;

      // Define customized format
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
      const chatLogFormat = printf(({ timestamp, level, message, label }: any) => {
        return `${timestamp} [${level.toUpperCase()}] ${message}`;
      });

      // TODO: fix file logging - not working
      // Create logger instance
      this.logger = winston.createLogger({
        level: this.option.level, // error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5
        handleExceptions: true,
        format: combine(timestamp(), chatLogFormat),
        exitOnError: true,
        //   format: winston.format.combine(winston.format.timestamp(), winston.format.colorize(), winston.format.simple()),
      });

      const fileTransport = new winston.transports.File({
        filename: path.resolve(this.option.filePath),
        maxsize: this.option.maximumSize, // 10 * 1024 * 1024,
        maxFiles: this.option.maximumFile,
        format: combine(timestamp(), chatLogFormat),
        options: { flags: 'a' },
      });

      this.logger.add(fileTransport);

      // Suppress console log output
      if (this.option.consoleSilent === false) {
        this.logger.add(new winston.transports.Console({ format: combine(timestamp(), chatLogFormat) }));
      }

      process.on('beforeExit', (code) => {
        console.info('Exiting Logger ...');
        this.logger.clear();
      });

      process.on('exit', (code) => {
        console.info('Logger exited!');
        this.logger.end();
      });
    } catch (error) {
      // ZWECC001E: Internal server error: {{error}}
      console.error(`ZWECC001E: Internal server error: Logger creation exception`);
      console.error(error.stack);
      process.exit(1);
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
    this.logger.silly(Util.maskSensitiveInfo(log));
  }

  public debug(log: string) {
    this.logger.debug(Util.maskSensitiveInfo(log));
  }

  public error(log: string) {
    this.logger.error(Util.maskSensitiveInfo(log));
  }

  public warn(log: string) {
    this.logger.warn(Util.maskSensitiveInfo(log));
  }

  public info(log: string) {
    this.logger.info(Util.maskSensitiveInfo(log));
  }
}

// Export single instance of Logger class
const logger = new Logger();
Object.freeze(logger);
export { logger };
