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
/* TODO: Resolve these in broader merge operation
export import Config = require('./common/Config');
export import ChatEventListener = require('./listeners/ChatEventListener');
export import ChatMessageListener = require('./listeners/ChatMessageListener');
export import ChatView = require('./views/ChatView');
export import ChatMattermostView = require('./views/ChatMattermostView');
export import ChatSlackView = require('./views/ChatSlackView');
export import ChatMsteamsView = require('./views/ChatMsteamsView');
*/
// App config must be loaded without error.
AppConfigLoader.loadAppConfig()
// Logger must be initialized for future class initialization. Uses AppConfig.
const appLog = Logger.getInstance()
// Start chat bot. Requires AppConfig and Logger.
appLog.info("Initializing Zowe Chat Bot")
const chatBot = ChatBot.getInstance()
chatBot.run();

