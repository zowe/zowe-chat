/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import CommonBot = require('./CommonBot');
import ChatContext = require('./ChatContext');
// import logger = require('./utils/Logger');
import Listener = require('./Listener');

// import {Chatbot} from './Chatbot';
// exports.Chatbot = ;

export = {
    CommonBot,
    ChatContext,
    // logger,
    Listener,
};

// export * from './Chatbot';
// export * from './ChatContext';
// export * from './utils/Logger';
// export * from './adapters/Listener';
// export * from './adapters/msteams/MsteamsListener';
// import ChatContext = require('./ChatContext');
// // import logger = require('./utils/Logger');
// import Listener = require('./adapters/Listener');
// import MsteamsListener = require('./adapters/msteams/MsteamsListener');

// export = {
//     Chatbot,
//     ChatContext,
//     // logger,
//     Listener,
//     MsteamsListener,
// };

// const User = require('./src/user')
// const Brain = require('./src/brain')
// const Robot = require('./src/robot')
// const Adapter = require('./src/adapter')
// const Response = require('./src/response')
// const Listener = require('./src/listener')
// const Message = require('./src/message')
// const DataStore = require('./src/datastore')

// module.exports = {
//   User,
//   Brain,
//   Robot,
//   Adapter: Adapter,
//   Response,
//   Listener: Listener.Listener,
//   TextListener: Listener.TextListener,
//   Message: Message.Message,
//   TextMessage: Message.TextMessage,
//   EnterMessage: Message.EnterMessage,
//   LeaveMessage: Message.LeaveMessage,
//   TopicMessage: Message.TopicMessage,
//   CatchAllMessage: Message.CatchAllMessage,
//   DataStore: DataStore.DataStore,
//   DataStoreUnavailable: DataStore.DataStoreUnavailable,

//   loadBot (adapterPath, adapterName, enableHttpd, botName, botAlias) {
//     return new module.exports.Robot(adapterPath, adapterName, enableHttpd, botName, botAlias)
//   }
// }
