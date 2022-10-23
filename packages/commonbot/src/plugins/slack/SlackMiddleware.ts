/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import { IChatContextData, ILogLevel, IMessage, IMessageType, ISlackOption, IChattingType, IUser, IChatToolType, IChannel,
    IPayloadType, IActionType, IEvent } from '../../types';
import type { SlackEventMiddlewareArgs, SlackViewMiddlewareArgs, AllMiddlewareArgs, SlackActionMiddlewareArgs, AppOptions } from '@slack/bolt';
import { ExpressReceiverOptions } from '@slack/bolt';
import { WebClient } from '@slack/web-api';

import { CommonBot } from '../../CommonBot';
import { Middleware } from '../../Middleware';
import { Logger } from '../../utils/Logger';
import { App, LogLevel } from '@slack/bolt';
import { Util } from '../../utils/Util';
import { SlackListener } from './SlackListener';
import { SlackRouter } from './SlackRouter';
import { Receiver } from './Receiver';

const logger = Logger.getInstance();

export class SlackMiddleware extends Middleware {
    private app: App;
    private botName: string = '';
    private users: Map<string, IUser>;
    private channels: Map<string, IChannel>;

    // Constructor
    constructor(bot: CommonBot) {
        super(bot);

        this.users = new Map<string, IUser>();
        this.channels = new Map<string, IChannel>();
        const option = this.bot.getOption();
        if (option.chatTool.type !== IChatToolType.SLACK) {
            logger.error(`Wrong chat tool type set in bot option: ${option.chatTool.type}`);
            throw new Error(`Wrong chat tool type`);
        }

        // Mapping ILogLevel to @slack/bolt LogLevel
        const logOption = logger.getOption();
        let logLevel: LogLevel;
        if (logOption.level == ILogLevel.DEBUG || logOption.level == ILogLevel.SILLY || logOption.level == ILogLevel.VERBOSE) {
            logLevel = LogLevel.DEBUG;
        } else if (logOption.level == ILogLevel.ERROR) {
            logLevel = LogLevel.ERROR;
        } else if (logOption.level == ILogLevel.INFO) {
            logLevel = LogLevel.INFO;
        } else if (logOption.level == ILogLevel.WARN) {
            logLevel = LogLevel.WARN;
        } else {
            // Should not happen, just for robustness.
            logger.error('Wrong log level');
        }

        // Create the slack receiver if socket mode is not enabled
        const slackOption: ISlackOption = <ISlackOption>option.chatTool.option;
        if (slackOption.socketMode === false) {
            logger.debug(`Socket mode is not enabled, start the http/https receiver`);
            const expressReceiverOptions: ExpressReceiverOptions = {
                'signingSecret': slackOption.signingSecret,
                'endpoints': slackOption.endpoints,
                'logLevel': logLevel,
            };
            logger.debug(`expressReceiverOptions: ${JSON.stringify(expressReceiverOptions)}`);
            const receiver = new Receiver(expressReceiverOptions);
            // Replace the default application with the provided one.
            if (option.messagingApp.app !== null) {
                receiver.setApp(option.messagingApp.app);
            }
            (<ISlackOption>option.chatTool.option).receiver = receiver;
        } else {
            // While socket mode is enabled, receiver should be undefined.
            slackOption.receiver = undefined;
        }

        // Create the bolt app: https://slack.dev/bolt-js/reference#initialization-options
        this.app = new App(<AppOptions>option.chatTool.option);

        this.run = this.run.bind(this);
        this.send = this.send.bind(this);
        this.processMessage = this.processMessage.bind(this);
        this.processAction = this.processAction.bind(this);
        this.processViewAction = this.processViewAction.bind(this);
    }

