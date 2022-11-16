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

import { IActionType, IChatContextData, IEvent, IMessageType, IPayloadType } from '@zowe/bot';
import { ChatWebApp } from '../bot/ChatWebApp';
import { SecurityManager } from '../security/SecurityManager';
import { config } from '../settings/Config';
import { logger } from '../utils/Logger';
import { Util } from '../utils/Util';
import { BotListener } from './BotListener';

export class BotEventListener extends BotListener {
    private readonly chatListeners: IChatListenerRegistryEntry[];
    private readonly webapp: ChatWebApp;
    private readonly securityFacility: SecurityManager;

    constructor(security: SecurityManager, webapp: ChatWebApp) {
        super();
        this.chatListeners = [];
        this.securityFacility = security;
        this.webapp = webapp;
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
    }

    // Get chat listener
    getChatListener(): IChatListenerRegistryEntry[] {
        return this.chatListeners;
    }

    // Match inbound event
    async matchEvent(chatContextData: IChatContextData): Promise<boolean> {
        // Print start log
        logger.start(this.matchEvent, this);

        try {
            // Initialize listener and context pool
            const listeners: IChatListenerRegistryEntry[] = [];
            const contexts: IChatContextData[] = [];

            // Check payload type
            logger.info(`Chat Context Data - payload: ${JSON.stringify(chatContextData.payload, null, 4)}`);
            if (chatContextData.payload.type === IPayloadType.EVENT) {
                // Find matched listeners
                const event: IEvent = <IEvent>chatContextData.payload.data;
                for (const listener of this.chatListeners) {
                    if (event.pluginId === listener.chatPlugin.package) {
                        const contextData: IChatContextData = _.cloneDeep(chatContextData);
                        if (contextData.extraData === undefined || contextData.extraData === null) {
                            contextData.extraData = {
                                'chatPlugin': { 'package': listener.chatPlugin.package,
                                    'version': listener.chatPlugin.version,
                                    'priority': listener.chatPlugin.priority },
                            };
                        } else {
                            contextData.extraData.chatPlugin = { 'package': listener.chatPlugin.package,
                                'version': listener.chatPlugin.version,
                                'priority': listener.chatPlugin.priority };
                        }
                        if ((<IEventListener>listener.listenerInstance).matchEvent(contextData)) {
                            listeners.push(listener);
                            contexts.push(contextData);
                        }
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
            logger.info(`${chatContextData.extraData.listeners.length} of ${this.chatListeners.length} registered listeners can handle the event!`);
            logger.debug(`Matched listeners:\n${Util.dumpObject(chatContextData.extraData.listeners, 2)}`);

            // Set return result
            if (chatContextData.extraData.listeners.length > 0) {
                return true;
            } else {
                return false;
            }
        } catch (error) {
            // ZWECC001E: Internal server error: {{error}}
            logger.error(Util.getErrorMessage('ZWECC001E', { error: 'Bot event match exception', ns: 'ChatMessage' }));
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
        const user = chatContextData.context.chatting.user;

        try {
            // Match event
            const matched = this.matchEvent(chatContextData);

            // Process event
            if (matched) {
                const principal = this.securityFacility.getPrincipal(this.securityFacility.getChatUser(user));
                if (principal == undefined) {
                    const redirect = this.webapp.generateChallenge(user, () => {
                        this.processEvent(chatContextData);
                    });
                    await chatContextData.context.chatting.bot.send(chatContextData.extraData.contexts[0], [{
                        message: `Hello @${user.name}, your login expired. Please visit ${redirect} to login again,`,
                        type: IMessageType.PLAIN_TEXT,
                    }]);
                    logger.end(this.processEvent, this);
                    return;
                }

                // Get matched listener and contexts
                const matchedListeners: IChatListenerRegistryEntry[] = chatContextData.extraData.listeners;
                const listenerContexts: IChatContextData[] = chatContextData.extraData.contexts;

                // Get the number of plugin limit
                let pluginLimit = config.getChatServerConfig().limit.plugin;
                logger.info(`pluginLimit: ${pluginLimit}`);
                if (pluginLimit < 0 || pluginLimit > matchedListeners.length) {
                    pluginLimit = matchedListeners.length;
                }
                logger.info(`${pluginLimit} of ${matchedListeners.length} matched listeners will response to the matched event!`);

                // Process matched event
                const event: IEvent = <IEvent>chatContextData.payload.data;
                for (let i = 0; i < pluginLimit; i++) {
                    // Handle event
                    listenerContexts[i].extraData.principal = principal;
                    listenerContexts[i].extraData.zosmf = config.getZosmfServerConfig();
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
            // ZWECC001E: Internal server error: {{error}}
            logger.error(Util.getErrorMessage('ZWECC001E', { error: 'Bot event process exception', ns: 'ChatMessage' }));
            logger.error(logger.getErrorStack(new Error(error.name), error));
        } finally {
            // Print end log
            logger.end(this.processEvent, this);
        }
    }
}
