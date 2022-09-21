/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import type {ICommand, IExecutor} from '../../types/BnzCommonInterface';
import type {IIncident} from '../../types/BnzIncidentInterface';
import {IChatToolType, IMessage, IMessageType} from 'commonbot/types';

import BnzIncidentPostHandler = require('../commands/incident/post/BnzIncidentPostHandler');
import bnzConfig = require('../../common/BnzConfig');
import BnzUtil = require('../../utils/BnzUtil');
import CommonBot = require('commonbot/CommonBot');
import logger = require('../../utils/logger');
import ChatContext = require('commonbot/ChatContext');

class BnzPoster {
    private static instance: BnzPoster;
    private bot: CommonBot;

    // singleton
    private constructor() {
        if (BnzPoster.instance === undefined) {
            this.bot = null;
            this.postIncident = this.postIncident.bind(this);
            BnzPoster.instance = this;
        }

        return BnzPoster.instance;
    }

    // Initialize the instance
    initialize(bot: CommonBot): void {
        if (this.bot === null) {
            this.bot = bot;
        }
    }

    // Get the singleton instance
    static getInstance(): BnzPoster {
        if (BnzPoster.instance === undefined) {
            BnzPoster.instance = new BnzPoster();
        }

        return BnzPoster.instance;
    }

