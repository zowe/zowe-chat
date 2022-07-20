/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import CommonBot = require('../../CommonBot');
import Middleware = require('../../Middleware');
import logger = require('../../utils/Logger');
import { DummyClient } from './DummyClient';
import Util = require('../../utils/Util');
import DummyListener from './DummyListener';
import { IChatContextData, IMessage, IChatToolType, IMattermostOption, IUser, IChattingType, IChannel } from '../../types';

export class DummyMiddleware extends Middleware {
    private client: DummyClient;
    private botUser: IUser;
    private users: Map<string, IUser>;

    constructor(bot: CommonBot) {
        super(bot);

        this.client = null;
        this.botUser = null;
        this.users = new Map<string, IUser>();

        // Bind this pointer
        this.run = this.run.bind(this);
        this.updateBotUser = this.updateBotUser.bind(this);
        this.processMessage = this.processMessage.bind(this);
        this.send = this.send.bind(this);
        this.getUserById = this.getUserById.bind(this);
        this.addUser = this.addUser.bind(this);

        const option = this.bot.getOption();
        if (option.chatTool.type !== IChatToolType.DUMMY) {
            throw new Error('Chat tool type was not DUMMY');
        }
    }

    async run(): Promise<void> {
        logger.start(this.run, this);

        try {
            const dummyOption = <IMattermostOption>(this.bot.getOption().chatTool.option);
            this.client = new DummyClient(this, dummyOption);
            if (dummyOption.botAccessToken != null) {
                await this.client.connect();
            }
        } catch (err) {
            logger.error(logger.getErrorStack(new Error(err.name), err));
        } finally {
            logger.end(this.run, this);
        }
    }

    async send(chatContextData: IChatContextData, messages: IMessage[]): Promise<void> {
        logger.start(this.send, this);

        try {
            logger.debug(`Chat tool data sent to local dummy server: ${Util.dumpObject(chatContextData.chatToolContext, 2)}`);

            for (const msg of messages) {

                // Send message back to channel
                if (chatContextData.chatToolContext !== null) {
                    logger.info('Send conversation message ...');
                    this.client.sendMessage(msg.message, chatContextData.channel.id, chatContextData.chatToolContext.rootId);
                } else {
                    logger.info('Send proactive message ...');

                    // Find channel if channel id is not provided.
                    let channelId: string = null;
                    if (chatContextData.channel.id === '' && chatContextData.channel.name !== '') {
                        const channelInfo: IChannel = await this.client.getChannelByName(chatContextData.channel.name);

                        if (channelInfo === null) {
                            logger.error(`The specified local dummy channel does not exist!\n${JSON.stringify(chatContextData.channel, null, 2)}`);
                            return;
                        }
                        logger.debug(`Target channel info: ${JSON.stringify(channelInfo, null, 2)}`);
                        channelId = channelInfo.id;
                    } else { // channel id is provided.
                        channelId = chatContextData.channel.id;
                    }

                    logger.debug(`Target channel id: ${channelId}`);

                    this.client.sendMessage(msg.message, channelId, '');
                }
            }
        } catch (err) {
            logger.error(logger.getErrorStack(new Error(err.name), err));
        } finally {
            logger.end(this.send, this);
        }
    }

    async processMessage(rawMessage: Record<string, any>): Promise<void> {
        logger.start(this.processMessage, this);

        /* Incoming message format from websocket
                {
                event: 'posted',
                data: {
                    channel_display_name: 'Town Square',
                    channel_name: 'town-square',
                    channel_type: 'O',
                    mentions: '["ncy4cya8ojbk9m8gw3eefpie7y"]',
                    post: '{"id":"54cz6j6zejyxpgo9nb1a9m3p4o","create_at":1627025384926,"update_at":1627025384926,"edit_at":0,
                    "delete_at":0,"is_pinned":false,"user_id":"45oe76zzr78w3rugc5r3xss8cr","channel_id":"hj7byq55j3yfdr4y5dnizzzx6r",
                    "root_id":"","parent_id":"","original_id":"","message":"@blz  ad list","type":"","props":
                    {"disable_group_highlight":true},"hashtags":"","pending_post_id":"45oe76zzr78w3rugc5r3xss8cr:1627025384415",
                    "reply_count":0,"last_reply_at":0,"participants":null,"is_following":false,"metadata":{}}',
                    sender_name: '@nancy',
                    set_online: true,
                    team_id: 'jqwpiqng8tbri8u6w9twy31wiy'
                }
                }
        */
        logger.debug(`Message is received from local dummy server: ${Util.dumpObject(rawMessage)}`);

        try {
            const messagePost = rawMessage.data.post;
            // Ignore message from bot itself
            if (messagePost.user_id === this.botUser.id) {
                return;
            }

            // Get cached user, if user has not been cached, query it.
            let user: IUser = this.users.get(messagePost.user_id);
            if (user === undefined) {
                user = await this.client.getUserById(messagePost.user_id);
            }

            logger.debug(`User is ${JSON.stringify(user)}`);

            let chattingType = IChattingType.UNKNOWN;
            if (rawMessage.data.channel_type !== undefined && rawMessage.data.channel_type !== null) {
                chattingType = this.client.getChattingType(rawMessage.data.channel_type);
            } else {
                logger.error(`rawMessage.data.channel_type is undefined.`);
            }

            // If this is 1v1 chat, add "@botName" to match message.
            let receivedMessage = messagePost.message;
            if (chattingType === IChattingType.PERSONAL && !receivedMessage.trim().startsWith('@')) {
                receivedMessage = `@${this.botUser.name} ${receivedMessage}`;
            }
            const chatContextData: IChatContextData = {
                'message': receivedMessage,
                'bot': this.bot,
                'chatToolContext': {
                    'rootId': messagePost.root_id,
                },
                'chattingType': chattingType,
                'user': {
                    'id': messagePost.user_id,
                    'name': (user !== null) ? user.name : rawMessage.data.sender_name.trim().substring(1),
                    'email': (user !== null) ? user.email : '',
                },
                'channel': {
                    'id': messagePost.channel_id,
                    'name': rawMessage.data.channel_name,
                },
                'team': {
                    'id': rawMessage.data.team_id,
                    'name': '',
                },
                'tenant': {
                    'id': '',
                    'name': '',
                },
            };

            const listeners = <[DummyListener]>this.bot.getListeners();

            // Match and process message
            for (const listener of listeners) {
                const matchers = listener.getMessageMatcher().getMatchers();
                for (const matcher of matchers) {
                    const matched: boolean = matcher.matcher(chatContextData.message);
                    if (matched) {
                        for (const handler of matcher.handlers) {
                            await handler(chatContextData);
                        }
                    }
                }
            }
        } catch (err) {
            logger.error(logger.getErrorStack(new Error(err.name), err));
        } finally {
            logger.end(this.processMessage, this);
        }
    }

    updateBotUser(user: IUser): void {
        this.botUser = user;
    }

    addUser(id: string, user: IUser): void {
        if (this.users.has(id)) {
            return;
        }
        this.users.set(id, user);
    }

    async getUserById(id: string): Promise<IUser> {
        logger.start(this.getUserById, this);

        let user = this.users.get(id);
        if (user === undefined) {
            user = await this.client.getUserById(id);
        }

        logger.end(this.getUserById, this);
        return user;
    }
}
