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
import MattermostClient = require('./MattermostClient');
import Util = require('../../utils/Util');
import MattermostListener = require('./MattermostListener');
import ChatContext = require('../../ChatContext');
import {IChatContextData, IMessage, IMessageType, IChatToolType, IMattermostOption, IUser, IChattingType, IChannel} from '../../types';

class MattermostMiddleware extends Middleware {
    private client: MattermostClient;
    private botUser: IUser;
    private users: Map<string, IUser>;
    private channels: Map<string, IChannel>;

    // Constructor
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
        this.getChannelById = this.getChannelById.bind(this);

        // Get option
        const option = this.bot.getOption();
        if (option.chatTool.type !== IChatToolType.MATTERMOST) {
            logger.error(`Wrong chat tool type set in bot option: ${option.chatTool.type}`);
            throw new Error(`Wrong chat tool type`);
        }
    }

    // Run middleware
    async run(): Promise<void> {
        // Print start log
        logger.start(this.run, this);

        try {
            const mattermostOption = <IMattermostOption>(this.bot.getOption().chatTool.option);
            this.client = new MattermostClient(this, mattermostOption);
            if (mattermostOption.botAccessToken != null) {
                await this.client.loginWithToken();
            }
        } catch (err) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(err.name), err));
        } finally {
            // Print end log
            logger.end(this.run, this);
        }
    }

    // Send message back to Mattermost channel
    async send(contextData: IChatContextData, messages: IMessage[]): Promise<void> {
        // Print start log
        logger.start(this.send, this);

        try {
            logger.debug(`Chat tool data sent to Mattermost server: ${Util.dumpObject(contextData.chatToolContext, 2)}`);

            for (const msg of messages) {
                // Process view to open dialog.
                if (msg.type === IMessageType.MATTERMOST_DIALOG_OPENING) {
                    await this.client.openDialog(msg.message);
                    break;
                }

                // Send message back to channel
                if (contextData.chatToolContext !== null) { // Conversation message
                    logger.info('Send conversation message ...');
                    this.client.postMessage(msg.message, contextData.channel.id, contextData.chatToolContext.rootId);
                } else {
                    // Proactive message
                    logger.info('Send proactive message ...');

                    // Find channel if channel id is not provided.
                    let channelId: string = null;
                    if (contextData.channel.id === '' && contextData.channel.name !== '') { // channel name is provided.
                        const channelInfo: IChannel = await this.client.getChannelByName(contextData.channel.name);

                        if (channelInfo === null) {
                            logger.error(`The specified MatterMost channel does not exist!\n${JSON.stringify(contextData.channel, null, 2)}`);
                            return;
                        }
                        logger.debug(`Target channel info: ${JSON.stringify(channelInfo, null, 2)}`);
                        channelId = channelInfo.id;
                    } else { // channel id is provided.
                        channelId = contextData.channel.id;
                    }

                    logger.debug(`Target channel id: ${channelId}`);

                    this.client.postMessage(msg.message, channelId, '');
                }
            }
        } catch (err) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(err.name), err));
        } finally {
            // Print end log
            logger.end(this.send, this);
        }
    }

    // Process normal message
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
                },
                broadcast: {
                    omit_users: null,
                    user_id: '',
                    channel_id: 'hj7byq55j3yfdr4y5dnizzzx6r',
                    team_id: ''
                },
                seq: 6
                }
        */
        logger.debug(`Message is received from Mattermost server: ${Util.dumpObject(rawMessage)}`);

        try {
            const messagePost = JSON.parse(rawMessage.data.post);
            // Ignore message from bot itself
            if (messagePost.user_id === this.botUser.id) {
                return;
            }

            // Get cached user, if user has not been cached, query it.
            let user: IUser = this.users.get(messagePost.user_id);
            if (user === undefined) { // Not cached, query it.
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
            const contextData: IChatContextData = {
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
            logger.debug(`Chat context data sent to chat bot: ${Util.dumpObject(contextData, 2)}`);

            // Get listeners
            const listeners = <[MattermostListener]> this.bot.getListeners();

            // Match and process message
            for (const listener of listeners) {
                const matchers = listener.getMessageMatcher().getMatchers();
                for (const matcher of matchers) {
                    const matched: boolean = matcher.matcher(contextData.message);
                    if (matched) {
                        // Call message handler to process message
                        for (const handler of matcher.handlers) {
                            await handler(new ChatContext(contextData));
                        }
                    }
                }
            }
        } catch (err) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(err.name), err));
        } finally {
            // Print end log
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
        if (user === undefined) { // Not cached, query it.
            user = await this.client.getUserById(id);
        }

        logger.end(this.getUserById, this);
        return user;
    }

    async getChannelById(id: string): Promise<IChannel> {
        logger.start(this.getChannelById, this);

        const channel = await this.client.getChannelById(id);

        logger.end(this.getChannelById, this);
        return channel;
    }
}

export = MattermostMiddleware;
