/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

/**
 * This class maintains a global list of environment variables used within Zowe Chat, to simplify tracking and re-use of the
 * populated values. Environment variables may optionally define a default within this list, or define it in calling code which
 * checks whether the environment variable is set. Default values SHOULD NOT be described both here and in calling code.
 */
export class EnvironmentVariable {
  // <Optional> The directory where Zowe Chat server is installed
  //     Priority: process argument > environment variable > default value
  //     Note: default value can't set to process.cwd() due to the process can be started from any folder
  public static ZOWE_CHAT_HOME: string = EnvironmentVariable.getStringVariable('ZOWE_CHAT_HOME', `${__dirname}/..`);

  // <Optional> The directory where Zowe Chat server configuration is stored
  //     Priority: process argument > environment variable > default value
  public static ZOWE_CHAT_CONFIG_HOME: string = EnvironmentVariable.getStringVariable(
    'ZOWE_CHAT_CONFIG_HOME',
    `${EnvironmentVariable.ZOWE_CHAT_HOME}/config`,
  );

  // <Optional> The directory where Zowe Chat plugins are installed
  //     Priority: process argument > environment variable > default value
  public static ZOWE_CHAT_PLUGIN_HOME: string = EnvironmentVariable.getStringVariable(
    'ZOWE_CHAT_PLUGIN_HOME',
    `${EnvironmentVariable.ZOWE_CHAT_HOME}/plugin`,
  );

  // <Optional> The path to the Zowe Chat server log file:
  //     Priority: process argument > environment variable > configuration file > default value
  //     Default value set to null here or else no way to tell whether environment variable is set for it or not
  public static ZOWE_CHAT_LOG_FILE_PATH: string = EnvironmentVariable.getStringVariable('ZOWE_CHAT_LOG_FILE_PATH', null);

  // <Optional> The level of logging to be used, supported value: `error`,`info`, `warn`, `verbose`, `debug`, `silly`
  //     Priority: process argument > environment variable > configuration file > default value
  //     Default value set to null here or else no way to tell whether environment variable is set for it or not
  public static ZOWE_CHAT_LOG_LEVEL: string = EnvironmentVariable.getStringVariable('ZOWE_CHAT_LOG_LEVEL', null);

  // <Optional> The maximum size of the log file before it rotates
  //     Priority: process argument > environment variable > configuration file > default value
  //     Default value set to null here or else no way to tell whether environment variable is set for it or not
  public static ZOWE_CHAT_LOG_MAX_SIZE: number = EnvironmentVariable.getNumberVariable('ZOWE_CHAT_LOG_MAX_SIZE', null);

  // <Optional> The maximum number of log files to keep
  //     Priority: process argument > environment variable > configuration file > default value
  //     Default value set to null here or else no way to tell whether environment variable is set for it or not
  public static ZOWE_CHAT_LOG_MAX_FILE: number = EnvironmentVariable.getNumberVariable('ZOWE_CHAT_LOG_MAX_FILE', null);

  // <Optional> Console output is suppressed or not
  //     Priority: process argument > environment variable > configuration file > default value
  //     Default value set to null here or else no way to tell whether environment variable is set for it or not
  public static ZOWE_CHAT_LOG_CONSOLE_SILENT: boolean = EnvironmentVariable.getBoolVariable('ZOWE_CHAT_LOG_CONSOLE_SILENT', null);

  /**
   * Checks process arguments and environment variables for the matching envVar, returns values in that order of precedence.
   *
   * @param envVar the environment variable identifier
   * @param defaultValue optional default value if the environment variable is missing
   * @returns the env value, or the default supplied by caller, or undefined. If the value cannot be converted to a number, returns undefined.
   */
  private static getNumberVariable(envVar: string, defaultValue: number = undefined): number {
    if (process.argv != null && process.argv.includes(envVar)) {
      const argIndex = process.argv.indexOf(envVar);
      if (!process.argv[argIndex + 1] != null) {
        console.debug(`Using command line ${envVar}=${process.argv[argIndex + 1]}`);
        return +process.argv[argIndex + 1];
      }
      console.debug(`Found command line ${envVar} but no value was supplied as the next arg. Ignoring.`);
      return defaultValue;
    } else if (process.env[envVar] != null) {
      console.debug(`Using env ${envVar}=${process.env[envVar]}`);
      return +process.env[envVar];
    }
    return defaultValue;
  }

  /**
   * Checks process arguments and environment variables for the matching envVar, returns values in that order of precedence.
   *
   * @param envVar the environment variable identifier
   * @param defaultValue optional default value if the environment variable is missing
   * @returns the env value, or the default supplied by caller, or false. If the value cannot be coerced to a boolean, returns false.
   */
  private static getBoolVariable(envVar: string, defaultValue = false): boolean {
    if (process.argv != null && process.argv.includes(envVar)) {
      console.debug('Using command line ' + envVar + '=true');
      return true;
    }
    if (process.env[envVar] != null) {
      const envValue = process.env[envVar].toLowerCase();
      if (envValue === 'true' || envValue === '1' || envValue === 'yes') {
        console.debug('Using env ' + envVar + '=true');
        return true;
      }
      console.debug('Using env ' + envVar + '=false');
      return false;
    }
    return defaultValue;
  }

  /**
   * Checks process arguments and environment variables for the matching envVar, returns values in that order of precedence.
   *
   * @param envVar the environment variable identifier
   * @param defaultValue optional default value if the environment variable is missing
   * @returns the env value, or the default supplied by caller, or undefined.
   */
  private static getStringVariable(envVar: string, defaultValue: string = undefined): string {
    if (process.argv != null && process.argv.includes(envVar)) {
      const argIndex = process.argv.indexOf(envVar);
      if (!process.argv[argIndex + 1] != null) {
        console.debug(`Using command line ${envVar}=${process.argv[argIndex + 1]}`);
        return process.argv[argIndex + 1];
      }
      console.debug(`Found command line ${envVar} but no value was supplied as the next arg. Ignoring.`);
      return defaultValue;
    } else if (process.env[envVar] != null) {
      console.debug(`Using env ${envVar}=${process.env[envVar]}`);
      return process.env[envVar];
    }
    return defaultValue;
  }
}
