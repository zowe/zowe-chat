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
import * as yaml from "js-yaml";
import { AppConfig } from "./base/AppConfig";

export class AppConfigLoader {

    private static appConfig: AppConfig;

    public static loadAppConfig(): AppConfig {

        if (AppConfigLoader.appConfig == null) {

            let cfgFilePath = process.env.ZOWE_CHAT_CONFIG_DIR;
            if (cfgFilePath === undefined) {
                cfgFilePath = "./application.yaml";
            } else {
                cfgFilePath = `${cfgFilePath}/application.yaml`;
            }

            // TODO: re-use readYaml from ChatBot.ts? 
            // the console.log is unique here though, we don't have logs configured until initial config load completes.
            if (!fs.existsSync(cfgFilePath)) {
                console.log(`TBD002E: Config file ${cfgFilePath} does not exist. Please create  or use the ZOWE_CHAT_CONFIG_DIR environment variable to specify the path.`);
                throw new Error(`TBD002E: Config file ${cfgFilePath} does not exist. Please create this or use the ZOWE_CHAT_CONFIG_DIR environment variable to specify the path.`);
            }

            try {
                AppConfigLoader.appConfig = yaml.load(fs.readFileSync(cfgFilePath).toString(), {}) as AppConfig;
            } catch (err) {
                console.log(`TBD003E: Error parsing the content for file ${cfgFilePath}. Please make sure the file is valid YAML.`);
                console.log(err)
                throw new Error(`TBD003E: Error parsing the content for file ${cfgFilePath}. Please make sure the file is valid YAML.`);
            }
        }

        return AppConfigLoader.appConfig

    }

}