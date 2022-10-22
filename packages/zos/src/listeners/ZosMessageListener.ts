/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import { logger, Util } from '@zowe/chat';
import { ChatMessageListener, IChatContextData, IChatToolType, IExecutor, IMessage, IMessageType } from '@zowe/chat';

import ZosCommandDispatcher from '../commands/ZosCommandDispatcher';

const i18nJsonData = require('../i18n/jobDisplay.json');
class ZosMessageListener extends ChatMessageListener {
    constructor() {
        super();
        this.processMessage = this.processMessage.bind(this);
    }

    // Match inbound message
    matchMessage(chatContextData: IChatContextData): boolean {
        // Print start log
        logger.start(this.matchMessage, this);

        try {
            // Print incoming message
            logger.debug(`Chat Plugin: ${JSON.stringify(chatContextData.extraData.chatPlugin, null, 4)}`);
            logger.debug(`Incoming message: ${JSON.stringify(chatContextData.payload.data, null, 4)}`);

            // Parse message
            const command = super.parseMessage(chatContextData);
            command.extraData.chatPlugin = chatContextData.extraData.chatPlugin;
            command.extraData.zosmf = chatContextData.extraData.zosmf;
            command.extraData.principal = chatContextData.extraData.principal;

            // Match scope
            if (command.scope === 'zos') {
                chatContextData.extraData.command = command;
                return true;
            } else {
                // logger.info('Wrong command sent to Zowe CLI command plugin!');
                return false;
            }
        } catch (error) {
            // ZWECC001E: Internal server error: {{error}}
            logger.error(Util.getErrorMessage('ZWECC001E', { error: 'Zos message match exception', ns: 'ChatMessage' }));
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
                    message: `${i18nJsonData.error.unsupportedChatTool}${botOption.chatTool}`,
                }];
            }

            logger.debug(`Incoming command is ${JSON.stringify(chatContextData.extraData.command)}`);

            const dispatcher = new ZosCommandDispatcher(botOption, chatContextData.context.chatting.bot.getLimit());
            return await dispatcher.dispatch(chatContextData.extraData.command, executor);
        } catch (error) {
            // ZWECC001E: Internal server error: {{error}}
            logger.error(Util.getErrorMessage('ZWECC001E', { error: 'Zos message process exception', ns: 'ChatMessage' }));
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
