/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import { ChatEventListener, ICommand, IExecutor, Logger } from '@zowe/chat';
import { IActionType, IChatContextData, IChatToolType, IEvent, IMessage, IMessageType } from '@zowe/commonbot';

import ZosCommandDispatcher from '../commands/ZosCommandDispatcher';
const i18nJsonData = require('../i18n/jobDisplay.json');

const logger = Logger.getInstance();

class ZosEventListener extends ChatEventListener {
    private command: ICommand = null;
    constructor() {
        super();

        this.processEvent = this.processEvent.bind(this);
    }

    // Match inbound event
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    matchEvent(chatContextData: IChatContextData): boolean {
        // Print start log
        logger.start(this.matchEvent, this);

        // Match event
        try {
            const botOption = chatContextData.context.chatting.bot.getOption();
            let eventMessage = '';
            let botName: string;
            if (botOption.chatTool === IChatToolType.MATTERMOST) {
                eventMessage = this.getMattermostEvent(chatContextData);
                botName = botOption.mattermost.botUserName
            } else if (botOption.chatTool === IChatToolType.SLACK) {
                eventMessage = this.getSlackEvent(chatContextData);
                botName = botOption.slack.botUserName
            } else if (botOption.chatTool === IChatToolType.MSTEAMS) {
                eventMessage = this.getMsteamsEvent(chatContextData);
                botName = botOption.msteams.botUserName
            } else {
                return false;
            }

            this.command = this.parseCommand(eventMessage);
            this.command.extraData.chatPlugin = chatContextData.extraData.chatPlugin;
            logger.debug(`Command is ${JSON.stringify(this.command)}`);

            // 1: Match bot name.
            // 2. TODO: Check if it is a valid command.
            // 3: Match command scope.
            if (this.command.extraData.botUserName === botName) {
                if (this.command.scope === 'zos') {
                    this.command.extraData.chatPlugin = chatContextData.extraData.chatPlugin;

                    logger.debug('Message matched!');
                    return true;
                }
            }
        } catch (error) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(error.name), error));
            return false;
        } finally {
            // Print end log
            logger.end(this.matchEvent, this);
        }
    }

    // Get inbound Mattermost event.
    private getMattermostEvent(chatContextData: IChatContextData): string {
        // Print start log
        logger.start(this.getMattermostEvent, this);
        let eventMessage: string = '';
        try {
            logger.debug(`payload: ${JSON.stringify(chatContextData.payload, null, 4)}`);
            logger.debug(`chat tool payload: ${JSON.stringify(chatContextData.context.chatTool.payload, null, 4)}`);
            const event: IEvent = <IEvent>chatContextData.payload.data;
            if (event.action.type === IActionType.DROPDOWN_SELECT) {
                eventMessage = chatContextData.context.chatTool.body.context.selected_option;
            } else {
                // Possible event action type are IActionType.DIALOG_OPEN, IActionType.DIALOG_SUBMIT, IActionType.BUTTON_CLICK,
                // or unsupported event action type.
                logger.info(`Unsupported event: ${event.action.type}`);
                logger.info(`${JSON.stringify(chatContextData.payload, null, 4)}`);
            }
            return eventMessage;
        } catch (error) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(error.name), error));
            return '';
        } finally {
            // Print end log
            logger.end(this.getMattermostEvent, this);
        }
    }

    // Get inbound Slack event.
    private getSlackEvent(chatContextData: IChatContextData): string {
        // Print start log
        logger.start(this.getSlackEvent, this);

        let eventMessage: string = '';
        try {
            logger.debug(`payload: ${JSON.stringify(chatContextData.payload, null, 4)}`);
            logger.debug(`chat tool payload: ${JSON.stringify(chatContextData.context.chatTool.payload, null, 4)}`);
            const event: IEvent = <IEvent>chatContextData.payload.data;
            if (event.action.type === IActionType.DROPDOWN_SELECT) {
                eventMessage = chatContextData.context.chatTool.payload.selected_option.value;
            } else {
                // Possible event action type are IActionType.DIALOG_OPEN, IActionType.DIALOG_SUBMIT, IActionType.BUTTON_CLICK,
                // or unsupported event action type.
                logger.info(`Unsupported event: ${event.action.type}`);
                logger.info(`${JSON.stringify(chatContextData.payload, null, 4)}`);
            }
            return eventMessage;
        } catch (error) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(error.name), error));

            return '';
        } finally {
            // Print end log
            logger.end(this.getSlackEvent, this);
        }
    }

    // Get inbound Msteams event.
    private getMsteamsEvent(chatContextData: IChatContextData): string {
        // Print start log
        logger.start(this.getMsteamsEvent, this);

        let eventMessage: string = '';
        try {
            logger.debug(`payload: ${JSON.stringify(chatContextData.payload, null, 4)}`);
            logger.debug(`chatTool: ${JSON.stringify(chatContextData.context.chatTool, null, 4)}`);

            const event: IEvent = <IEvent>chatContextData.payload.data;
            if (event.action.type === IActionType.DROPDOWN_SELECT) {
                const actionId = chatContextData.context.chatTool.context.activity.value.action.id;
                eventMessage = chatContextData.context.chatTool.context.activity.value[actionId];
            } else {
                // Possible event action type are IActionType.DIALOG_OPEN, IActionType.DIALOG_SUBMIT, IActionType.BUTTON_CLICK,
                // or unsupported event action type.
                logger.info(`Unsupported event: ${event.action.type}`);
                logger.info(`${JSON.stringify(chatContextData.payload, null, 4)}`);
            }

            return eventMessage;
        } catch (error) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(error.name), error));

            return '';
        } finally {
            // Print end log
            logger.end(this.getMsteamsEvent, this);
        }
    }

    // Process inbound event
    async processEvent(chatContextData: IChatContextData): Promise<IMessage[]> {
        // Print start log
        logger.start(this.processEvent, this);

        // Process event
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
            if (botOption.chatTool !== IChatToolType.MATTERMOST
                && botOption.chatTool !== IChatToolType.SLACK
                && botOption.chatTool !== IChatToolType.MSTEAMS) {
                return [{
                    type: IMessageType.PLAIN_TEXT,
                    message: `${i18nJsonData.error.unsupportedChatTool}${botOption.chatTool}`,
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
            logger.end(this.processEvent, this);
        }
    }

    // Parse command from interactive component event.
    parseCommand(commandText: string): ICommand {
        const command: ICommand = {
            scope: '',
            resource: '',
            verb: '',
            object: '',
            adjective: {
                'arguments': [],
                'option': {},
            },
            extraData: {
                botUserName: '',
                chatPlugin: {},
            },
        };

        if (commandText !== undefined && commandText !== null && commandText.trim() !== '') {
            const commandArray = commandText.trim().split(':');

            command.scope = commandArray.length >= 2 ? commandArray[1] : '';
            command.resource = commandArray.length >= 3 ? commandArray[2] : '';
            command.verb = commandArray.length >= 4 ? commandArray[3] : '';
            command.object = commandArray.length >= 5 ? commandArray[4] : '';

            // Process adjective
            if (commandArray.length >= 6) {
                const adjectiveArray = commandArray.slice(5);
                for (const obj of adjectiveArray) {
                    if (obj.trim().length === 0) {
                        continue;
                    } else if (obj.includes('=')) { // option
                        const options = obj.split('|');
                        for (const option of options) {
                            const words = option.split('=');
                            command.adjective.option[words[0]] = words[1];
                        }
                    } else { // argument
                        command.adjective.arguments.push(obj);
                    }
                }
            }

            // Set extra data
            command.extraData.botUserName = commandArray[0].substring(1);
        }

        return command;
    }
}


export = ZosEventListener;