    // execute command  @bnz incident post incident --data {data} to post incident
    async postIncident(incident : IIncident): Promise<void> {
        logger.start(this.postIncident, this);

        if (this.bot === null) {
            logger.error(`BnzPoster haven't been initialized`);
            logger.error(`Failed to post incident: ${JSON.stringify(incident, null, 2)}`);
            return null;
        }

        try {
            // @bnz incident post incident --data {data}
            // data is the incident need to post to the specified channel
            const command: ICommand = {
                chatObject: `@${bnzConfig.getConfig().chatTool.botUserName}`,
                product: '',
                resource: 'incident',
                action: 'post',
                object: 'incident',
                arguments: <string[]>[],
                options: [{
                    name: 'data',
                    value: JSON.stringify(incident),
                }],
                additionalInfo: null,
            };

            const executor: IExecutor = {
                id: '',
                name: bnzConfig.getConfig().chatTool.botUserName,
                email: '',
                team: {
                    id: '',
                    name: '',
                },
                channel: {
                    id: '',
                    name: '',
                },
            };

            // Get the incident post handler to execute the post command and get the output
            const bnzIncidentPostHandler = new BnzIncidentPostHandler();
            const commandOutput: IMessage[] = await bnzIncidentPostHandler.executeCommand(command, executor);

            if (incident.chatToolPosted.channels !== undefined ) {
                // send message to all the channels that need to be posted.
                const channels = incident.chatToolPosted.channels;
                for (const channel of channels) {
                    // Currently Only check the channel name to post incident for chat tool
                    if (channel.name !== undefined && channel.name.trim() !== '') {
                        logger.debug(`The target channel is: ${JSON.stringify(channel.name)}`);

                        // get the chat tool
                        const chatToolType = bnzConfig.getConfig().bnzServer.chatTool.toLowerCase();
                        if (chatToolType === IChatToolType.MATTERMOST) {
                            // Calculate message length
                            let characterNumber = 0;
                            for (const msg of commandOutput) {
                                if (msg.type === IMessageType.PLAIN_TEXT) {
                                    characterNumber = characterNumber + msg.message.length;
                                } else if (msg.type === IMessageType.MATTERMOST_ATTACHMENT) {
                                    characterNumber = characterNumber + JSON.stringify(msg.message).length;
                                } else {
                                    logger.error(`Unsupported message type: ${JSON.stringify(msg, null, 2)}`);
                                }
                            }
                            // If length of commandOutput exceeded 7765, there will be no response display in mattermost.
                            if (characterNumber > 7700) { // To-do: need to check against response body
                                logger.warn(`Message response character number: ${characterNumber}`);
                                logger.warn(`Too many characters are in the message response. `
                                    + `The possibility is very high to exceed Mattermost allowed character limit for posts.`);
                                logger.error(`The incident is too large to post, Please narrow the size of this incident`);
                            }

                            logger.debug(`Command output: ${JSON.stringify(commandOutput)}`);

                            // Send response to chat tool
                            const chatContext = new ChatContext({
                                'message': null,
                                'bot': <CommonBot> this.bot,
                                'chatToolContext': null,
                                'user': {
                                    'id': '',
                                    'name': '',
                                    'email': '',
                                },
                                'channel': {
                                    'id': channel.id,
                                    'name': channel.name,
                                },
                                'team': {
                                    'id': '',
                                    'name': '',
                                },
                                'tenant': {
                                    'id': '',
                                    'name': '',
                                },
                                'chattingType': null,
                            });
                            // Send this commandOutput
                            chatContext.send(commandOutput);
                        } else if (chatToolType === IChatToolType.SLACK) {
                            logger.debug(`Command output: ${JSON.stringify(commandOutput)}`);

                            const chatContext = new ChatContext({
                                'message': null,
                                'bot': <CommonBot> this.bot,
                                'chatToolContext': null,
                                'chattingType': null,
                                'user': {
                                    'id': '',
                                    'name': '',
                                    'email': '',
                                },
                                'channel': {
                                    'id': channel.id,
                                    'name': channel.name,
                                },
                                'team': {
                                    'id': '',
                                    'name': '',
                                },
                                'tenant': {
                                    'id': '',
                                    'name': '',
                                },
                            });

                            // Pack Slack reply data
                            for (const msg of commandOutput) {
                                let replyData: IMessage;
                                if (msg.type === IMessageType.PLAIN_TEXT) {
                                    // Pack Slack reply data
                                    replyData = BnzUtil.packSlackTextReplyData(msg.message, channel.name);
                                } else if (msg.type === IMessageType.SLACK_BLOCK) {
                                    // Call Slack REST API to send message to channel
                                    msg.message.channel = channel.name;
                                    replyData = msg;
                                } else {
                                    logger.error(`Unsupported message type: ${JSON.stringify(msg, null, 2)}`);
                                }
                                // Send this commandOutput
                                chatContext.send([replyData]);
                            }
                        } else if (chatToolType === IChatToolType.MSTEAMS) {
                            logger.debug(`Command output: ${JSON.stringify(commandOutput)}`);

                            const chatContext = new ChatContext({
                                'message': null,
                                'bot': <CommonBot> this.bot,
                                'chatToolContext': null,
                                'chattingType': null,
                                'user': {
                                    'id': '',
                                    'name': '',
                                    'email': '',
                                },
                                'channel': {
                                    'id': channel.id,
                                    'name': channel.name,
                                },
                                'team': {
                                    'id': '',
                                    'name': '',
                                },
                                'tenant': {
                                    'id': '',
                                    'name': '',
                                },
                            });

                            // Replace the pretext message @channel with the real channel name
                            // Pretext message sample:
                            //  Attention @channel. I just was informed about following issue from IZOA
                            //  Reference:
                            //    how to @someone in MS Teams: https://docs.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/channel-and-group-conversations?tabs=typescript
                            for (const msg of commandOutput) {
                                if (msg.type === IMessageType.PLAIN_TEXT) {
                                    // Add the mentions only if we need to @channel
                                    if (msg.message.indexOf('@channel') !== -1 ) {
                                        msg.message = msg.message.replace('@channel', `<at>${channel.name}</at>`);
                                        msg.mentions = [{
                                            mentioned: {
                                                id: (channel.id !== undefined ? channel.id : ''),
                                                name: channel.name,
                                            },
                                            text: `<at>${channel.name}</at>`,
                                            type: 'mention',
                                        }];
                                    }
                                }
                            }
                            // Send this commandOutput
                            chatContext.send(commandOutput);

                            // Reset the @channel and mentions for next channel need to be posted.
                            for (const msg of commandOutput) {
                                if (msg.type === IMessageType.PLAIN_TEXT) {
                                    if (msg.message.indexOf(`<at>${channel.name}</at>`) !== -1 ) {
                                        msg.message = msg.message.replace(`<at>${channel.name}</at>`, '@channel');
                                        delete msg.mentions;
                                    }
                                }
                            }
                        } else {
                            logger.error('Not supported chat tool or chat tool is not specified!');
                        }
                    }
                }
            }
        } catch (err) {
            logger.error(`Failed to post incident: ${JSON.stringify(incident, null, 2)}`);
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(err.name), err));
        } finally {
            // Print end log
            logger.end(this.postIncident, this);
        }
    }
}

const bnzPoster: BnzPoster = BnzPoster.getInstance();
export = bnzPoster;
