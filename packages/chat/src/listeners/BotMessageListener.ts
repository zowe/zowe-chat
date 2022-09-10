/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import {IChatContextData, IChatListenerRegistryEntry, IMessageListener, IMessageType, IPayloadType} from '../types';

import _ = require('lodash');

import BotListener = require('./BotListener');
import Logger = require('../utils/Logger');
import Config = require('../common/Config');
import Util = require('../utils/Util');
import i18next from 'i18next';

const logger = Logger.getInstance();
const config = Config.getInstance();

class BotMessageListener extends BotListener {
    private chatListeners: IChatListenerRegistryEntry[];

    constructor() {
        super();

        this.chatListeners = [];

        this.matchMessage = this.matchMessage.bind(this);
        this.processMessage = this.processMessage.bind(this);
    }

    // Register Zowe chat listener
    registerChatListener(listenerEntry: IChatListenerRegistryEntry): void {
        // Print start log
        logger.start(this.registerChatListener, this);

        // Register listener
        logger.info(`Listener: ${listenerEntry.listenerName}    Type: ${listenerEntry.listenerType}    `
            + `Plugin: ${listenerEntry.chatPlugin.package}    Version: ${listenerEntry.chatPlugin.version}    Priority: ${listenerEntry.chatPlugin.priority}`);
        this.chatListeners.push(listenerEntry);

        // Print end log
        logger.end(this.registerChatListener, this);

        return;
    }

    // Get chat listener
    getChatListener(): IChatListenerRegistryEntry[] {
        return this.chatListeners;
    }

    // Match inbound message
    matchMessage(chatContextData: IChatContextData): boolean {
        // Print start log
        logger.start(this.matchMessage, this);

        try {
            // Initialize listener and context pool
            const listeners: IChatListenerRegistryEntry[] = [];
            const contexts: IChatContextData[] = [];

            // Match the bot name
            const botOption = chatContextData.context.chatting.bot.getOption();
            if ((<string>chatContextData.payload.data).indexOf(`@${botOption.chatTool.option.botUserName}`) === -1) {
                logger.info(`The message is not for @${botOption.chatTool.option.botUserName}!`);
                return false;
            } else {
                if (chatContextData.payload.type === IPayloadType.MESSAGE) {
                    // Find matched listeners
                    for (const listener of this.chatListeners) {
                        const contextData: IChatContextData = _.cloneDeep(chatContextData);
                        if (contextData.extraData === undefined || contextData.extraData === null) {
                            contextData.extraData = {
                                'chatPlugin': listener.chatPlugin,
                            };
                        } else {
                            contextData.extraData.chatPlugin = listener.chatPlugin;
                        }
                        if ((<IMessageListener>listener.listenerInstance).matchMessage(contextData)) {
                            listeners.push(listener);
                            contexts.push(contextData);
                        }
                    }
                } else {
                    logger.error(`Wrong payload type: ${chatContextData.payload.type}`);
                }

                // Set listener and context pool
                if (chatContextData.extraData === undefined || chatContextData.extraData === null) {
                    chatContextData.extraData = {
                        'listeners': listeners,
                        'contexts': contexts,
                    };
                } else {
                    chatContextData.extraData.listeners = listeners;
                    chatContextData.extraData.contexts = contexts;
                }
                logger.info(`${chatContextData.extraData.listeners.length} of ${this.chatListeners.length} registered listeners can handle the message!`);
                logger.debug(`Matched listeners:\n${Util.dumpObject(chatContextData.extraData.listeners, 2)}`);

                // Set return result
                if (listeners.length > 0) {
                    return true;
                } else {
                    // Send response
                    // await chatContextData.context.chatting.bot.send(listenerContexts[i], msgs);
                    chatContextData.context.chatting.bot.send(chatContextData, [{type: IMessageType.PLAIN_TEXT,
                        message: i18next.t('common.error.unknownQuestion', {ns: 'ChatMessage'})}]);
                    return false;
                }
            }
        } catch (error) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(error.name), error));
        } finally {
            // Print end log
            logger.end(this.matchMessage, this);
        }
    }

    // Process matched message
    async processMessage(chatContextData: IChatContextData): Promise<void> {
        // Print start log
        logger.start(this.processMessage, this);

        try {
            // Get matched listener and contexts
            const matchedListeners: IChatListenerRegistryEntry[] = chatContextData.extraData.listeners;
            const listenerContexts: IChatContextData[] = chatContextData.extraData.contexts;

            // Get the number of plugin limit
            let pluginLimit = config.getConfig().chatServer.pluginLimit;
            logger.info(`pluginLimit: ${pluginLimit}`);
            if (pluginLimit < 0 || pluginLimit > matchedListeners.length) {
                pluginLimit = matchedListeners.length;
            }
            logger.info(`${pluginLimit} of ${matchedListeners.length} matched listeners will response to the matched message!`);

            // Process matched messages
            for (let i = 0; i < pluginLimit; i++) {
                // Process message
                const msgs = await (<IMessageListener>matchedListeners[i].listenerInstance).processMessage(listenerContexts[i]);
                logger.debug(`Message sent to channel: ${JSON.stringify(msgs, null, 2)}`);

                // Send response
                await chatContextData.context.chatting.bot.send(listenerContexts[i], msgs);
            }
        } catch (error) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(error.name), error));
        } finally {
            // Print end log
            logger.end(this.processMessage, this);
        }
    }
}

export = BotMessageListener;
