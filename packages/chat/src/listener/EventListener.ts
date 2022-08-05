/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import { IChatListenerRegistryEntry, IEventListener } from '../types';

import _ = require('lodash');

import { IActionType, IChatContextData, IEvent, IMessageType, IPayloadType } from '@zowe/commonbot';
import { AppConfig } from '../config/base/AppConfig';
import { Logger } from '../utils/Logger';
import Util from '../utils/Util';

class EventListener {
    private chatListeners: IChatListenerRegistryEntry[];
    private log: Logger;
    private config: AppConfig

    constructor(config: AppConfig, log: Logger) {
        this.chatListeners = [];
        this.log = log;
        this.config = config;
        this.matchEvent = this.matchEvent.bind(this);
        this.processEvent = this.processEvent.bind(this);
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

    // Match inbound event
    matchEvent(chatContextData: IChatContextData): boolean {
        // Print start log
        this.log.start(this.matchEvent, this);

        try {
            // Set extra data
            chatContextData.extraData = {
                listeners: <IChatListenerRegistryEntry[]>[],
                contexts: <IChatContextData[]>[],
            };

            // Check payload type
            this.log.info(`Chat Context Data - payload: ${JSON.stringify(chatContextData.payload, null, 4)}`);
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
                this.log.error(`Wrong payload type: ${chatContextData.payload.type}`);
            }
            this.log.info(`${chatContextData.extraData.listeners.length} of ${this.chatListeners.length} registered listeners can handle the event!`);
            this.log.debug(`Matched listeners:\n${Util.dumpObject(chatContextData.extraData.listeners, 2)}`);

            // Set return result
            if (chatContextData.extraData.listeners.length > 0) {
                return true;
            } else {
                return false;
            }
        } catch (error) {
            // Print exception stack
            //this.log.error(this.log.getErrorStack(new Error(error.name), error));
            this.log.error(error);
        } finally {
            // Print end log
            this.log.end(this.matchEvent, this);
        }
    }

    // Process matched event
    async processEvent(chatContextData: IChatContextData): Promise<void> {
        // Print start log
        this.log.start(this.processEvent, this);

        try {
            // Match event
            const matched = this.matchEvent(chatContextData);

            // Process event
            if (matched) {
                // Get matched listener and contexts
                const matchedListeners: IChatListenerRegistryEntry[] = chatContextData.extraData.listeners;
                const listenerContexts: IChatContextData[] = chatContextData.extraData.contexts;

                // Get the number of plugin limit
                let pluginLimit = this.config.app.pluginLimit;
                this.log.info(`pluginLimit: ${pluginLimit}`);
                if (pluginLimit < 0 || pluginLimit > matchedListeners.length) {
                    pluginLimit = matchedListeners.length;
                }
                this.log.info(`${pluginLimit} of ${matchedListeners.length} matched listeners will response to the matched event!`);

                // Process matched event
                const event: IEvent = <IEvent>chatContextData.payload.data;
                for (let i = 0; i < pluginLimit; i++) {
                    // Handle event
                    const msgs = await (<IEventListener>matchedListeners[i].listenerInstance).processEvent(listenerContexts[i]);
                    this.log.debug(`Message sent to channel: ${JSON.stringify(msgs, null, 2)}`);

                    // Return message only when open a dialog
                    if (event.action.type === IActionType.DIALOG_OPEN) {
                        if (msgs[0].type === IMessageType.MATTERMOST_DIALOG_OPEN || msgs[0].type === IMessageType.SLACK_VIEW_OPEN) {
                            // Send response
                            await chatContextData.context.chatting.bot.send(listenerContexts[i], msgs);
                        } else if (msgs[0].type === IMessageType.MSTEAMS_DIALOG_OPEN) {
                            return msgs[0].message;
                        } else {
                            this.log.error(`Wrong message type: ${msgs[0].type}`);
                        }
                    } else {
                        // Send response
                        await chatContextData.context.chatting.bot.send(listenerContexts[i], msgs);
                    }
                }
            }
        } catch (error) {
            // Print exception stack
            // this.log.error(this.log.getErrorStack(new Error(error.name), error));
            this.log.error(error)
        } finally {
            // Print end log
            this.log.end(this.processEvent, this);
        }
    }
}

export = EventListener;
