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
import { AppConfig } from "./config/base/AppConfig";
import { Logger } from "./utils/Logger";

const appConfig: AppConfig = AppConfigLoader.loadAppConfig()
const appLog = new Logger(appConfig)
// TODO: Lifecycle / catch errors?

// Start chat bot
const chatBot = new ChatBot(appConfig, appLog)
chatBot.run();

