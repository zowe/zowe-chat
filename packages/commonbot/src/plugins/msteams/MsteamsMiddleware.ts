/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import type { Request, Response } from 'express';
import { IChatContextData, IChatTool, IMessage, IMessageType, IMsteamsOption } from '../../types';

import { Activity, Attachment, BotFrameworkAdapter, CardFactory, ConversationAccount, ConversationParameters, Entity, MessageFactory, TurnContext } from 'botbuilder';
import { CommonBot } from '../../CommonBot';
import Middleware = require('../../Middleware');
import BotActivityHandler = require('./BotActivityHandler');
import Util = require('../../utils/Util');

class MsteamsMiddleware extends Middleware {
    private botFrameworkAdapter: BotFrameworkAdapter;
    private botActivityHandler: BotActivityHandler;

    // Constructor
    constructor(bot: CommonBot) {
        super(bot);

        // Bind this pointer
        this.processTurnError = this.processTurnError.bind(this);
        this.run = this.run.bind(this);
        this.send = this.send.bind(this);

        // Get option
        const option = this.bot.getOption();
        if (option.chatTool !== IChatTool.MSTEAMS) {
            this.logger.error(`Wrong chat tool type set in bot option: ${option.chatTool}`);
            throw new Error(`Wrong chat tool type`);
        }

        // Create adapter
        const msteamsOption: IMsteamsOption = option.msteams;
        this.botFrameworkAdapter = new BotFrameworkAdapter({
            appId: msteamsOption.botId,
            appPassword: msteamsOption.botPassword,
        });
        this.botFrameworkAdapter.onTurnError = this.processTurnError;

        this.botActivityHandler = new BotActivityHandler(this.bot, this);
    }

    // Process turn error
    async processTurnError(context: TurnContext, error: Error): Promise<void> {
        // Print start log
        this.logger.start(this.processTurnError, this);

        try {
            this.logger.error(`unhandled error: ${error}`);

            // Print exception stack
            this.logger.error(this.logger.getErrorStack(new Error(error.name), error));

            // Send a trace activity, which will be displayed in Bot Framework Emulator
            await context.sendTraceActivity('processTurnError Trace', `${error}`, 'https://www.botframework.com/schemas/error', 'TurnError');

            // Send a message to the user
            await context.sendActivity('The bot encountered an error or bug. To continue to run this bot, please fix the bot source code.');
        } catch (err) {
            // Print exception stack
            this.logger.error(this.logger.getErrorStack(new Error(err.name), err));
        } finally {
            // Print end log
            this.logger.end(this.processTurnError, this);
        }
    }

    // Run middleware
    async run(): Promise<void> {
        // Print start log
        this.logger.start(this.run, this);

        try {
            // Get bot option
            const option = this.bot.getOption();

            // Listen for incoming requests
            option.messagingApp.app.post(option.messagingApp.option.basePath, (req: Request, res: Response) => {
                this.botFrameworkAdapter.processActivity(req, res, async (context) => {
                    // Process bot activity
                    await this.botActivityHandler.run(context);
                });
            });
        } catch (err) {
            // Print exception stack
            this.logger.error(this.logger.getErrorStack(new Error(err.name), err));
        } finally {
            // Print end log
            this.logger.end(this.run, this);
        }
    }

