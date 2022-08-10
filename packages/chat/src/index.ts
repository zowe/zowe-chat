/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import ChatBot = require('./bot/ChatBot');
import Logger = require('./utils/Logger');

/* eslint-disable @typescript-eslint/no-unused-vars, no-unused-vars */
export import Config = require('./common/Config');
export import ChatEventListener = require('./listeners/ChatEventListener');
export import ChatMessageListener = require('./listeners/ChatMessageListener');
export import ChatView = require('./views/ChatView');
export import ChatMattermostView = require('./views/ChatMattermostView');
export import ChatSlackView = require('./views/ChatSlackView');
export import ChatMsteamsView = require('./views/ChatMsteamsView');
/* eslint-enable @typescript-eslint/no-unused-vars, no-unused-vars */

// Start chat bot
const chatBot = ChatBot.getInstance();
chatBot.run();

export default Logger;
export * from './types';
