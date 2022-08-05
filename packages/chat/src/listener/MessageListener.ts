/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import { IChatListenerRegistryEntry, IMessageListener } from '../types';

import _ = require('lodash');

import { IChatContextData } from '@zowe/commonbot';
import { AppConfig } from '../config/base/AppConfig';
import { SecurityFacility } from '../security/SecurityFacility';
import { Logger } from '../utils/Logger';
import Util from '../utils/Util';

export class MessageListener {

    private chatListeners: IChatListenerRegistryEntry[];
    private log: Logger
    private config: AppConfig
    private securityFacility: SecurityFacility;

    constructor(config: AppConfig, securityFac: SecurityFacility, log: Logger) {
        this.chatListeners = [];
        this.config = config;
        this.log = log;
        this.securityFacility = securityFac;
        this.matchMessage = this.matchMessage.bind(this);
        this.processMessage = this.processMessage.bind(this);
    }

    // Register Zowe chat listener
    registerChatListener(listenerEntry: IChatListenerRegistryEntry): void {
        // Print start log
        this.log.start(this.registerChatListener, this);

        // Register listener
        this.log.info(`Listener: ${listenerEntry.listenerName}    Type: ${listenerEntry.listenerType}    `
            + `Plugin: ${listenerEntry.chatPlugin.package}    Version: ${listenerEntry.chatPlugin.version}    Priority: ${listenerEntry.chatPlugin.priority}`);
        this.chatListeners.push(listenerEntry);

        // Print end log
        this.log.end(this.registerChatListener, this);
    }

    // Get chat listener
    getChatListener(): IChatListenerRegistryEntry[] {
        return this.chatListeners;
    }

    // Match inbound message
    matchMessage(chatContextData: IChatContextData): boolean {
        // Print start log
        this.log.start(this.matchMessage, this);

        try {
            // Initialize extra data
            chatContextData.extraData = {
                listeners: <IChatListenerRegistryEntry[]>[],
                contexts: <IChatContextData[]>[],
            };

            // Match the bot name
            const botOption = chatContextData.context.chatting.bot.getOption();
            if ((<string>chatContextData.payload.data).indexOf(`@${botOption.chatTool.option.botUserName}`) === -1) {
                this.log.info(`The message is not for @${botOption.chatTool.option.botUserName}!`);
            } else {
                // Find matched listeners
                for (const listener of this.chatListeners) {
                    const contextData: IChatContextData = _.cloneDeep(chatContextData);
                    if ((<IMessageListener>listener.listenerInstance).matchMessage(contextData)) {
                        chatContextData.extraData.listeners.push(listener);
                        chatContextData.extraData.contexts.push(contextData);
                    }
                }
                this.log.info(`${chatContextData.extraData.listeners.length} of ${this.chatListeners.length} registered listeners can handle the message!`);
                this.log.debug(`Matched listeners:\n${Util.dumpObject(chatContextData.extraData.listeners, 2)}`);
            }

            // Set return result
            if (chatContextData.extraData.listeners.length > 0) {
                return true;
            } else {
                return false;
            }
        } catch (error) {
            // Print exception stack
            //this.log.error(this.log.getErrorStack(new Error(error.name), error));
            this.log.error(error)
        } finally {
            // Print end log
            this.log.end(this.matchMessage, this);
        }
    }

    // Process matched message
    async processMessage(chatContextData: IChatContextData): Promise<void> {
        // Print start log
        this.log.start(this.processMessage, this);

        this.securityFacility.isAuthenticated(chatContextData)


        try {
            // Get matched listener and contexts
            const matchedListeners: IChatListenerRegistryEntry[] = chatContextData.extraData.listeners;
            const listenerContexts: IChatContextData[] = chatContextData.extraData.contexts;

            // Get the number of plugin limit
            let pluginLimit = this.config.chatServer.pluginLimit;
            this.log.info(`pluginLimit: ${pluginLimit}`);
            if (pluginLimit < 0 || pluginLimit > matchedListeners.length) {
                pluginLimit = matchedListeners.length;
            }
            this.log.info(`${pluginLimit} of ${matchedListeners.length} matched listeners will response to the matched message!`);

            // Process matched messages
            for (let i = 0; i < pluginLimit; i++) {
                // Process message
                const msgs = await (<IMessageListener>matchedListeners[i].listenerInstance).processMessage(listenerContexts[i]);
                this.log.debug(`Message sent to channel: ${JSON.stringify(msgs, null, 2)}`);

                // Send response
                await chatContextData.context.chatting.bot.send(listenerContexts[i], msgs);
            }
        } catch (error) {
            // Print exception stack
            // this.log.error(this.log.getErrorStack(new Error(error.name), error));
            this.log.error(error)
        } finally {
            // Print end log
            this.log.end(this.processMessage, this);
        }
    }

}