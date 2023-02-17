/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import { chatBot } from './bot/ChatBot';
// import { Logger } from "./utils/Logger";

// // Logger must be initialized for future class initialization. Uses AppConfig.
// const logger = Logger.getInstance();

// // Start chat bot. Requires AppConfig and Logger.
// logger.info("Initializing Zowe Chat Bot");

//
chatBot.run();
