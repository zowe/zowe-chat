import { Logger } from "../utils/Logger";

/**
 * This class maintains a global list of environment variables used within Zowe Chat, to simplify tracking and re-use of the
 * populated values. Environment variables may optionally define a default within this list, or define it in calling code which 
 * checks whether the environment variable is set. Default values SHOULD NOT be described both here and in calling code.
 */
export class EnvVars {

    private static log: Logger = Logger.getInstance()

    /** The directory with Zowe Chat's plugin configuration file and any plugin installations */
    public static ZOWE_CHAT_PLUGINS_DIR: string = EnvVars.getEnvStr('ZOWE_CHAT_PLUGINS_DIR', `${process.cwd()}/plugins`);
    /** The directory with Zowe Chat's core configuration - application.yaml and chat client YAML files */
    public static ZOWE_CHAT_CONFIG_DIR: string = EnvVars.getEnvStr('ZOWE_CHAT_CONFIG_DIR', `${process.cwd()}/config`);
    /** Determines if Zowe Chat should deploy it's static web elements, i.e. WebUI. True by default. */
    public static ZOWE_CHAT_DEPLOY_UI: boolean = EnvVars.getEnvBool('ZOWE_CHAT_DEPLOY_UI', true)
    /** Where the react UI static elements are located. */
    public static ZOWE_CHAT_STATIC_DIR: string = EnvVars.getEnvStr('ZOWE_CHAT_WEB_DIR', `${process.cwd()}/static`)
    /** Log file path */
    public static ZOWE_CHAT_LOG_FILE_PATH: string = EnvVars.getEnvStr('ZOWE_CHAT_LOG_FILE_PATH', `./log/zoweChatServer.log`)
    /** Chat log level, which overrides value present in application.yaml */
    public static ZOWE_CHAT_LOG_LEVEL: string = EnvVars.getEnvStr('ZOWE_CHAT_LOG_LEVEL')
    /** Maximum log file size, which overrides any value present in application.yaml */
    public static ZOWE_CHAT_LOG_MAX_SIZE: string = EnvVars.getEnvStr('ZOWE_CHAT_LOG_MAX_SIZE')
    /** Maximum log file count, which overrides any value present in application.yaml */
    public static ZOWE_CHAT_LOG_MAX_FILES: number = EnvVars.getEnvNumber('ZOWE_CHAT_LOG_MAX_FILES')


    /**
     * Checks process arguments and environment variables for the matching envVar, returns values in that order of precedence.
     * 
     * @param envVar the environment variable identifier
     * @param defaultValue optional default value if the environment variable is missing
     * @returns the env value, or the default supplied by caller, or undefined. If the value cannot be converted to a number, returns undefined.
     */
    private static getEnvNumber(envVar: string, defaultValue: number = undefined): number {
        if (process.argv != null && process.argv.includes(envVar)) {
            const argIndex = process.argv.indexOf(envVar);
            if (!process.argv[argIndex + 1] != null) {
                EnvVars.log.debug(`Using command line ${envVar}=${process.argv[argIndex + 1]}`);
                return +process.argv[argIndex + 1];
            }
            EnvVars.log.debug(`Found command line ${envVar} but no value was supplied as the next arg. Ignoring.`);
            return defaultValue;
        }
        else if (process.env[envVar] != null) {
            EnvVars.log.debug(`Using env ${envVar}=${process.env[envVar]}`);
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
    private static getEnvBool(envVar: string, defaultValue: boolean = false): boolean {
        if (process.argv != null && process.argv.includes(envVar)) {
            EnvVars.log.debug("Using command line " + envVar + "=true");
            return true;
        }
        if (process.env[envVar] != null) {
            const envValue = process.env[envVar].toLowerCase();
            if (envValue === "true" ||
                envValue === "1" ||
                envValue === "yes") {
                EnvVars.log.debug("Using env " + envVar + "=true");
                return true;
            }
            EnvVars.log.debug("Using env " + envVar + "=false");
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
    private static getEnvStr(envVar: string, defaultValue: string = undefined): string {
        if (process.argv != null && process.argv.includes(envVar)) {
            const argIndex = process.argv.indexOf(envVar);
            if (!process.argv[argIndex + 1] != null) {
                EnvVars.log.debug(`Using command line ${envVar}=${process.argv[argIndex + 1]}`);
                return process.argv[argIndex + 1];
            }
            EnvVars.log.debug(`Found command line ${envVar} but no value was supplied as the next arg. Ignoring.`);
            return defaultValue;
        }
        else if (process.env[envVar] != null) {
            EnvVars.log.debug(`Using env ${envVar}=${process.env[envVar]}`);
            return process.env[envVar];
        }
        return defaultValue;
    }
}