    // Run middleware
    async run(): Promise<void> {
        // Print start log
        logger.start(this.run, this);

        // Initializes your app with your bot token and signing secret
        try {
            const option = this.bot.getOption();
            // Only start the receiver if the app use socket mode
            if ((<ISlackOption>option.chatTool.option).socketMode === true) {
                await this.app.start();
            }

            this.app.message(/.*/, this.processMessage);
            this.app.action(/.*/, this.processAction);
            this.app.view(/.*/, this.processViewAction);
        } catch (err) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(err.name), err));
        } finally {
            // Print end log
            logger.end(this.run, this);
        }
    }

    // Process normal message
    async processMessage(slackEvent: SlackEventMiddlewareArgs<'message'> & AllMiddlewareArgs): Promise<void> {
        // Print start log
        logger.start(this.processMessage, this);

        try {
            // slackEvent: {"body":{"token":"HbBiKhv3kF6VioyjCqwLMLfc","team_id":"T0197NLG020","enterprise_id":"EUJJ37YFR","api_app_id":"A028U9TTUG1","event":{"client_msg_id":"4f81a6ed-3c44-4440-973a-7235e39f47b7","type":"message","text":"<@U028GLFRB27> help","user":"W0197PJSJAG","ts":"1632240686.012400","team":"T0197NLG020","blocks":[{"type":"rich_text","block_id":"4Dbq","elements":[{"type":"rich_text_section","elements":[{"type":"user","user_id":"U028GLFRB27"},{"type":"text","text":" help"}]}]}],"channel":"G01F96Y55KJ","event_ts":"1632240686.012400","channel_type":"group"},"type":"event_callback","event_id":"Ev02FJ8FTQUR","event_time":1632240686,"authorizations":[{"enterprise_id":"EUJJ37YFR","team_id":"T0197NLG020","user_id":"U028GLFRB27","is_bot":true,"is_enterprise_install":false}],"is_ext_shared_channel":false,"event_context":"4-eyJldCI6Im1lc3NhZ2UiLCJ0aWQiOiJUMDE5N05MRzAyMCIsImFpZCI6IkEwMjhVOVRUVUcxIiwiY2lkIjoiRzAxRjk2WTU1S0oifQ"},"payload":{"client_msg_id":"4f81a6ed-3c44-4440-973a-7235e39f47b7","type":"message","text":"<@U028GLFRB27> help","user":"W0197PJSJAG","ts":"1632240686.012400","team":"T0197NLG020","blocks":[{"type":"rich_text","block_id":"4Dbq","elements":[{"type":"rich_text_section","elements":[{"type":"user","user_id":"U028GLFRB27"},{"type":"text","text":" help"}]}]}],"channel":"G01F96Y55KJ","event_ts":"1632240686.012400","channel_type":"group"},"event":{"client_msg_id":"4f81a6ed-3c44-4440-973a-7235e39f47b7","type":"message","text":"<@U028GLFRB27> help","user":"W0197PJSJAG","ts":"1632240686.012400","team":"T0197NLG020","blocks":[{"type":"rich_text","block_id":"4Dbq","elements":[{"type":"rich_text_section","elements":[{"type":"user","user_id":"U028GLFRB27"},{"type":"text","text":" help"}]}]}],"channel":"G01F96Y55KJ","event_ts":"1632240686.012400","channel_type":"group"},"message":{"client_msg_id":"4f81a6ed-3c44-4440-973a-7235e39f47b7","type":"message","text":"<@U028GLFRB27> help","user":"W0197PJSJAG","ts":"1632240686.012400","team":"T0197NLG020","blocks":[{"type":"rich_text","block_id":"4Dbq","elements":[{"type":"rich_text_section","elements":[{"type":"user","user_id":"U028GLFRB27"},{"type":"text","text":" help"}]}]}],"channel":"G01F96Y55KJ","event_ts":"1632240686.012400","channel_type":"group"},"context":{"isEnterpriseInstall":false,"botToken":"xoxb-1313768544068-2288695861075-Uj0YBykPiMz1tyqWsTxlH9P4","botUserId":"U028GLFRB27","botId":"B028GEG4EV8","teamId":"T0197NLG020","enterpriseId":"EUJJ37YFR","matches":["<@U028GLFRB27> help"]},"client":{"_events":{},"_eventsCount":0,"admin":{"apps":{"approved":{},"requests":{},"restricted":{}},"auth":{"policy":{}},"barriers":{},"conversations":{"ekm":{},"restrictAccess":{}},"emoji":{},"inviteRequests":{"approved":{},"denied":{}},"teams":{"admins":{},"owners":{},"settings":{}},"usergroups":{},"users":{"session":{}}},"api":{},"apps":{"connections":{},"event":{"authorizations":{}}},"auth":{"teams":{}},"bots":{},"calls":{"participants":{}},"chat":{"scheduledMessages":{}},"conversations":{},"dialog":{},"dnd":{},"emoji":{},"files":{"comments":{},"remote":{}},"migration":{},"oauth":{"v2":{}},"openid":{"connect":{}},"pins":{},"reactions":{},"reminders":{},"rtm":{},"search":{},"stars":{},"team":{"profile":{}},"usergroups":{"users":{}},"users":{"profile":{}},"views":{},"workflows":{},"channels":{},"groups":{},"im":{},"mpim":{},"token":"xoxb-1313768544068-2288695861075-Uj0YBykPiMz1tyqWsTxlH9P4","slackApiUrl":"https://slack.com/api/","retryConfig":{"retries":10,"factor":1.96821,"randomize":true},"requestQueue":{"_events":{},"_eventsCount":0,"_intervalCount":0,"_intervalEnd":0,"_pendingCount":0,"_carryoverConcurrencyCount":false,"_isIntervalIgnored":true,"_intervalCap":null,"_interval":0,"_queue":{"_queue":[]},"_concurrency":3,"_throwOnTimeout":false,"_isPaused":false},"tlsConfig":{},"rejectRateLimitedCalls":false,"teamId":"T0197NLG020","logger":{"level":"debug","name":"web-api:WebClient:1"}},"logger":{"level":"debug","name":"bolt-app"}}
            logger.debug(`slackEvent: ${JSON.stringify(slackEvent)}`);

            const chatToolContext = {
                'message': slackEvent.message,
                'context': slackEvent.context,
                'client': slackEvent.client,
                'body': slackEvent.body,
                'payload': slackEvent.payload,
            };

            // Cache the bot Name
            // The bot user real_name is the display name that user configured on the slack app configuration page.
            // This is also the name that you are referring when you @ the bot
            if (this.botName === undefined || this.botName.trim() === '') {
                const botUserInfo = await slackEvent.client.users.info({ user: slackEvent.context.botUserId });
                logger.debug(`Bot user info: ${JSON.stringify(botUserInfo)}`);
                this.botName = botUserInfo.user.real_name;
            }

            // Search the user from cached users.
            // (<Record<string, any>>slackEvent.message).user is the id of the user
            let user = this.getUser((<Record<string, any>>slackEvent.message).user); // eslint-disable-line @typescript-eslint/no-explicit-any
            // if user have not been cached, then search from the slack server and cache it
            if (user === undefined ) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const userInfo = await slackEvent.client.users.info({ user: (<Record<string, any>>slackEvent.message).user });
                logger.debug(`Cache the user info: ${JSON.stringify(userInfo)}`);
                user = { id: userInfo.user.id, name: userInfo.user.real_name, email: userInfo.user.profile.email };
                this.addUser(userInfo.user.id, user);
            }

            // Search the channel from cached channels.
            const channelId = slackEvent.message.channel;
            let channel: IChannel = this.channels.get(channelId);
            // if channel have not been cached, then search from the slack server and cache it.
            if (channel == undefined ) {
                channel = await this.getChannelById(channelId, slackEvent.client);
                this.channels.set(channelId, channel);
            }

            let message = '';

            // message Example
            // message: {"client_msg_id":"0716d94a-1561-4154-b0ce-12386a3b9b6f","type":"message","text":"<@U034W9HMH9V> _*help ad*_   ~_cdfad_~    `<https://www.ibm.com>`     <https://www.ibm.com>","user":"W0197PJSJAG","ts":"1646978508.524889","team":"T0197NLG020","blocks":[{"type":"rich_text","block_id":"W4yRm","elements":[{"type":"rich_text_section","elements":[{"type":"user","user_id":"U034W9HMH9V"},{"type":"text","text":" "},{"type":"text","text":"help ad","style":{"bold":true,"italic":true}},{"type":"text","text":"   "},{"type":"text","text":"cdfad","style":{"italic":true,"strike":true}},{"type":"text","text":"    "},{"type":"link","url":"https://www.ibm.com","style":{"code":true}},{"type":"text","text":"     "},{"type":"link","url":"https://www.ibm.com"}]}]}],"channel":"G01F96Y55KJ","event_ts":"1646978508.524889","channel_type":"group"}
            // Get the message text
            const reg = new RegExp(`<@${slackEvent.context.botUserId}>`, 'g');
            message = (<Record<string, any>>slackEvent.message).text.replace(reg, `@${this.botName}`); // eslint-disable-line @typescript-eslint/no-explicit-any

            // Try to get the raw message
            let rawMessage = '';
            if ((<Record<string, any>>slackEvent.message).blocks !== undefined) { // eslint-disable-line @typescript-eslint/no-explicit-any
                const messageBlocks = (<Record<string, any>>slackEvent.message).blocks; // eslint-disable-line @typescript-eslint/no-explicit-any
                for (const block of messageBlocks) {
                    // Get the rich_text block
                    if (block.type === 'rich_text' && block.elements !== undefined) {
                        for (const element of block.elements) {
                            if (element.type === 'rich_text_section' && element.elements !== undefined) {
                                logger.debug(`Find block rich_text_section to get the raw message`);
                                for (const richTextElement of element.elements) {
                                    // Only consider user, link && text element.
                                    if (richTextElement.type == 'user' && richTextElement.user_id == slackEvent.context.botUserId) {
                                        rawMessage = `${rawMessage}@${this.botName}`;
                                    } else if (richTextElement.type === 'text') {
                                        rawMessage = rawMessage + richTextElement.text;
                                    } else if (richTextElement.type === 'link') {
                                        rawMessage = rawMessage + richTextElement.url;
                                    }
                                }
                                // Only parsing one rich_text_section.
                                break;
                            }
                        }
                    }

                    // Only parsing one rich_text if it's not empty.
                    if (rawMessage != '') {
                        break;
                    }
                }
            }

            logger.debug(`rawMessage: ${rawMessage}`);
            // If rawMessage is not empty, using rawMessage
            if (rawMessage !== '') {
                message = rawMessage;
            }

            // Add @<bot name> if the direct message doesn't contain it.
            if (channel.chattingType == IChattingType.PERSONAL) {
                if (message.indexOf(`@${this.botName}`) === -1) {
                    message = `@${this.botName} ${message}`;
                }
            }

            const chatContextData: IChatContextData = {
                'payload': {
                    'type': IPayloadType.MESSAGE,
                    'data': message,
                },
                'context': {
                    'chatting': {
                        'bot': this.bot,
                        'type': channel.chattingType,
                        'user': {
                            'id': user.id,
                            'name': user.name,
                            'email': user.email,
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
                    },
                    'chatTool': chatToolContext,
                },
            };
            logger.debug(`Chat context data sent to chat bot: ${Util.dumpObject(chatContextData, 2)}`);

            // Get listeners
            const listeners = <SlackListener[]> this.bot.getListeners();

            // Match and process message
            for (const listener of listeners) {
                const matchers = listener.getMessageMatcher().getMatchers();
                for (const matcher of matchers) {
                    const matched: boolean = matcher.matcher(chatContextData);
                    if (matched) {
                    // Call message handler to process message
                        for (const handler of matcher.handlers) {
                            await handler(chatContextData);
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

    // Process user interactive actions e.g. button clicks, menu selects.
    async processAction(slackEvent: SlackActionMiddlewareArgs & AllMiddlewareArgs): Promise<void> {
        // Print start log
        logger.start(this.processAction, this);

        try {
            // slackEvent: {"body":{"type":"block_actions","user":{"id":"W0197PJSJAG","username":"kzkong","name":"kzkong","team_id":"T0197NLG020"},"api_app_id":"A028U9TTUG1","token":"HbBiKhv3kF6VioyjCqwLMLfc","container":{"type":"message","message_ts":"1632242017.014200","channel_id":"G01F96Y55KJ","is_ephemeral":false},"trigger_id":"2509041641414.1313768544068.ee2b76da5dcf0034921b4755aa0a779a","team":{"id":"T0197NLG020","domain":"ibm-z-chatops","enterprise_id":"EUJJ37YFR","enterprise_name":"IBM Test"},"enterprise":{"id":"EUJJ37YFR","name":"IBM Test"},"is_enterprise_install":false,"channel":{"id":"G01F96Y55KJ","name":"privategroup"},"message":{"bot_id":"B028GEG4EV8","type":"message","text":"New message from Common bot","user":"U028GLFRB27","ts":"1632242017.014200","team":"T0197NLG020","blocks":[{"type":"section","block_id":"IvKbZ","text":{"type":"mrkdwn","text":"Okay, Zhi Kong. Here are the commands for IBM Z ChatOps. You can find detailed information in <https://www.ibm.com/docs/en/z-chatops/1.1.1|IBM Documentation>.","verbatim":false}},{"type":"section","block_id":"+js+","text":{"type":"mrkdwn","text":"*<https://www.ibm.com/docs/en/z-chatops/1.1.1?topic=commands-botname-default|default>*  Operates on default settings to show default status or set the value of automation domains, NetView domains or systems. \n","verbatim":false}},{"type":"section","block_id":"/0naa","text":{"type":"mrkdwn","text":"*<https://www.ibm.com/docs/en/z-chatops/1.1.1?topic=commands-botname-teps-server|teps-server | ts>*  Operates on TEPS servers to show the status. \n","verbatim":false}},{"type":"section","block_id":"0tI","text":{"type":"mrkdwn","text":"*<https://www.ibm.com/docs/en/z-chatops/1.1.1?topic=commands-botname-event|event>*  operates on events to show the status. \n","verbatim":false}},{"type":"section","block_id":"=O2q","text":{"type":"mrkdwn","text":"*<https://www.ibm.com/docs/en/z-chatops/1.1.1?topic=commands-botname-cicsplex|cicsplex | cp>*  Operates on the CICSplex to show the status. \n","verbatim":false}},{"type":"section","block_id":"EQa","text":{"type":"mrkdwn","text":"*<https://www.ibm.com/docs/en/z-chatops/1.1.1?topic=commands-botname-cics-region|cics-region | cr>*  Operates on CICS regions to show the status or transactions. \n","verbatim":false}},{"type":"section","block_id":"yJip","text":{"type":"mrkdwn","text":"*<https://www.ibm.com/docs/en/z-chatops/1.1.1?topic=commands-botname-db2|db2>*  Operates on Db2 to show the status or buffer pools. \n","verbatim":false}},{"type":"section","block_id":"bPpQ","text":{"type":"mrkdwn","text":"*<https://www.ibm.com/docs/en/z-chatops/1.1.1?topic=commands-botname-lpar|lpar>*  Operates on LPAR to show the status or jobs. \n","verbatim":false}},{"type":"section","block_id":"gENS","text":{"type":"mrkdwn","text":"*<https://www.ibm.com/docs/en/z-chatops/1.1.1?topic=commands-botname-network|network>*  Operates on the Network to show the status or listeners. \n","verbatim":false}},{"type":"section","block_id":"94Z2v","text":{"type":"mrkdwn","text":"*<https://www.ibm.com/docs/en/z-chatops/1.1.1?topic=commands-botname-storage-group|storage-group | sg>*  Operates on the storage groups to show the status. \n","verbatim":false}},{"type":"section","block_id":"YfD","text":{"type":"mrkdwn","text":"*<https://www.ibm.com/docs/en/z-chatops/1.1.1?topic=commands-botname-storage-volume|storage-volume | sv>*  Operates on the storage volumes to show the status or data sets. \n","verbatim":false}},{"type":"section","block_id":"hin","text":{"type":"mrkdwn","text":"*<https://www.ibm.com/docs/en/z-chatops/1.1.1?topic=commands-botname-ims|ims>*  Operates on IMS to show the status or regions. \n","verbatim":false}},{"type":"section","block_id":"bt+A","text":{"type":"mrkdwn","text":"*<https://www.ibm.com/docs/en/z-chatops/1.1.1?topic=commands-botname-jvm|jvm>*  Operates on JVM to show the status or locks. \n","verbatim":false}},{"type":"section","block_id":"TlwIa","text":{"type":"mrkdwn","text":"*<https://www.ibm.com/docs/en/z-chatops/1.1.1?topic=commands-botname-mq|mq>*  Operates on MQ to show the status or queues. \n","verbatim":false}},{"type":"section","block_id":"tRwU","text":{"type":"mrkdwn","text":"*<https://www.ibm.com/docs/en/z-chatops/1.1.1?topic=commands-botname-automation-domain|automation-domain | ad>*  Operates on automation domains to show status, resource or system. \n","verbatim":false}},{"type":"section","block_id":"O7Rny","text":{"type":"mrkdwn","text":"*<https://www.ibm.com/docs/en/z-chatops/1.1.1?topic=commands-botname-system|system>*  Operates on systems to show status or resources. \n","verbatim":false}},{"type":"section","block_id":"lZ4=","text":{"type":"mrkdwn","text":"*<https://www.ibm.com/docs/en/z-chatops/1.1.1?topic=commands-botname-automation-resource|automation-resource | ar>*  Operates on automation resources to show status, member, relation, or request. \n","verbatim":false}},{"type":"section","block_id":"k25nH","text":{"type":"mrkdwn","text":"*<https://www.ibm.com/docs/en/z-chatops/1.1.1?topic=commands-botname-netview-domain|netview-domain | nd>*  Operates on NetView domains to show status or canzlog. \n","verbatim":false}},{"type":"section","block_id":"UJbj","text":{"type":"mrkdwn","text":"*<https://www.ibm.com/docs/en/z-chatops/1.1.1?topic=commands-botname-help|help>*  Operates on command inline help \n","verbatim":false}},{"type":"actions","block_id":"BWws","elements":[{"type":"static_select","action_id":"Show command details_97597960:9CBnmuKgipOVD1dcpc3vWc9qePgfNisBYfYriZ6LLnP5nQh/CC9D8OulDbFosXqzEXpGhveVs/YOy7CYYhap0w==","placeholder":{"type":"plain_text","text":"Show command details","emoji":true},"options":[{"text":{"type":"plain_text","text":"Details of default","emoji":true},"value":"000:default:"},{"text":{"type":"plain_text","text":"Details of teps-server | ts","emoji":true},"value":"000:ts:"},{"text":{"type":"plain_text","text":"Details of event","emoji":true},"value":"000:event:"},{"text":{"type":"plain_text","text":"Details of cicsplex | cp","emoji":true},"value":"000:cp:"},{"text":{"type":"plain_text","text":"Details of cics-region | cr","emoji":true},"value":"000:cr:"},{"text":{"type":"plain_text","text":"Details of db2","emoji":true},"value":"000:db2:"},{"text":{"type":"plain_text","text":"Details of lpar","emoji":true},"value":"000:lpar:"},{"text":{"type":"plain_text","text":"Details of network","emoji":true},"value":"000:network:"},{"text":{"type":"plain_text","text":"Details of storage-group | sg","emoji":true},"value":"000:sg:"},{"text":{"type":"plain_text","text":"Details of storage-volume | sv","emoji":true},"value":"000:sv:"},{"text":{"type":"plain_text","text":"Details of ims","emoji":true},"value":"000:ims:"},{"text":{"type":"plain_text","text":"Details of jvm","emoji":true},"value":"000:jvm:"},{"text":{"type":"plain_text","text":"Details of mq","emoji":true},"value":"000:mq:"},{"text":{"type":"plain_text","text":"Details of automation-domain | ad","emoji":true},"value":"000:ad:"},{"text":{"type":"plain_text","text":"Details of system","emoji":true},"value":"000:system:"},{"text":{"type":"plain_text","text":"Details of automation-resource | ar","emoji":true},"value":"000:ar:"},{"text":{"type":"plain_text","text":"Details of netview-domain | nd","emoji":true},"value":"000:nd:"},{"text":{"type":"plain_text","text":"Details of help","emoji":true},"value":"000:help:"}]}]}]},"state":{"values":{"BWws":{"Show command details_97597960:9CBnmuKgipOVD1dcpc3vWc9qePgfNisBYfYriZ6LLnP5nQh/CC9D8OulDbFosXqzEXpGhveVs/YOy7CYYhap0w==":{"type":"static_select","selected_option":{"text":{"type":"plain_text","text":"Details of lpar","emoji":true},"value":"000:lpar:"}}}}},"response_url":"https://hooks.slack.com/actions/T0197NLG020/2528409976481/1hFrMDXLSLtZ9mYettSs0pDY","actions":[{"type":"static_select","action_id":"Show command details_97597960:9CBnmuKgipOVD1dcpc3vWc9qePgfNisBYfYriZ6LLnP5nQh/CC9D8OulDbFosXqzEXpGhveVs/YOy7CYYhap0w==","block_id":"BWws","selected_option":{"text":{"type":"plain_text","text":"Details of lpar","emoji":true},"value":"000:lpar:"},"placeholder":{"type":"plain_text","text":"Show command details","emoji":true},"action_ts":"1632242123.649353"}]},"payload":{"type":"static_select","action_id":"Show command details_97597960:9CBnmuKgipOVD1dcpc3vWc9qePgfNisBYfYriZ6LLnP5nQh/CC9D8OulDbFosXqzEXpGhveVs/YOy7CYYhap0w==","block_id":"BWws","selected_option":{"text":{"type":"plain_text","text":"Details of lpar","emoji":true},"value":"000:lpar:"},"placeholder":{"type":"plain_text","text":"Show command details","emoji":true},"action_ts":"1632242123.649353"},"action":{"type":"static_select","action_id":"Show command details_97597960:9CBnmuKgipOVD1dcpc3vWc9qePgfNisBYfYriZ6LLnP5nQh/CC9D8OulDbFosXqzEXpGhveVs/YOy7CYYhap0w==","block_id":"BWws","selected_option":{"text":{"type":"plain_text","text":"Details of lpar","emoji":true},"value":"000:lpar:"},"placeholder":{"type":"plain_text","text":"Show command details","emoji":true},"action_ts":"1632242123.649353"},"context":{"isEnterpriseInstall":false,"botToken":"xoxb-1313768544068-2288695861075-Uj0YBykPiMz1tyqWsTxlH9P4","botUserId":"U028GLFRB27","botId":"B028GEG4EV8","teamId":"T0197NLG020","enterpriseId":"EUJJ37YFR","actionIdMatches":["Show command details_97597960:9CBnmuKgipOVD1dcpc3vWc9qePgfNisBYfYriZ6LLnP5nQh/CC9D8OulDbFosXqzEXpGhveVs/YOy7CYYhap0w=="]},"client":{"_events":{},"_eventsCount":0,"admin":{"apps":{"approved":{},"requests":{},"restricted":{}},"auth":{"policy":{}},"barriers":{},"conversations":{"ekm":{},"restrictAccess":{}},"emoji":{},"inviteRequests":{"approved":{},"denied":{}},"teams":{"admins":{},"owners":{},"settings":{}},"usergroups":{},"users":{"session":{}}},"api":{},"apps":{"connections":{},"event":{"authorizations":{}}},"auth":{"teams":{}},"bots":{},"calls":{"participants":{}},"chat":{"scheduledMessages":{}},"conversations":{},"dialog":{},"dnd":{},"emoji":{},"files":{"comments":{},"remote":{}},"migration":{},"oauth":{"v2":{}},"openid":{"connect":{}},"pins":{},"reactions":{},"reminders":{},"rtm":{},"search":{},"stars":{},"team":{"profile":{}},"usergroups":{"users":{}},"users":{"profile":{}},"views":{},"workflows":{},"channels":{},"groups":{},"im":{},"mpim":{},"token":"xoxb-1313768544068-2288695861075-Uj0YBykPiMz1tyqWsTxlH9P4","slackApiUrl":"https://slack.com/api/","retryConfig":{"retries":10,"factor":1.96821,"randomize":true},"requestQueue":{"_events":{},"_eventsCount":0,"_intervalCount":1,"_intervalEnd":0,"_pendingCount":0,"_carryoverConcurrencyCount":false,"_isIntervalIgnored":true,"_intervalCap":null,"_interval":0,"_queue":{"_queue":[]},"_concurrency":3,"_throwOnTimeout":false,"_isPaused":false},"tlsConfig":{},"rejectRateLimitedCalls":false,"teamId":"T0197NLG020","logger":{"level":"debug","name":"web-api:WebClient:1"}},"logger":{"level":"debug","name":"bolt-app"}}
            logger.debug(`slackEvent: ${JSON.stringify(slackEvent)}`);

            // Acknowledge slack server at once for the 3s requirement.
            await slackEvent.ack();

            const chatToolContext = {
                'context': slackEvent.context,
                'client': slackEvent.client,
                'body': slackEvent.body,
                'payload': slackEvent.payload,
            };

            // Cache the bot Name
            // The bot user real_name is the display name that user configured on the slack app configuration page.
            // This is also the name that you are referring when you @ the bot
            if (this.botName === undefined || this.botName.trim() === '') {
                const botUserInfo = await slackEvent.client.users.info({ user: slackEvent.context.botUserId });
                logger.debug(`Bot user info: ${JSON.stringify(botUserInfo)}`);
                this.botName = botUserInfo.user.real_name;
            }

            // Search the user from cached users.
            // (<Record<string, any>>slackEvent.message).user is the id of the user
            let user = this.getUser((<Record<string, any>>slackEvent.body).user.id); // eslint-disable-line @typescript-eslint/no-explicit-any
            // if user have not been cached, then search from the slack server and cache it
            if (user === undefined ) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const userInfo = await slackEvent.client.users.info({ user: (<Record<string, any>>slackEvent.body).user.id });
                logger.debug(`Cache the user info: ${JSON.stringify(userInfo)}`);
                user = { id: userInfo.user.id, name: userInfo.user.real_name, email: userInfo.user.profile.email };
                this.addUser(userInfo.user.id, user);
            }

            // Search the channel from cached channels.
            const channelId = slackEvent.body.channel.id;
            let channel: IChannel = this.channels.get(channelId);
            // if channel have not been cached, then search from the slack server and cache it.
            if (channel == undefined ) {
                channel = await this.getChannelById(channelId, slackEvent.client);
                this.channels.set(channelId, channel);
            }

            // Get  event
            const event: IEvent = {
                'pluginId': '',
                'action': {
                    'id': '',
                    'type': null,
                    'token': '',
                },
            };
            const eventBody: any = slackEvent.body; // eslint-disable-line @typescript-eslint/no-explicit-any
            const actionId = eventBody.actions[0].action_id;
            const segments = actionId.split(':');
            if (segments.length >= 3) {
                event.pluginId = segments[0];
                event.action.id = segments[1];
                event.action.token = segments[2];
            } else {
                logger.error(`The data format of action_id is wrong!\n action_id=${actionId}`);
            }
            if (eventBody.type === 'view_submission') {
                event.action.type = IActionType.DIALOG_SUBMIT;
            } else {
                if (eventBody.actions[0].type === 'static_select') {
                    event.action.type = IActionType.DROPDOWN_SELECT;
                } else if (eventBody.actions[0].type === 'button') {
                    if (event.action.id.startsWith('DIALOG_OPEN_')) {
                        event.action.type = IActionType.DIALOG_OPEN;
                    } else {
                        event.action.type = IActionType.BUTTON_CLICK;
                    }
                } else {
                    event.action.type = IActionType.UNSUPPORTED;
                    logger.error(`Unsupported Slack interactive component: ${eventBody.actions[0].type}`);
                }
            }

            const chatContextData: IChatContextData = {
                'payload': {
                    'type': IPayloadType.EVENT,
                    'data': event,
                },
                'context': {
                    'chatting': {
                        'bot': this.bot,
                        'type': channel.chattingType,
                        'user': {
                            'id': user.id,
                            'name': user.name,
                            'email': user.email,
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
                    },
                    'chatTool': chatToolContext,
                },
            };

            // Get router
            const router = <SlackRouter> this.bot.geRouter();

            // Call route handler for mouse navigation
            await router.getRoute().handler(chatContextData);
        } catch (err) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(err.name), err));
        } finally {
            // Print end log
            logger.end(this.processAction, this);
        }
    }

    async processViewAction(slackEvent: SlackViewMiddlewareArgs & AllMiddlewareArgs): Promise<void> {
        // Print start log
        logger.start(this.processViewAction, this);

        try {
            // slackEvent: {"body":{"type":"view_submission","team":{"id":"T0197NLG020","domain":"ibm-z-chatops","enterprise_id":"EUJJ37YFR","enterprise_name":"IBM Test"},"user":{"id":"W0197PJSJAG","username":"kzkong","name":"kzkong","team_id":"T0197NLG020"},"api_app_id":"A028U9TTUG1","token":"HbBiKhv3kF6VioyjCqwLMLfc","trigger_id":"2539515802224.1313768544068.1b06be316e0d2c9b739e2bdb96ff4fae","view":{"id":"V02FVF5H6BS","team_id":"T0197NLG020","type":"modal","blocks":[{"type":"input","block_id":"block_user_name","label":{"type":"plain_text","text":"Uer name","emoji":true},"optional":false,"dispatch_action":false,"element":{"type":"plain_text_input","action_id":"action_user_name","placeholder":{"type":"plain_text","text":"Your user name?","emoji":true},"dispatch_action_config":{"trigger_actions_on":["on_enter_pressed"]}}},{"type":"input","block_id":"block_user_password","label":{"type":"plain_text","text":"Password","emoji":true},"optional":false,"dispatch_action":false,"element":{"type":"plain_text_input","action_id":"action_user_password","placeholder":{"type":"plain_text","text":"Your password?","emoji":true},"dispatch_action_config":{"trigger_actions_on":["on_enter_pressed"]}}}],"private_metadata":"{\"channelId\":\"G01F96Y55KJ\",\"Customise\":\"example\",\"thread_ts\":\"\"}","callback_id":"modal-identifier","state":{"values":{"block_user_name":{"action_user_name":{"type":"plain_text_input","value":"a"}},"block_user_password":{"action_user_password":{"type":"plain_text_input","value":"b"}}}},"hash":"1632243435.hKmYREPp","title":{"type":"plain_text","text":"Login","emoji":true},"clear_on_close":false,"notify_on_close":false,"close":null,"submit":{"type":"plain_text","text":"Submit","emoji":true},"previous_view_id":null,"root_view_id":"V02FVF5H6BS","app_id":"A028U9TTUG1","external_id":"","app_installed_team_id":"T0197NLG020","bot_id":"B028GEG4EV8"},"response_urls":[],"is_enterprise_install":false,"enterprise":{"id":"EUJJ37YFR","name":"IBM Test"}},"payload":{"id":"V02FVF5H6BS","team_id":"T0197NLG020","type":"modal","blocks":[{"type":"input","block_id":"block_user_name","label":{"type":"plain_text","text":"Uer name","emoji":true},"optional":false,"dispatch_action":false,"element":{"type":"plain_text_input","action_id":"action_user_name","placeholder":{"type":"plain_text","text":"Your user name?","emoji":true},"dispatch_action_config":{"trigger_actions_on":["on_enter_pressed"]}}},{"type":"input","block_id":"block_user_password","label":{"type":"plain_text","text":"Password","emoji":true},"optional":false,"dispatch_action":false,"element":{"type":"plain_text_input","action_id":"action_user_password","placeholder":{"type":"plain_text","text":"Your password?","emoji":true},"dispatch_action_config":{"trigger_actions_on":["on_enter_pressed"]}}}],"private_metadata":"{\"channelId\":\"G01F96Y55KJ\",\"Customise\":\"example\",\"thread_ts\":\"\"}","callback_id":"modal-identifier","state":{"values":{"block_user_name":{"action_user_name":{"type":"plain_text_input","value":"a"}},"block_user_password":{"action_user_password":{"type":"plain_text_input","value":"b"}}}},"hash":"1632243435.hKmYREPp","title":{"type":"plain_text","text":"Login","emoji":true},"clear_on_close":false,"notify_on_close":false,"close":null,"submit":{"type":"plain_text","text":"Submit","emoji":true},"previous_view_id":null,"root_view_id":"V02FVF5H6BS","app_id":"A028U9TTUG1","external_id":"","app_installed_team_id":"T0197NLG020","bot_id":"B028GEG4EV8"},"view":{"id":"V02FVF5H6BS","team_id":"T0197NLG020","type":"modal","blocks":[{"type":"input","block_id":"block_user_name","label":{"type":"plain_text","text":"Uer name","emoji":true},"optional":false,"dispatch_action":false,"element":{"type":"plain_text_input","action_id":"action_user_name","placeholder":{"type":"plain_text","text":"Your user name?","emoji":true},"dispatch_action_config":{"trigger_actions_on":["on_enter_pressed"]}}},{"type":"input","block_id":"block_user_password","label":{"type":"plain_text","text":"Password","emoji":true},"optional":false,"dispatch_action":false,"element":{"type":"plain_text_input","action_id":"action_user_password","placeholder":{"type":"plain_text","text":"Your password?","emoji":true},"dispatch_action_config":{"trigger_actions_on":["on_enter_pressed"]}}}],"private_metadata":"{\"channelId\":\"G01F96Y55KJ\",\"Customise\":\"example\",\"thread_ts\":\"\"}","callback_id":"modal-identifier","state":{"values":{"block_user_name":{"action_user_name":{"type":"plain_text_input","value":"a"}},"block_user_password":{"action_user_password":{"type":"plain_text_input","value":"b"}}}},"hash":"1632243435.hKmYREPp","title":{"type":"plain_text","text":"Login","emoji":true},"clear_on_close":false,"notify_on_close":false,"close":null,"submit":{"type":"plain_text","text":"Submit","emoji":true},"previous_view_id":null,"root_view_id":"V02FVF5H6BS","app_id":"A028U9TTUG1","external_id":"","app_installed_team_id":"T0197NLG020","bot_id":"B028GEG4EV8"},"context":{"isEnterpriseInstall":false,"botToken":"xoxb-1313768544068-2288695861075-Uj0YBykPiMz1tyqWsTxlH9P4","botUserId":"U028GLFRB27","botId":"B028GEG4EV8","teamId":"T0197NLG020","enterpriseId":"EUJJ37YFR","callbackIdMatches":["modal-identifier"]},"client":{"_events":{},"_eventsCount":0,"admin":{"apps":{"approved":{},"requests":{},"restricted":{}},"auth":{"policy":{}},"barriers":{},"conversations":{"ekm":{},"restrictAccess":{}},"emoji":{},"inviteRequests":{"approved":{},"denied":{}},"teams":{"admins":{},"owners":{},"settings":{}},"usergroups":{},"users":{"session":{}}},"api":{},"apps":{"connections":{},"event":{"authorizations":{}}},"auth":{"teams":{}},"bots":{},"calls":{"participants":{}},"chat":{"scheduledMessages":{}},"conversations":{},"dialog":{},"dnd":{},"emoji":{},"files":{"comments":{},"remote":{}},"migration":{},"oauth":{"v2":{}},"openid":{"connect":{}},"pins":{},"reactions":{},"reminders":{},"rtm":{},"search":{},"stars":{},"team":{"profile":{}},"usergroups":{"users":{}},"users":{"profile":{}},"views":{},"workflows":{},"channels":{},"groups":{},"im":{},"mpim":{},"token":"xoxb-1313768544068-2288695861075-Uj0YBykPiMz1tyqWsTxlH9P4","slackApiUrl":"https://slack.com/api/","retryConfig":{"retries":10,"factor":1.96821,"randomize":true},"requestQueue":{"_events":{},"_eventsCount":0,"_intervalCount":1,"_intervalEnd":0,"_pendingCount":0,"_carryoverConcurrencyCount":false,"_isIntervalIgnored":true,"_intervalCap":null,"_interval":0,"_queue":{"_queue":[]},"_concurrency":3,"_throwOnTimeout":false,"_isPaused":false},"tlsConfig":{},"rejectRateLimitedCalls":false,"teamId":"T0197NLG020","logger":{"level":"debug","name":"web-api:WebClient:2"}},"logger":{"level":"debug","name":"bolt-app"}}
            logger.debug(`slackEvent: ${JSON.stringify(slackEvent)}`);

            // Acknowledge slack server at once for the 3s requirement.
            await slackEvent.ack();

            const chatToolContext = {
                'context': slackEvent.context,
                'client': slackEvent.client,
                'body': slackEvent.body,
                'payload': slackEvent.payload,
            };

            // Cache the bot Name
            // The bot user real_name is the display name that user configured on the slack app configuration page.
            // This is also the name that you are referring when you @ the bot
            if (this.botName === undefined || this.botName.trim() === '') {
                const botUserInfo = await slackEvent.client.users.info({ user: slackEvent.context.botUserId });
                logger.debug(`Bot user info: ${JSON.stringify(botUserInfo)}`);
                this.botName = botUserInfo.user.real_name;
            }

            // Search the user from cached users.
            // (<Record<string, any>>slackEvent.message).user is the id of the user
            let user = this.getUser((<Record<string, any>>slackEvent.body).user.id); // eslint-disable-line @typescript-eslint/no-explicit-any
            // if user have not been cached, then search from the slack server and cache it
            if (user === undefined ) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const userInfo = await slackEvent.client.users.info({ user: (<Record<string, any>>slackEvent.body).user.id });
                logger.debug(`Cache the user info: ${JSON.stringify(userInfo)}`);
                user = { id: userInfo.user.id, name: userInfo.user.real_name, email: userInfo.user.profile.email };
                this.addUser(userInfo.user.id, user);
            }

            const privateMetaData = JSON.parse(slackEvent.payload.private_metadata);

            // Search the channel from cached channels.
            const channelId = privateMetaData.channelId;
            let channel: IChannel = this.channels.get(channelId);
            // if channel have not been cached, then search from the slack server and cache it.
            if (channel == undefined ) {
                channel = await this.getChannelById(channelId, slackEvent.client);
                this.channels.set(channelId, channel);
            }

            // Get  event
            const event: IEvent = {
                'pluginId': privateMetaData.pluginId,
                'action': {
                    'id': privateMetaData.action.id,
                    'type': IActionType.DIALOG_SUBMIT,
                    'token': privateMetaData.action.token,
                },
            };

            const chatContextData: IChatContextData = {
                'payload': {
                    'type': IPayloadType.EVENT,
                    'data': event,
                },
                'context': {
                    'chatting': {
                        'bot': this.bot,
                        'type': channel.chattingType,
                        'user': {
                            'id': user.id,
                            'name': user.name,
                            'email': user.email,
                        },
                        // View Action doesn't contain the context channel information. Using privateMetaData
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
                    },
                    'chatTool': chatToolContext,
                },
            };

            // Get router
            const router = <SlackRouter> this.bot.geRouter();

            // Call route handler for mouse navigation
            await router.getRoute().handler(chatContextData);
        } catch (err) {
        // Print exception stack
            logger.error(logger.getErrorStack(new Error(err.name), err));
        } finally {
        // Print end log
            logger.end(this.processViewAction, this);
        }
    }

    // Send message back to Slack channel
    async send(chatContextData: IChatContextData, messages: IMessage[]): Promise<void> {
        // Print start log
        logger.start(this.send, this);

        try {
            for (const msg of messages) {
                logger.debug(`msg: ${JSON.stringify(msg, null, 2)}`);
                if (msg.type == IMessageType.SLACK_VIEW_OPEN) {
                    await this.app.client.views.open(msg.message);
                } else if (msg.type == IMessageType.SLACK_VIEW_UPDATE) {
                    await this.app.client.views.update(msg.message);
                } else if (msg.type == IMessageType.PLAIN_TEXT) {
                    await this.app.client.chat.postMessage({
                        'channel': chatContextData.context.chatting.channel.id,
                        'text': msg.message,
                    });
                } else {
                    if (msg.message.text === undefined || msg.message.text === null) {
                        msg.message.text = 'New message from Common bot';
                    }
                    await this.app.client.chat.postMessage(msg.message);
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

    // Get user infos
    getUser(id: string): IUser {
        return this.users.get(id);
    }

    // Add the user
    addUser(id: string, user: IUser): boolean {
        let result: boolean = true;
        if (id === undefined || id.trim() === '') {
            result = false;
            return result;
        }

        this.users.set(id, user);
        result = true;
        return result;
    }

    // get channel by id
    async getChannelById(id: string, slackWebClient: WebClient): Promise<IChannel> {
        logger.start(this.getChannelById);

        try {
            const conversationInfo = await slackWebClient.conversations.info({ channel: id });

            let chattingType: IChattingType = IChattingType.UNKNOWN;
            if (conversationInfo.channel.is_channel == true && conversationInfo.channel.is_mpim == false) {
                chattingType = IChattingType.PUBLIC_CHANNEL;
            } else if (conversationInfo.channel.is_group == true) {
                chattingType = IChattingType.PRIVATE_CHANNEL;
            } else if (conversationInfo.channel.is_im == true) {
                chattingType = IChattingType.PERSONAL;
            } else if (conversationInfo.channel.is_mpim == true) {
                chattingType = IChattingType.GROUP;
            }

            const channel: IChannel = {
                'id': id,
                'name': conversationInfo.channel.name,
                'chattingType': chattingType,
            };

            return channel;
        } catch (err) {
            logger.error(logger.getErrorStack(new Error(err.name), err));
        } finally {
            logger.end(this.getChannelById, this);
        }
    }
}
