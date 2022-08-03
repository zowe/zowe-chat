/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import {IChatContextData, IChatListenerRegistryEntry, IPayloadType, IEventListener, IEvent, IMessageType, IActionType} from '../types';

import _ = require('lodash');

import Config from '../common/Config';
import Logger from '../utils/Logger';
import Util from '../utils/Util';

const logger = Logger.getInstance();
const config = Config.getInstance();

class EventListener {
    private chatListeners: IChatListenerRegistryEntry[];
    constructor() {
        this.chatListeners = [];

        this.matchEvent = this.matchEvent.bind(this);
        this.processEvent = this.processEvent.bind(this);
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

    // Match inbound event
    matchEvent(chatContextData: IChatContextData): boolean {
        // Print start log
        logger.start(this.matchEvent, this);

        try {
            // Set extra data
            chatContextData.extraData = {
                listeners: <IChatListenerRegistryEntry[]>[],
                contexts: <IChatContextData[]>[],
            };

            // Check payload type
            logger.info(`Chat Context Data - payload: ${JSON.stringify(chatContextData.payload, null, 4)}`);
            if (chatContextData.payload.type === IPayloadType.EVENT) {
                // Find matched listeners
                const event: IEvent = <IEvent>chatContextData.payload.data;
                for (const listener of this.chatListeners) {
                    if (event.pluginId === listener.chatPlugin.package) {
                        const contextData: IChatContextData = _.cloneDeep(chatContextData);
                        if ((<IEventListener>listener.listenerInstance).matchEvent(contextData)) {
                            chatContextData.extraData.listeners.push(listener);
                            chatContextData.extraData.contexts.push(contextData);
                        }
                    }
                }
            } else {
                logger.error(`Wrong payload type: ${chatContextData.payload.type}`);
            }
            logger.info(`${chatContextData.extraData.listeners.length} of ${this.chatListeners.length} registered listeners can handle the event!`);
            logger.debug(`Matched listeners:\n${Util.dumpObject(chatContextData.extraData.listeners, 2)}`);

            // Set return result
            if (chatContextData.extraData.listeners.length > 0) {
                return true;
            } else {
                return false;
            }
        } catch (error) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(error.name), error));
        } finally {
            // Print end log
            logger.end(this.matchEvent, this);
        }
    }

    // Process matched event
    async processEvent(chatContextData: IChatContextData): Promise<void> {
        // Print start log
        logger.start(this.processEvent, this);

        try {
            // Match event
            const matched = this.matchEvent(chatContextData);

            // Process event
            if (matched) {
                // Get matched listener and contexts
                const matchedListeners: IChatListenerRegistryEntry[] = chatContextData.extraData.listeners;
                const listenerContexts: IChatContextData[] = chatContextData.extraData.contexts;

                // Get the number of plugin limit
                let pluginLimit = config.getConfig().chatServer.pluginLimit;
                logger.info(`pluginLimit: ${pluginLimit}`);
                if (pluginLimit < 0 || pluginLimit > matchedListeners.length) {
                    pluginLimit = matchedListeners.length;
                }
                logger.info(`${pluginLimit} of ${matchedListeners.length} matched listeners will response to the matched event!`);

                // Process matched event
                const event: IEvent = <IEvent>chatContextData.payload.data;
                for (let i = 0; i < pluginLimit; i++) {
                    // Handle event
                    const msgs = await (<IEventListener>matchedListeners[i].listenerInstance).processEvent(listenerContexts[i]);
                    logger.debug(`Message sent to channel: ${JSON.stringify(msgs, null, 2)}`);

                    // Return message only when open a dialog
                    if (event.action.type === IActionType.DIALOG_OPEN) {
                        if (msgs[0].type === IMessageType.MATTERMOST_DIALOG_OPEN || msgs[0].type === IMessageType.SLACK_VIEW_OPEN) {
                            // Send response
                            await chatContextData.context.chatting.bot.send(listenerContexts[i], msgs);
                        } else if (msgs[0].type === IMessageType.MSTEAMS_DIALOG_OPEN) {
                            return msgs[0].message;
                        } else {
                            logger.error(`Wrong message type: ${msgs[0].type}`);
                        }
                    } else {
                        // Send response
                        await chatContextData.context.chatting.bot.send(listenerContexts[i], msgs);
                    }
                }
            }
        } catch (error) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(error.name), error));
        } finally {
            // Print end log
            logger.end(this.processEvent, this);
        }
    }
}

export = EventListener;
