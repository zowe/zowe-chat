/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/


import { ChatBot } from "./bot/ChatBot";
import { AppConfigLoader } from "./config/AppConfigLoader";
import { Logger } from "./utils/Logger";

// App config must be loaded without error.
const config = AppConfigLoader.loadAppConfig();
// Logger must be initialized for future class initialization. Uses AppConfig.
const appLog = Logger.getInstance();

// Start chat bot. Requires AppConfig and Logger.
appLog.info("Initializing Zowe Chat Bot");
try {
    const chatBot = ChatBot.getInstance(config, appLog);
    chatBot.run();
} catch (error) {
    console.log("Error initalizing Zowe Chat");
    appLog.error("Error initalizing Zowe Chat");
    appLog.error(appLog.getErrorStack(error, error));
}

process.on('uncaughtException', (event) => {
    console.log("Uncaught exception encountered. Shutting down.");
    console.log(event.message);
    console.log(event.stack);
});
