/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import yargs from 'yargs';
import nodeUtil from 'util';

import {Logger, ChatMessageListener, IChatContextData, IChatToolType, IExecutor, IMessage, IMessageType} from '@zowe/chat';

import {ICommand} from '../types/index';
import ZosJobHandler from '../command/ZosJobHandler';
import * as i18nJsonData from '../i18n/jobDisplay.json';

const logger = Logger.getInstance();

class ZosJobMessageListener implements ChatMessageListener {
    private command: ICommand;

    constructor() {
        this.processMessage = this.processMessage.bind(this);
    }

    // Match inbound message
    matchMessage(chatContextData: IChatContextData): boolean {
        // Print start log
        logger.start(this.matchMessage, this);

        try {
            // print incoming message
            logger.debug(`Incoming message: ${JSON.stringify(chatContextData.payload, null, 4)}`);

            const message: string = <string>chatContextData.payload.data;
            const argv = yargs.parseSync(message);
            logger.debug(`Command argv is ${nodeUtil.inspect(argv, {compact: false, depth: 2})}`);

            const botOption = chatContextData.context.chatting.bot.getOption();
            this.command = {
                'scope': argv._[1] !== undefined ? String(argv._[1]): '',
                'resource': argv._[2] !== undefined ? String(argv._[2]): '',
                'verb': argv._[3] !== undefined ? String(argv._[3]): '',
                'object': argv._[4] !== undefined ? String(argv._[4]): '',
                'adjectives': {},
            };

            for (const key in argv) {
                if (key !== '_' && key !== '$0') {
                    this.command.adjectives[key] = String(argv[key]);
                }
            }

            // 1: Match bot name
            // 2. TODO: Check if it is a valid command.
            // 3: Match command scope and resource
            if (<string>argv._[0] === `@${botOption.chatTool.option.botUserName}`) {
                if (this.command.scope === 'zos' && this.command.resource === 'job') {
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
        let messages: IMessage[] = [];
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
            if (this.command.resource === 'job') {
                if (this.command.verb === 'list') {
                    if (this.command.object === 'job') {
                        const handler = new ZosJobHandler(botOption);
                        messages = await handler.getJob(this.command, executor);
                    } else {
                        messages= [{
                            type: IMessageType.PLAIN_TEXT,
                            message: i18nJsonData.error.unknownObject,
                        }];
                    }
                } else {
                    messages = [{
                        type: IMessageType.PLAIN_TEXT,
                        message: i18nJsonData.error.unknownVerb,
                    }];
                }
            } else {
                messages = [{
                    type: IMessageType.PLAIN_TEXT,
                    message: i18nJsonData.error.unknownResource,
                }];
            }

            return messages;
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

export = ZosJobMessageListener;