    // Send message back to MS Teams channel
    async send(chatContextData: IChatContextData, messages: IMessage[]): Promise<void> {
        // Print start log
        this.logger.start(this.send, this);

        try {
            // Get chat context data
            this.logger.debug(`Chat context data sent to MS Teams: ${Util.dumpObject(chatContextData, 2)}`);

            // Get text and attachment part of the message to be sent
            let textMessage: string = '';
            const mentions: Record<string, any>[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
            const attachments: Attachment[] = [];
            for (const message of messages) {
                if (message.type === IMessageType.PLAIN_TEXT) {
                    textMessage = `${textMessage}\n${message.message}`;
                } else if (message.type === IMessageType.MSTEAMS_ADAPTIVE_CARD) {
                    attachments.push(CardFactory.adaptiveCard(message.message));
                } else {
                    this.logger.error(`Unsupported type "${message.type}" for the message: ${JSON.stringify(message, null, 2)}`);
                    textMessage = `${textMessage}\n${JSON.stringify(message.message)}`;
                }

                // Find channel ID by name or name by ID and merge all mentioned channels
                // Need to be enhance later to support sending all messages via single response or sending all message one by one via multiple messages
                if (message.mentions !== undefined && message.mentions.length > 0) {
                    for (const mention of message.mentions) {
                        if (mention.mentioned.id.trim() === '' && mention.mentioned.name.trim() !== '') {
                            const channelInfo = this.botActivityHandler.findChannelByName(mention.mentioned.name);
                            this.logger.debug(`Channel info for mention ${mention.mentioned.name}: ${JSON.stringify(channelInfo, null, 2)}`);
                            if (channelInfo !== null) {
                                mention.mentioned.id = channelInfo.id;
                            }
                        } else {
                            const channelInfo = this.botActivityHandler.findChannelById(mention.mentioned.id);
                            this.logger.debug(`Channel info for mention ${mention.mentioned.name}: ${JSON.stringify(channelInfo, null, 2)}`);
                            if (channelInfo !== null) {
                                mention.mentioned.name = channelInfo.name;
                            }
                        }

                        // if both id and name are found then push to the mentions
                        if (mention.mentioned.id !== '' && mention.mentioned.name !== '') {
                            mentions.push(mention);
                        }
                    }

                    this.logger.debug(`message.mentions: ${JSON.stringify(message.mentions, null, 2)}`);
                }
            }

            this.logger.debug(`mentions: ${JSON.stringify(mentions, null, 2)}`);

            // Get activity
            let activity: string | Partial<Activity> = null;
            if (textMessage !== '' && attachments.length === 0) { // Pure text
                activity = MessageFactory.text(textMessage);
            } else if (textMessage === '' && attachments.length > 0) { // Adaptive card
                activity = { attachments: attachments };
            } else if (textMessage !== '' && attachments.length > 0) { // Pure text + adaptive card
                activity = { text: textMessage, attachments: attachments };
            } else {
                activity = '';
                this.logger.warn(`The message to be sent is empty!`);
            }
            this.logger.debug(`activity to be sent: ${JSON.stringify(activity, null, 2)}`);

            // Send message back to channel
            if (activity !== '') {
                if (chatContextData.context.chatTool !== null && chatContextData.context.chatTool !== undefined
                    && chatContextData.context.chatTool.context !== null
                    && chatContextData.context.chatTool.context !== undefined) { // Conversation message
                    this.logger.info('Send conversation message ...');

                    // Get conversation reference
                    const conversationReference = TurnContext.getConversationReference(chatContextData.context.chatTool.context.activity);
                    this.logger.debug(`conversationReference: ${JSON.stringify(conversationReference, null, 2)}`);

                    // Send message
                    await this.botFrameworkAdapter.continueConversation(conversationReference, async (turnContext) => {
                        await turnContext.sendActivity(activity);
                    });
                } else { // Proactive message
                    this.logger.info('Send proactive message ...');

                    // Check cached service URL
                    if (this.botActivityHandler.getServiceUrl().size === 0) {
                        this.logger.error(`The cached MS Teams service URL is empty! `
                            + `You must talk with your bot in your MS Teams client first to cache the service URL.`);
                        return;
                    }

                    // Find channel
                    let channelInfo = null;
                    if (chatContextData.context.chatting.channel.id === '' && chatContextData.context.chatting.channel.name !== '') {
                        channelInfo = this.botActivityHandler.findChannelByName(chatContextData.context.chatting.channel.name);
                    } else {
                        channelInfo = this.botActivityHandler.findChannelById(chatContextData.context.chatting.channel.id);
                    }
                    this.logger.info(`Target channel info: ${JSON.stringify(channelInfo, null, 2)}`);
                    if (channelInfo == null) {
                        this.logger.error(`The specified MS Teams channel does not exist!\n${JSON.stringify(chatContextData.context.chatting.channel, null, 2)}`);
                        return;
                    }

                    // Get service URL
                    const serviceUrl = this.botActivityHandler.findServiceUrl(channelInfo.id);
                    this.logger.info(`Service URL: ${serviceUrl}`);
                    if (serviceUrl === '') {
                        this.logger.error(`MS Teams service URL does not exist for the channel ${JSON.stringify(channelInfo, null, 2)}`);
                        return;
                    }

                    // Create connector client
                    const connectorClient = this.botFrameworkAdapter.createConnectorClient(serviceUrl);

                    // Create conversation
                    // If use MessageFactory.list other commands to bind textMessage and attachments
                    // Send proactive message will fail, more details please look at below
                    //  Reference:
                    //    how to @someone in MS Teams: https://docs.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/channel-and-group-conversations?tabs=typescript
                    let firstActivity: Partial<Activity> = null;
                    if (textMessage !== '') {
                        firstActivity = MessageFactory.text(textMessage);
                        firstActivity.entities = <Entity[]>mentions;
                    } else if (attachments.length > 0) {
                        firstActivity = MessageFactory.attachment(attachments[0]);
                        firstActivity.entities = <Entity[]>mentions;
                    }
                    this.logger.debug(`firstActivity: ${JSON.stringify(firstActivity, null, 2)}`);
                    const conversationParameters = <ConversationParameters>{
                        isGroup: true,
                        channelData: {
                            channel: channelInfo,
                        },
                        activity: firstActivity,
                    };

                    // Send proactive message
                    // Note this function can't send multiple attachments
                    // Error message:
                    //  2021-04-29T13:07:06.805Z [ERROR] Error: Error
                    //  at MsteamsMiddleware.send (/opt/ibm/zchatops/node_modules/@zowe/commonbot/adapters/msteams/MsteamsMiddleware.js:136:47)
                    //  Error: Activity resulted into multiple skype activities
                    //  at new RestError (/opt/ibm/zchatops/node_modules/@azure/ms-rest-js/dist/msRest.node.js:1403:28)
                    //  at /opt/ibm/zchatops/node_modules/@azure/ms-rest-js/dist/msRest.node.js:2528:37
                    //  at processTicksAndRejections (internal/process/task_queues.js:97:5)
                    //  at async MsteamsMiddleware.send (/opt/ibm/zchatops/node_modules/@zowe/commonbot/adapters/msteams/MsteamsMiddleware.js:132:17)
                    //  at async ChatContext.send (/opt/ibm/zchatops/node_modules/@zowe/commonbot/ChatContext.js:17:13)
                    const conversationResourceResponse = await connectorClient.conversations.createConversation(conversationParameters);

                    // Create the rest not sended Activity
                    let restActivity: Partial<Activity> = null;
                    if (textMessage !== '' && attachments.length > 0) {
                        restActivity = { attachments: attachments };
                        restActivity.entities = <Entity[]>mentions;
                    } else if (textMessage === '' && attachments.length > 1) {
                        // Remove the first attachment since it's already been sended.
                        attachments.shift();
                        restActivity = { attachments: attachments };
                        restActivity.entities = <Entity[]>mentions;
                    }
                    this.logger.debug(`restActivity: ${JSON.stringify(restActivity, null, 2)}`);
                    // Create the conversationReference
                    const conversationReference = TurnContext.getConversationReference(firstActivity);
                    // Construct the conversationReference
                    conversationReference.conversation = <ConversationAccount>{
                        isGroup: true,
                        id: conversationResourceResponse.id,
                        conversationType: 'channel',
                    };
                    conversationReference.serviceUrl = serviceUrl;
                    // Send the rest activity
                    this.botFrameworkAdapter.continueConversation(conversationReference, async (turnContext) => {
                        await turnContext.sendActivity(restActivity);
                    });
                }
            }
        } catch (err) {
            // Print exception stack
            this.logger.error(this.logger.getErrorStack(new Error(err.name), err));
        } finally {
            // Print end log
            this.logger.end(this.send, this);
        }
    }
}

export = MsteamsMiddleware;
