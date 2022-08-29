/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import {Logger, ChatMessageListener, IChatContextData, IChatToolType, IExecutor, IMessage, IMessageType, ICommand} from '@zowe/chat';

import ZosCommandDispatcher from '../commands/ZosCommandDispatcher';
import * as i18nJsonData from '../i18n/jobDisplay.json';

const logger = Logger.getInstance();

class ZosMessageListener extends ChatMessageListener {
    private command: ICommand;

    constructor() {
        super();

        this.processMessage = this.processMessage.bind(this);
    }

    // Match inbound message
    matchMessage(chatContextData: IChatContextData): boolean {
        // Print start log
        logger.start(this.matchMessage, this);

        try {
            // print incoming message
            logger.debug(`Incoming message: ${JSON.stringify(chatContextData.payload, null, 4)}`);

            const botOption = chatContextData.context.chatting.bot.getOption();
            this.command = super.parseMessage(chatContextData);

            // 1: Match bot name
            // 2. TODO: Check if it is a valid command.
            // 3: Match command scope and resource
            if (this.command.extraData.botUserName === botOption.chatTool.option.botUserName) {
                if (this.command.scope === 'zos') {
                    this.command.extraData.chatPlugin = chatContextData.extraData.chatPlugin;

                    logger.debug('Message matched!');
                    return true;
                }
            }

            return false;
        } catch (error) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(error.name), error));
            return false;
        } finally {
            // Print end log
            logger.end(this.matchMessage, this);
        }
    }

    // Process inbound message
    async processMessage(chatContextData: IChatContextData): Promise<IMessage[]> {
        // Print start log
        logger.start(this.processMessage, this);

        // Process message
        try {
            // Create executor
            const executor: IExecutor = {
                id: chatContextData.context.chatting.user.id,
                name: chatContextData.context.chatting.user.name,
                team: chatContextData.context.chatting.team,
                channel: chatContextData.context.chatting.channel,
                email: chatContextData.context.chatting.user.email,
                chattingType: chatContextData.context.chatting.type,
            };

            const botOption = chatContextData.context.chatting.bot.getOption();
            if (botOption.chatTool.type !== IChatToolType.MATTERMOST
                && botOption.chatTool.type !== IChatToolType.SLACK
                && botOption.chatTool.type !== IChatToolType.MSTEAMS) {
                return [{
                    type: IMessageType.PLAIN_TEXT,
                    message: `${i18nJsonData.error.unsupportedChatTool}${botOption.chatTool.type}`,
                }];
            }

            logger.debug(`Incoming command is ${JSON.stringify(this.command)}`);

            const dispatcher = new ZosCommandDispatcher(botOption, chatContextData.context.chatting.bot.getLimit());
            return await dispatcher.dispatch(this.command, executor);
        } catch (error) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(error.name), error));
            return [{
                type: IMessageType.PLAIN_TEXT,
                message: i18nJsonData.error.internal,
            }];
        } finally {
            // Print end log
            logger.end(this.processMessage, this);
        }
    }
}

export = ZosMessageListener;
