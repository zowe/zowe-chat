/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import {Logger, ChatEventListener, IActionType, IBotOption, IChatContextData, IChatToolType, IEvent, IExecutor, IMessage, IMessageType} from '@zowe/chat';

import {ICommand} from '../types/index';
import ZosJobHandler from '../command/ZosJobHandler';
import * as i18nJsonData from '../i18n/jobDisplay.json';

const logger = Logger.getInstance();

class ZosJobEventListener implements ChatEventListener {
    constructor() {
        this.processEvent = this.processEvent.bind(this);
        this.processMattermostEvent = this.processMattermostEvent.bind(this);
        this.processSlackEvent = this.processSlackEvent.bind(this);
        this.processMsteamsEvent = this.processMsteamsEvent.bind(this);
        this.processCommand = this.processCommand.bind(this);
    }

    // Match inbound event
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    matchEvent(chatContextData: IChatContextData): boolean {
        // Print start log
        logger.start(this.matchEvent, this);

        // Match event
        try {
            // Currently, only verify plugin id in Zowe Chat.
            logger.debug('matched!');
            return true;
        } catch (error) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(error.name), error));
            return false;
        } finally {
            // Print end log
            logger.end(this.matchEvent, this);
        }
    }

    // Process inbound event
    async processEvent(chatContextData: IChatContextData): Promise<IMessage[]> {
        // Print start log
        logger.start(this.processEvent, this);

        // Process event
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
            if (botOption.chatTool.type === IChatToolType.MATTERMOST) {
                messages = await this.processMattermostEvent(chatContextData, executor);
            } else if (botOption.chatTool.type === IChatToolType.SLACK) {
                messages = await this.processSlackEvent(chatContextData, executor);
            } else if (botOption.chatTool.type === IChatToolType.MSTEAMS) {
                messages = await this.processMsteamsEvent(chatContextData, executor);
            } else {
                messages.push({
                    type: IMessageType.PLAIN_TEXT,
                    message: `${i18nJsonData.error.unsupportedChatTool}${botOption.chatTool.type}`,
                });
            }

            return messages;
        } catch (error) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(error.name), error));
            return messages = [{
                type: IMessageType.PLAIN_TEXT,
                message: i18nJsonData.error.internal,
            }];
        } finally {
            // Print end log
            logger.end(this.processEvent, this);
        }
    }

    // Process inbound Mattermost event.
    private async processMattermostEvent(chatContextData: IChatContextData, executor: IExecutor): Promise<IMessage[]> {
        // Print start log
        logger.start(this.processMattermostEvent, this);

        let messages: IMessage[] = [];
        try {
            logger.debug(`payload: ${JSON.stringify(chatContextData.payload, null, 4)}`);
            logger.debug(`chatTool body: ${JSON.stringify(chatContextData.context.chatTool.body, null, 4)}`);

            const event: IEvent = <IEvent>chatContextData.payload.data;
            const botOption = chatContextData.context.chatting.bot.getOption();
            if (event.action.type === IActionType.DROPDOWN_SELECT) {
                const selectedValue: string = chatContextData.context.chatTool.body.context.selected_option;

                // Parse command
                const command: ICommand = this.parseCommand(selectedValue);
                logger.debug(`Command is ${JSON.stringify(command)}`);

                messages = await this.processCommand(command, executor, botOption);
            } else {
                // Possible event action type are IActionType.DIALOG_OPEN, IActionType.DIALOG_SUBMIT, IActionType.BUTTON_CLICK,
                // or unsupported event action type.
                logger.info(`Unsupported event: ${event.action.type}`);
                logger.info(`${JSON.stringify(chatContextData.payload, null, 4)}`);
            }

            return messages;
        } catch (error) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(error.name), error));

            return messages = [{
                type: IMessageType.PLAIN_TEXT,
                message: i18nJsonData.error.internal,
            }];
        } finally {
            // Print end log
            logger.end(this.processMattermostEvent, this);
        }
    }

    // Process inbound Slack event.
    private async processSlackEvent(chatContextData: IChatContextData, executor: IExecutor): Promise<IMessage[]> {
        // Print start log
        logger.start(this.processSlackEvent, this);

        let messages: IMessage[] = [];
        try {
            logger.debug(`payload: ${JSON.stringify(chatContextData.payload, null, 4)}`);
            logger.debug(`chat tool payload: ${JSON.stringify(chatContextData.context.chatTool.payload, null, 4)}`);
            const event: IEvent = <IEvent>chatContextData.payload.data;
            const botOption = chatContextData.context.chatting.bot.getOption();
            if (event.action.type === IActionType.DROPDOWN_SELECT) {
                const selectedValue: string = chatContextData.context.chatTool.payload.selected_option.value;

                // parse command
                const command: ICommand = this.parseCommand(selectedValue);
                logger.debug(`command is ${JSON.stringify(command)}`);

                messages = await this.processCommand(command, executor, botOption);
            } else {
                // Possible event action type are IActionType.DIALOG_OPEN, IActionType.DIALOG_SUBMIT, IActionType.BUTTON_CLICK,
                // or unsupported event action type.
                logger.info(`Unsupported event: ${event.action.type}`);
                logger.info(`${JSON.stringify(chatContextData.payload, null, 4)}`);
            }

            return messages;
        } catch (error) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(error.name), error));

            return messages = [{
                type: IMessageType.PLAIN_TEXT,
                message: i18nJsonData.error.internal,
            }];
        } finally {
            // Print end log
            logger.end(this.processSlackEvent, this);
        }
    }
    // Process inbound Msteams event.
    private async processMsteamsEvent(chatContextData: IChatContextData, executor: IExecutor): Promise<IMessage[]> {
        // Print start log
        logger.start(this.processMsteamsEvent, this);

        let messages: IMessage[] = [];
        try {
            logger.debug(`payload: ${JSON.stringify(chatContextData.payload, null, 4)}`);
            logger.debug(`chatTool: ${JSON.stringify(chatContextData.context.chatTool, null, 4)}`);

            const event: IEvent = <IEvent>chatContextData.payload.data;
            const botOption = chatContextData.context.chatting.bot.getOption();
            if (event.action.type === IActionType.DROPDOWN_SELECT) {
                const actionId = chatContextData.context.chatTool.context.activity.value.action.id;
                const selectedValue: string = chatContextData.context.chatTool.context.activity.value[actionId];

                // Parse command
                const command: ICommand = this.parseCommand(selectedValue);
                logger.debug(`command is ${JSON.stringify(command)}`);

                messages = await this.processCommand(command, executor, botOption);
            } else {
                // Possible event action type are IActionType.DIALOG_OPEN, IActionType.DIALOG_SUBMIT, IActionType.BUTTON_CLICK,
                // or unsupported event action type.
                logger.info(`Unsupported event: ${event.action.type}`);
                logger.info(`${JSON.stringify(chatContextData.payload, null, 4)}`);
            }

            return messages;
        } catch (error) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(error.name), error));

            return messages = [{
                type: IMessageType.PLAIN_TEXT,
                message: i18nJsonData.error.internal,
            }];
        } finally {
            // Print end log
            logger.end(this.processMsteamsEvent, this);
        }
    }

    // Process command and return command response.
    async processCommand(command: ICommand, executor: IExecutor, botOption: IBotOption): Promise<IMessage[]> {
        // Process event
        let messages: IMessage[] = [];
        try {
            if (command.resource === 'job') {
                if (command.verb === 'list') {
                    if (command.object === 'job') {
                        const handler = new ZosJobHandler(botOption);
                        messages = await handler.getJob(command, executor);
                    } else {
                        messages = [{
                            type: IMessageType.PLAIN_TEXT,
                            message: i18nJsonData.error.unknownObject,
                        }];
                    }
                    return messages;
                } else {
                    return messages = [{
                        type: IMessageType.PLAIN_TEXT,
                        message: i18nJsonData.error.unknownVerb,
                    }];
                }
            } else {
                return messages = [{
                    type: IMessageType.PLAIN_TEXT,
                    message: i18nJsonData.error.unknownObject,
                }];
            }
        } catch (error) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(error.name), error));

            return messages = [{
                type: IMessageType.PLAIN_TEXT,
                message: i18nJsonData.error.internal,
            }];
        } finally {
            // Print end log
            logger.end(this.processCommand, this);
        }
    }

    // Parse command from interactive component event.
    parseCommand(commandText: string): ICommand {
        const command: ICommand = {
            scope: '',
            resource: '',
            verb: '',
            object: '',
            adjectives: {},
        };

        if (commandText !== undefined && commandText !== null && commandText.trim() !== '') {
            const objects = commandText.trim().split(':');

            command.scope = objects.length >= 2 ? objects[1] : '';
            command.resource = objects.length >= 3 ? objects[2] : '';
            command.verb = objects.length >= 4 ? objects[3] : '';
            command.object = objects.length >= 5 ? objects[4] : '';

            // Process adjectives
            if (objects.length >= 6 && objects[5].trim().length > 0) {
                const adjectives = objects[5].split('|');
                for (const adjective of adjectives) {
                    const words = adjective.split('=');
                    command.adjectives[words[0]] = words[1];
                }
            }
        }

        return command;
    }
}


export = ZosJobEventListener;
