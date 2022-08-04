
import * as fs from "fs-extra";
import { Logger } from "../utils/Logger";
import { AppConfig } from "./base/AppConfig";
import { IChatConfigSchema } from "./doc/IChatConfigSchema";
import { IConfigBlockDefinition } from "./doc/IConfigBlockDefinition";

export class UserConfigManager {

    private readonly mConfigSchema: IChatConfigSchema;
    private readonly mConfigData: any
    private readonly mConfigFilePath: string
    private readonly mLog: Logger;

    constructor(appConfig: AppConfig, aggregateConfig: IChatConfigSchema, log: Logger) {
        this.mLog = log;
        this.mConfigSchema = aggregateConfig;
        let userConfigDir = appConfig.chatServer.extendedConfigDir
        if (userConfigDir === undefined) {
            userConfigDir = "./_config";
        }

        try {
            fs.ensureDirSync(userConfigDir);
            if (userConfigDir.endsWith("/")) {
                userConfigDir = userConfigDir.substring(0, userConfigDir.length - 1);
            }
            fs.ensureFileSync(`${userConfigDir}/user.yaml`);
            this.mConfigFilePath = `${userConfigDir}/user.yaml`;
        } catch (err) {
            this.mLog.error(`Error creating file within directory: ${userConfigDir}. Please ensure this directory exists and Zowe Chat can write to it.`);
            this.mLog.debug(`Error details: ${err}`);
            throw Error("Unable to initialize the runtime config manager. See Log for details.");
        }


        this.mConfigData = JSON.parse(fs.readFileSync(`${this.mConfigFilePath}`).toString());
        this.validateConfig()
    }


    public getConfigFromSchema(schemaBlock: IConfigBlockDefinition): any {
        return this.mConfigData[schemaBlock.key]
    }

    private writeConfigFile(): void {
        fs.writeFileSync(this.mConfigFilePath, JSON.stringify(this.mConfigData));
    }


    // TODO: move validation as a function of ConfigSchema??
    private validateConfig(): void {
        for (let block of this.mConfigSchema.sections) {
            this.validateProperties(block.properties, [block.key]);
        }
    }

    // TODO: better type checking for properties
    private validateProperties(properties: any, accessPrefix: string[]): void {
        let context = this.mConfigData
        for (let prefix of accessPrefix) {
            context = context[`${prefix}`]
        }
        for (let property of Object.keys(properties)) {
            if (context[property] === undefined) {
                // check for sub-properties first
                if (properties[property].type === "object" && properties[property].properties !== undefined) {
                    context[property] = {}
                    this.validateProperties(properties[property].properties, accessPrefix.concat([property]));
                } else if (properties[property].default !== undefined) {
                    context[property] = properties[property].default;
                }
            }
        }
    }
}