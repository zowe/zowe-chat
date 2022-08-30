/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import type { NextFunction } from 'express';
import { IActionType, IChatContextData, IEvent, IPayloadType, IUser, TaskModuleTaskInfo } from '../../types';

import { CardFactory, ChannelInfo, TaskModuleRequest, TaskModuleResponse, TeamsActivityHandler, TeamsInfo, TurnContext } from 'botbuilder';

import { CommonBot } from '../../CommonBot';
import { IChattingType } from '../../types';
import { Logger } from '../../utils/Logger';
import Util = require('../../utils/Util');
import MsteamsListener = require('./MsteamsListener');
import MsteamsRouter = require('./MsteamsRouter');
import MsteamsMiddleware = require('./MsteamsMiddleware');

class BotActivityHandler extends TeamsActivityHandler {
    private bot: CommonBot;
    private middleware: MsteamsMiddleware;
    private serviceUrl: Map<string, string>;
    private channels: ChannelInfo[];
    private users: Map<string, IUser>;
    private logger: Logger;

    constructor(bot: CommonBot, middleware: MsteamsMiddleware) {
        super();

        this.bot = bot;
        this.middleware = middleware;
        this.serviceUrl = new Map<string, string>();
        this.channels = <ChannelInfo[]>[];
        this.users = new Map<string, IUser>();

        // Bing this pointer
        this.processMessage = this.processMessage.bind(this);
        this.updateConversation = this.updateConversation.bind(this);
        this.handleTeamsTaskModuleFetch = this.handleTeamsTaskModuleFetch.bind(this);
        this.handleTeamsTaskModuleSubmit = this.handleTeamsTaskModuleSubmit.bind(this);

        // Monitor message event
        this.onMessage(this.processMessage);

        // Monitor conversation update event to get and cache service URL
        // Reference: 1. https://docs.microsoft.com/en-us/answers/questions/85514/ms-teams-bot-is-serviceurl-bot-specific-or-teamcha.html
        //            2. https://docs.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/subscribe-to-conversation-events?tabs=typescript%2Cdotnet#installation-update-event
        this.onConversationUpdate(this.updateConversation);
    }

    // Process message
    async processMessage(context: TurnContext, next: NextFunction): Promise<void> {
        // Print start log
        this.logger.start(this.processMessage, this);

        try {
            // Remove mentions from message
            TurnContext.removeRecipientMention(context.activity);
            this.logger.debug(`MS Teams context: ${JSON.stringify(context, null, 2)}`);

            // Get conversation reference
            const conversationReference = TurnContext.getConversationReference(context.activity);
            this.logger.debug(`conversationReference: ${JSON.stringify(conversationReference, null, 2)}`);

            // Get chatting type
            const chattingType = this.getChattingType(context.activity.conversation.conversationType);

            if (chattingType == IChattingType.PUBLIC_CHANNEL) {
                this.cacheServiceUrl(context.activity.channelData.channel.id, conversationReference.serviceUrl);
            } else if (chattingType == IChattingType.PERSONAL) {
                this.cacheServiceUrl(context.activity.from.id, conversationReference.serviceUrl);
            } else if (chattingType == IChattingType.GROUP) {
                this.cacheServiceUrl(context.activity.conversation.id, conversationReference.serviceUrl);
            } else {
                this.logger.error(`${IChattingType.UNKNOWN} type, Couldn't cache service Url`);
                return;
            }

            // Cache channel info
            if (context.activity.conversation.conversationType === 'channel') {
                this.channels = await TeamsInfo.getTeamChannels(context);
                this.logger.debug(`Channel info: ${JSON.stringify(this.channels, null, 2)}`);
            }

            // Get mentioned bot name
            const mentionedBotName = `@${context.activity.recipient.name}`;

            // Search the user from cached users.
            let user = this.getUser(context.activity.from.id);
            // if user have not been cached, then search from the msteams server and cache it
            if (user === undefined) {
                const userProfile = await TeamsInfo.getMember(context, context.activity.from.id);
                this.logger.debug(`Cache the user info: ${JSON.stringify(userProfile, null, 2)}`);
                user = { id: context.activity.from.id, name: context.activity.from.name, email: userProfile.email };
                this.addUser(context.activity.from.id, user);
            }
            // Create chat context data
            // Activity data for the conversation: channel
            //     {"_respondedRef":{"responded":false},"_turnState":{},"_onSendActivities":[],"_onUpdateActivity":[],"_onDeleteActivity":[],"_turnLocale":"turn.locale","bufferedReplyActivities":[],"_adapter":{"middleware":{"middleware":[null]},"settings":{"appId":"c52ee95f-973d-41fd-bb78-27c75a2b1be4","appPassword":"~2dLk-CJtB09a9E.8sE_.Tx.Scm.LB-6J4"},"credentials":{"refreshingToken":null,"appId":"c52ee95f-973d-41fd-bb78-27c75a2b1be4","_tenant":"botframework.com","_oAuthEndpoint":"https://login.microsoftonline.com/botframework.com","authenticationContext":{"_authority":{"_log":null,"_url":{"protocol":"https:","slashes":true,"auth":null,"host":"login.microsoftonline.com","port":null,"hostname":"login.microsoftonline.com","hash":null,"search":null,"query":null,"pathname":"/botframework.com","path":"/botframework.com","href":"https://login.microsoftonline.com/botframework.com"},"_validated":false,"_host":"login.microsoftonline.com","_tenant":"botframework.com","_authorizationEndpoint":null,"_tokenEndpoint":null,"_deviceCodeEndpoint":null,"_isAdfsAuthority":false,"aadApiVersion":"1.5"},"_oauth2client":null,"_correlationId":null,"_callContext":{"options":{}},"_cache":{"_entries":[]},"_tokenRequestWithUserCode":{}},"_oAuthScope":"https://api.botframework.com","tokenCacheKey":"c52ee95f-973d-41fd-bb78-27c75a2b1be4https://api.botframework.com-cache","appPassword":"~2dLk-CJtB09a9E.8sE_.Tx.Scm.LB-6J4"},"credentialsProvider":{"appId":"c52ee95f-973d-41fd-bb78-27c75a2b1be4","appPassword":"~2dLk-CJtB09a9E.8sE_.Tx.Scm.LB-6J4"},"isEmulatingOAuthCards":false,"authConfiguration":{"requiredEndorsements":[]}},"_activity":{"text":"help","textFormat":"plain","attachments":[{"contentType":"text/html","content":"<div><div><span itemscope=\"\" itemtype=\"http://schema.skype.com/Mention\" itemid=\"0\">bnzInstallerBotFramework</span> help</div>\n</div>"}],"type":"message","timestamp":"2021-04-23T10:30:09.091Z","localTimestamp":"2021-04-23T10:30:09.091Z","id":"1619173809051","channelId":"msteams","serviceUrl":"https://smba.trafficmanager.net/apac/","from":{"id":"29:1f2lyw-FGvjq0sx4fIWrlyvcHLro1ZfGZq4fmu0l9cJcgvWHn-7D_JLomX8k7OXjPhY924xB8cVVlVMPNFonTmg","name":"Holly Xie","aadObjectId":"975bf953-08aa-4a92-82f9-3e7ee31bdf32"},"conversation":{"isGroup":true,"conversationType":"channel","tenantId":"d137f805-5cc7-4587-b61b-77989483a8a4","id":"19:c6cac3b2e9584446bf5c8e8db068bdf0@thread.tacv2;messageid=1619162510089"},"recipient":{"id":"28:c52ee95f-973d-41fd-bb78-27c75a2b1be4","name":"bnzInstallerBF"},"entities":[{"mentioned":{"id":"28:c52ee95f-973d-41fd-bb78-27c75a2b1be4","name":"bnzInstallerBotFramework"},"text":"<at>bnzInstallerBotFramework</at>","type":"mention"},{"locale":"en-US","country":"US","platform":"Mac","timezone":"Asia/Shanghai","type":"clientInfo"}],"channelData":{"teamsChannelId":"19:c6cac3b2e9584446bf5c8e8db068bdf0@thread.tacv2","teamsTeamId":"19:8cfb4238b2f14bad92dfd4089eebe4e3@thread.tacv2","channel":{"id":"19:c6cac3b2e9584446bf5c8e8db068bdf0@thread.tacv2"},"team":{"id":"19:8cfb4238b2f14bad92dfd4089eebe4e3@thread.tacv2"},"tenant":{"id":"d137f805-5cc7-4587-b61b-77989483a8a4"}},"locale":"en-US","localTimezone":"Asia/Shanghai","rawTimestamp":"2021-04-23T10:30:09.0919082Z","rawLocalTimestamp":"2021-04-23T18:30:09.0919082+08:00","callerId":"urn:botframework:azure"}}
            //
            // Activity data for the conversation: groupChat
            //     {"_respondedRef":{"responded":false},"_turnState":{},"_onSendActivities":[],"_onUpdateActivity":[],"_onDeleteActivity":[],"_turnLocale":"turn.locale","bufferedReplyActivities":[],"_adapter":{"middleware":{"middleware":[null]},"settings":{"appId":"c52ee95f-973d-41fd-bb78-27c75a2b1be4","appPassword":"~2dLk-CJtB09a9E.8sE_.Tx.Scm.LB-6J4"},"credentials":{"refreshingToken":null,"appId":"c52ee95f-973d-41fd-bb78-27c75a2b1be4","_tenant":"botframework.com","_oAuthEndpoint":"https://login.microsoftonline.com/botframework.com","authenticationContext":{"_authority":{"_log":null,"_url":{"protocol":"https:","slashes":true,"auth":null,"host":"login.microsoftonline.com","port":null,"hostname":"login.microsoftonline.com","hash":null,"search":null,"query":null,"pathname":"/botframework.com","path":"/botframework.com","href":"https://login.microsoftonline.com/botframework.com"},"_validated":false,"_host":"login.microsoftonline.com","_tenant":"botframework.com","_authorizationEndpoint":null,"_tokenEndpoint":null,"_deviceCodeEndpoint":null,"_isAdfsAuthority":false,"aadApiVersion":"1.5"},"_oauth2client":null,"_correlationId":null,"_callContext":{"options":{}},"_cache":{"_entries":[]},"_tokenRequestWithUserCode":{}},"_oAuthScope":"https://api.botframework.com","tokenCacheKey":"c52ee95f-973d-41fd-bb78-27c75a2b1be4https://api.botframework.com-cache","appPassword":"~2dLk-CJtB09a9E.8sE_.Tx.Scm.LB-6J4"},"credentialsProvider":{"appId":"c52ee95f-973d-41fd-bb78-27c75a2b1be4","appPassword":"~2dLk-CJtB09a9E.8sE_.Tx.Scm.LB-6J4"},"isEmulatingOAuthCards":false,"authConfiguration":{"requiredEndorsements":[]}},"_activity":{"text":"help","textFormat":"plain","attachments":[{"contentType":"text/html","content":"<div><div><span itemscope=\"\" itemtype=\"http://schema.skype.com/Mention\" itemid=\"0\">bnzInstallerBotFramework</span> help</div>\n</div>"}],"type":"message","timestamp":"2021-04-23T10:28:50.580Z","localTimestamp":"2021-04-23T10:28:50.580Z","id":"1619173730495","channelId":"msteams","serviceUrl":"https://smba.trafficmanager.net/apac/","from":{"id":"29:1f2lyw-FGvjq0sx4fIWrlyvcHLro1ZfGZq4fmu0l9cJcgvWHn-7D_JLomX8k7OXjPhY924xB8cVVlVMPNFonTmg","name":"Holly Xie","aadObjectId":"975bf953-08aa-4a92-82f9-3e7ee31bdf32"},"conversation":{"isGroup":true,"conversationType":"groupChat","tenantId":"d137f805-5cc7-4587-b61b-77989483a8a4","id":"19:975bf953-08aa-4a92-82f9-3e7ee31bdf32_f10e1b44-fc17-4ede-8f5d-513b376e48cc@unq.gbl.spaces"},"recipient":{"id":"28:c52ee95f-973d-41fd-bb78-27c75a2b1be4","name":"bnzInstallerBF"},"entities":[{"mentioned":{"id":"28:c52ee95f-973d-41fd-bb78-27c75a2b1be4","name":"bnzInstallerBotFramework"},"text":"<at>bnzInstallerBotFramework</at>","type":"mention"},{"locale":"en-US","country":"US","platform":"Mac","timezone":"Asia/Shanghai","type":"clientInfo"}],"channelData":{"tenant":{"id":"d137f805-5cc7-4587-b61b-77989483a8a4"}},"locale":"en-US","localTimezone":"Asia/Shanghai","rawTimestamp":"2021-04-23T10:28:50.5805592Z","rawLocalTimestamp":"2021-04-23T18:28:50.5805592+08:00","callerId":"urn:botframework:azure"}}
            //
            // Activity data for the conversation: personal
            //    {"_respondedRef":{"responded":false},"_turnState":{},"_onSendActivities":[],"_onUpdateActivity":[],"_onDeleteActivity":[],"_turnLocale":"turn.locale","bufferedReplyActivities":[],"_adapter":{"middleware":{"middleware":[null]},"settings":{"appId":"c52ee95f-973d-41fd-bb78-27c75a2b1be4","appPassword":"~2dLk-CJtB09a9E.8sE_.Tx.Scm.LB-6J4"},"credentials":{"refreshingToken":null,"appId":"c52ee95f-973d-41fd-bb78-27c75a2b1be4","_tenant":"botframework.com","_oAuthEndpoint":"https://login.microsoftonline.com/botframework.com","authenticationContext":{"_authority":{"_log":null,"_url":{"protocol":"https:","slashes":true,"auth":null,"host":"login.microsoftonline.com","port":null,"hostname":"login.microsoftonline.com","hash":null,"search":null,"query":null,"pathname":"/botframework.com","path":"/botframework.com","href":"https://login.microsoftonline.com/botframework.com"},"_validated":false,"_host":"login.microsoftonline.com","_tenant":"botframework.com","_authorizationEndpoint":null,"_tokenEndpoint":null,"_deviceCodeEndpoint":null,"_isAdfsAuthority":false,"aadApiVersion":"1.5"},"_oauth2client":null,"_correlationId":null,"_callContext":{"options":{}},"_cache":{"_entries":[]},"_tokenRequestWithUserCode":{}},"_oAuthScope":"https://api.botframework.com","tokenCacheKey":"c52ee95f-973d-41fd-bb78-27c75a2b1be4https://api.botframework.com-cache","appPassword":"~2dLk-CJtB09a9E.8sE_.Tx.Scm.LB-6J4"},"credentialsProvider":{"appId":"c52ee95f-973d-41fd-bb78-27c75a2b1be4","appPassword":"~2dLk-CJtB09a9E.8sE_.Tx.Scm.LB-6J4"},"isEmulatingOAuthCards":false,"authConfiguration":{"requiredEndorsements":[]}},"_activity":{"text":"help","textFormat":"plain","type":"message","timestamp":"2021-04-23T10:27:58.575Z","localTimestamp":"2021-04-23T10:27:58.575Z","id":"1619173678555","channelId":"msteams","serviceUrl":"https://smba.trafficmanager.net/apac/","from":{"id":"29:1f2lyw-FGvjq0sx4fIWrlyvcHLro1ZfGZq4fmu0l9cJcgvWHn-7D_JLomX8k7OXjPhY924xB8cVVlVMPNFonTmg","name":"Holly Xie","aadObjectId":"975bf953-08aa-4a92-82f9-3e7ee31bdf32"},"conversation":{"conversationType":"personal","tenantId":"d137f805-5cc7-4587-b61b-77989483a8a4","id":"a:1lX9QFPvasppDbDEEeoF23u21gVv462i7RNdeBieoWVLpLLprZiox7274yVMq-PkX3HQkzQBv6ZG8jNg6mIHLye1JWcA_RaQ46chX-Rk8JdyVXz_8Wzet4WlQV41T4azo"},"recipient":{"id":"28:c52ee95f-973d-41fd-bb78-27c75a2b1be4","name":"bnzInstallerBF"},"entities":[{"locale":"en-US","country":"US","platform":"Mac","timezone":"Asia/Shanghai","type":"clientInfo"}],"channelData":{"tenant":{"id":"d137f805-5cc7-4587-b61b-77989483a8a4"}},"locale":"en-US","localTimezone":"Asia/Shanghai","rawTimestamp":"2021-04-23T10:27:58.5755942Z","rawLocalTimestamp":"2021-04-23T18:27:58.5755942+08:00","callerId":"urn:botframework:azure"}}
            const chatContextData: IChatContextData = {
                'payload': {
                    'type': IPayloadType.MESSAGE,
                    'data': `${mentionedBotName} ${context.activity.text}`,
                },
                'context': {
                    'chatting': {
                        'bot': this.bot,
                        'type': chattingType,
                        'user': {
                            'id': user.id,
                            'name': user.name,
                            'email': user.email,
                        },
                        'channel': {
                            'id': (context.activity.channelData.channel ? context.activity.channelData.channel.id : ''),
                            'name': '',
                        },
                        'team': {
                            'id': (context.activity.channelData.team ? context.activity.channelData.team.id : ''),
                            'name': '',
                        },
                        'tenant': {
                            'id': context.activity.channelData.tenant.id,
                            'name': '',
                        },
                    },
                    'chatTool': {
                        'context': context,
                    },
                },
            };
            this.logger.debug(`Chat context data sent to chat bot: ${Util.dumpObject(chatContextData, 2)}`);

            // Only value field can be used to check where the message come from: mouse clicking or user input
            // Reference: https://blog.botframework.com/2019/07/02/using-adaptive-cards-with-the-microsoft-bot-framework/
            //            Because an object submit action generates an activity of type message, you will need a way to distinguish such an activity from an
            //            ordinary text-based message activity like the kind that gets sent when the user types something into the chat client. In most cases
            //            it’s enough to recognize an object submit action’s activity by checking if the value property is populated and the text property
            //            isn’t. If necessary, you can perform additional checks by seeing if the data inside the value object meets your expectations. However,
            //            there is usually no way for a bot to distinguish between a message from a string submit action and a message that the user typed into
            //            the chat client. This is by design because those messages should be treated the same way.
            // Chat tool context for @mentioned message:
            //     {
            //     "text": "ad list",
            //     "textFormat": "plain",
            //     "attachments": [
            //         {
            //         "contentType": "text/html",
            //         "content": "<div><div><span itemscope=\"\" itemtype=\"http://schema.skype.com/Mention\" itemid=\"0\">bnzdev01</span> ad list</div>\n</div>"
            //         }
            //     ],
            //     "type": "message",
            //     "timestamp": "2021-04-20T06:18:06.980Z",
            //     "localTimestamp": "2021-04-20T06:18:06.980Z",
            //     "id": "1618899486955",
            //     "channelId": "msteams",
            //     "serviceUrl": "https://smba.trafficmanager.net/apac/",
            //     "from": {
            //         "id": "29:1RoUpTBW4Q-441hdtOBvbTym5ma0kYoPLdnN4SgLJVTrmuWCYSUbwYr_rkSkJJ39pTDLMtHkrn2kX2QdshmXCHg",
            //         "name": "Fang Wu Song",
            //         "aadObjectId": "6e4c7435-07e0-425f-b01f-8f1b3cfa2aa0"
            //     },
            //     "conversation": {
            //         "isGroup": true,
            //         "conversationType": "channel",
            //         "tenantId": "d137f805-5cc7-4587-b61b-77989483a8a4",
            //         "id": "19:717bf14878ba49c586d2368bd79a1d60@thread.tacv2;messageid=1618822283261"
            //     },
            //     "recipient": {
            //         "id": "28:8cd2d3dd-d9af-4b8c-a3f6-9ec56a62c5e5",
            //         "name": "Toolkit Bot - bnzdev01"
            //     },
            //     "entities": [
            //         {
            //         "mentioned": {
            //             "id": "28:8cd2d3dd-d9af-4b8c-a3f6-9ec56a62c5e5",
            //             "name": "bnzdev01"
            //         },
            //         "text": "<at>bnzdev01</at>",
            //         "type": "mention"
            //         },
            //         {
            //         "locale": "en-US",
            //         "country": "US",
            //         "platform": "Mac",
            //         "timezone": "Asia/Shanghai",
            //         "type": "clientInfo"
            //         }
            //     ],
            //     "channelData": {
            //         "teamsChannelId": "19:717bf14878ba49c586d2368bd79a1d60@thread.tacv2",
            //         "teamsTeamId": "19:8cfb4238b2f14bad92dfd4089eebe4e3@thread.tacv2",
            //         "channel": {
            //         "id": "19:717bf14878ba49c586d2368bd79a1d60@thread.tacv2"
            //         },
            //         "team": {
            //         "id": "19:8cfb4238b2f14bad92dfd4089eebe4e3@thread.tacv2"
            //         },
            //         "tenant": {
            //         "id": "d137f805-5cc7-4587-b61b-77989483a8a4"
            //         }
            //     },
            //     "locale": "en-US",
            //     "localTimezone": "Asia/Shanghai",
            //     "rawTimestamp": "2021-04-20T06:18:06.9800157Z",
            //     "rawLocalTimestamp": "2021-04-20T14:18:06.9800157+08:00",
            //     "callerId": "urn:botframework:azure"
            //     }
            // Chat tool context for mouse navigation:
            //     {
            //     "type": "message",
            //     "timestamp": "2021-04-20T06:18:25.969Z",
            //     "localTimestamp": "2021-04-20T06:18:25.969Z",
            //     "id": "f:f9f7fcfe-bc30-21bf-ffbf-cf3844e75c91",
            //     "channelId": "msteams",
            //     "serviceUrl": "https://smba.trafficmanager.net/apac/",
            //     "from": {
            //         "id": "29:1RoUpTBW4Q-441hdtOBvbTym5ma0kYoPLdnN4SgLJVTrmuWCYSUbwYr_rkSkJJ39pTDLMtHkrn2kX2QdshmXCHg",
            //         "name": "Fang Wu Song",
            //         "aadObjectId": "6e4c7435-07e0-425f-b01f-8f1b3cfa2aa0"
            //     },
            //     "conversation": {
            //         "isGroup": true,
            //         "conversationType": "channel",
            //         "tenantId": "d137f805-5cc7-4587-b61b-77989483a8a4",
            //         "id": "19:717bf14878ba49c586d2368bd79a1d60@thread.tacv2;messageid=1618822283261",
            //         "name": "bnzdev01-fws"
            //     },
            //     "recipient": {
            //         "id": "28:8cd2d3dd-d9af-4b8c-a3f6-9ec56a62c5e5",
            //         "name": "Toolkit Bot - bnzdev01"
            //     },
            //     "entities": [
            //         {
            //         "locale": "en-US",
            //         "country": "US",
            //         "platform": "Mac",
            //         "timezone": "Asia/Shanghai",
            //         "type": "clientInfo"
            //         }
            //     ],
            //     "channelData": {
            //         "channel": {
            //         "id": "19:717bf14878ba49c586d2368bd79a1d60@thread.tacv2"
            //         },
            //         "team": {
            //         "id": "19:8cfb4238b2f14bad92dfd4089eebe4e3@thread.tacv2"
            //         },
            //         "tenant": {
            //         "id": "d137f805-5cc7-4587-b61b-77989483a8a4"
            //         },
            //         "source": {
            //         "name": "message"
            //         },
            //         "legacy": {
            //         "replyToId": "1:1019k05x8pEfuIaZVwhm_FATNnMGQyBEZ1VsPlclcjcw"
            //         }
            //     },
            //     "replyToId": "1618899491553",
            //     "value": {
            //         "controlId": "show_systems",
            //         "token": "63I/CokYpUm+p9MuUb+gO2r/kwrivg+yHrykqYw040gQqun+Zze1IwQItsTBGYIYH4C0l0VocAJWMDS6yxeOFQ==",
            //         "show_systems": "f02::dn=SAM1PLEX INGXSGX1"
            //     },
            //     "locale": "en-US",
            //     "localTimezone": "Asia/Shanghai",
            //     "rawTimestamp": "2021-04-20T06:18:25.969Z",
            //     "rawLocalTimestamp": "2021-04-20T14:18:25.969+08:00",
            //     "callerId": "urn:botframework:azure"
            //     }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (context.activity.value !== undefined && context.activity.text === undefined) { // From mouse clicking
                // Get  event
                const event: IEvent = {
                    'pluginId': context.activity.value.pluginId,
                    'action': {
                        'id': context.activity.value.action.id,
                        'type': IActionType.BUTTON_CLICK,
                        'token': context.activity.value.action.token,
                    },
                };
                if (context.activity.value.action.type !== undefined) {
                    event.action.type = context.activity.value.action.type;
                } else {
                    if (context.activity.value.action.id.startsWith('DIALOG_OPEN_')) {
                        event.action.type = IActionType.DIALOG_OPEN;
                    } else {
                        event.action.type = IActionType.BUTTON_CLICK;
                    }
                }

                // Update payload
                chatContextData.payload.type = IPayloadType.EVENT;
                chatContextData.payload.data = event;

                // Get router
                const router = <MsteamsRouter>this.bot.geRouter();

                // Call route handler for mouse navigation
                await router.getRoute().handler(chatContextData);
            } else { // From user input
                // Get listeners
                const listeners = <MsteamsListener[]>this.bot.getListeners();

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
            }

            await next();
        } catch (err) {
            // Print exception stack
            this.logger.error(this.logger.getErrorStack(new Error(err.name), err));
        } finally {
            // Print end log
            this.logger.end(this.processMessage, this);
        }
    }

    // Update conversation
    async updateConversation(context: TurnContext, next: NextFunction): Promise<void> {
        // Print start log
        this.logger.start(this.updateConversation, this);

        try {
            // Get conversation reference
            const conversationReference = TurnContext.getConversationReference(context.activity);

            // Cache service URL
            this.cacheServiceUrl(conversationReference.channelId, conversationReference.serviceUrl);

            // Cache channel info
            this.channels = await TeamsInfo.getTeamChannels(context);
            this.logger.debug(`Channel info: ${JSON.stringify(this.channels, null, 2)}`);

            await next();
        } catch (err) {
            // Print exception stack
            this.logger.error(this.logger.getErrorStack(new Error(err.name), err));
        } finally {
            // Print end log
            this.logger.end(this.updateConversation, this);
        }
    }

    // Cache service url
    // Id might be channelId or userId or conversationId
    private cacheServiceUrl(id: string, serviceUrl: string): void {
        this.logger.info(`Caching the service URL "${serviceUrl}" for id "${id}"`);
        if (this.serviceUrl.has(id)) {
            if (this.serviceUrl.get(id) !== serviceUrl) {
                this.serviceUrl.set(id, serviceUrl);
            }
        } else {
            this.serviceUrl.set(id, serviceUrl);
        }
        this.logger.debug(`MS Teams cached service URLs:`);
        this.serviceUrl.forEach((value, key) => (this.logger.debug(`${key} : ${value}`)));

        return;
    }

    // Implement the handleTeamsTaskModuleFetch function to handle 'task/fetch'
    async handleTeamsTaskModuleFetch(context: TurnContext, taskModuleRequest: TaskModuleRequest): Promise<TaskModuleResponse> {
        // Print start log
        this.logger.start(this.handleTeamsTaskModuleFetch, this);

        try {
            // Called when the user selects an options from the displayed HeroCard or
            // AdaptiveCard.  The result is the action(task module) to perform.
            this.logger.debug(`MS Teams task/fetch event context: ${JSON.stringify(context, null, 2)}`);

            // Search the user from cached users.
            let user = this.getUser(context.activity.from.id);
            // if user have not been cached, then search from the msteams server and cache it
            if (user === undefined) {
                const userProfile = await TeamsInfo.getMember(context, context.activity.from.id);
                this.logger.debug(`Cache the user info: ${JSON.stringify(userProfile, null, 2)}`);
                user = { id: context.activity.from.id, name: context.activity.from.name, email: userProfile.email };
                this.addUser(context.activity.from.id, user);
            }

            // Get chatting type
            const chattingType = this.getChattingType(context.activity.conversation.conversationType);
            this.logger.debug(`chattingType: ${chattingType}`);

            // Get  event
            const event: IEvent = {
                'pluginId': context.activity.value.data.pluginId,
                'action': {
                    'id': context.activity.value.data.action.id,
                    'type': IActionType.DIALOG_OPEN,
                    'token': context.activity.value.data.action.token,
                },
            };

            // Create chat context data
            const chatContextData: IChatContextData = {
                'payload': {
                    'type': IPayloadType.EVENT,
                    'data': event,
                },
                'context': {
                    'chatting': {
                        'bot': this.bot,
                        'type': chattingType,
                        'user': {
                            'id': user.id,
                            'name': user.name,
                            'email': user.email,
                        },
                        'channel': {
                            'id': (context.activity.channelData.channel ? context.activity.channelData.channel.id : ''),
                            'name': '',
                        },
                        'team': {
                            'id': (context.activity.channelData.team ? context.activity.channelData.team.id : ''),
                            'name': '',
                        },
                        'tenant': {
                            'id': context.activity.channelData.tenant.id,
                            'name': '',
                        },
                    },
                    'chatTool': {
                        'actionType': 'taskFetch',
                        'context': context,
                        'data': taskModuleRequest.data,
                    },
                },
            };

            // Get router
            const router = <MsteamsRouter>this.bot.geRouter();
            // Call route handler for mouse navigation
            const chatOpsTaskInfo: TaskModuleTaskInfo = <TaskModuleTaskInfo>await router.getRoute().handler(chatContextData);

            // The adaptive card doesn't adapt the theme mode of the MS Teams, and sometimes the display is not good
            // https://techcommunity.microsoft.com/t5/teams-developer/ms-teams-dark-mode-task-with-adaptive-card-wrong-colors/m-p/2837861#M4032
            if (chatOpsTaskInfo.card !== undefined) {
                chatOpsTaskInfo.card = CardFactory.adaptiveCard(chatOpsTaskInfo.card);
            }

            return {
                task: {
                    type: 'continue',
                    value: <TaskModuleTaskInfo>chatOpsTaskInfo,
                },
            };
        } catch (err) {
            // Print exception stack
            this.logger.error(this.logger.getErrorStack(new Error(err.name), err));
        } finally {
            // Print end log
            this.logger.end(this.handleTeamsTaskModuleFetch, this);
        }
    }

    // Implement the handleTeamsTaskModuleFetch function to handle 'task/submit'
    async handleTeamsTaskModuleSubmit(context: TurnContext, taskModuleRequest: TaskModuleRequest): Promise<TaskModuleResponse> {
        // Called when data is being returned from the selected option (see `handleTeamsTaskModuleFetch').
        this.logger.start(this.handleTeamsTaskModuleSubmit, this);

        try {
            this.logger.debug(`MS Teams task/submit event context: ${JSON.stringify(context, null, 2)}`);

            // Search the user from cached users.
            let user = this.getUser(context.activity.from.id);
            // if user have not been cached, then search from the msteams server and cache it
            if (user === undefined) {
                const userProfile = await TeamsInfo.getMember(context, context.activity.from.id);
                this.logger.debug(`Cache the user info: ${JSON.stringify(userProfile, null, 2)}`);
                user = { id: context.activity.from.id, name: context.activity.from.name, email: userProfile.email };
                this.addUser(context.activity.from.id, user);
            }

            // Get chatting type
            const chattingType = this.getChattingType(context.activity.conversation.conversationType);
            this.logger.debug(`chattingType: ${chattingType}`);

            // Get  event
            const event: IEvent = {
                'pluginId': context.activity.value.data.pluginId,
                'action': {
                    'id': context.activity.value.data.actionId,
                    'type': IActionType.DIALOG_SUBMIT,
                    'token': context.activity.value.data.token,
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
                        'type': chattingType,
                        'user': {
                            'id': user.id,
                            'name': user.name,
                            'email': user.email,
                        },
                        'channel': {
                            'id': (context.activity.channelData.channel ? context.activity.channelData.channel.id : ''),
                            'name': '',
                        },
                        'team': {
                            'id': (context.activity.channelData.team ? context.activity.channelData.team.id : ''),
                            'name': '',
                        },
                        'tenant': {
                            'id': context.activity.channelData.tenant.id,
                            'name': '',
                        },
                    },
                    'chatTool': {
                        'actionType': 'taskSubmit',
                        'context': context,
                        'data': taskModuleRequest.data,
                    },
                },
            };

            // Get router
            const router = <MsteamsRouter>this.bot.geRouter();
            // Call router handler for mouse navigation
            const taskInfo: TaskModuleTaskInfo = <TaskModuleTaskInfo>await router.getRoute().handler(chatContextData);

            if (taskInfo !== null && taskInfo !== undefined) {
                return {
                    task: {
                        type: 'continue',
                        value: taskInfo,
                    },
                };
            }
        } catch (err) {
            // Print exception stack
            this.logger.error(this.logger.getErrorStack(new Error(err.name), err));
        } finally {
            // Print end log
            this.logger.end(this.handleTeamsTaskModuleSubmit, this);
        }
    }

    // Get service URL
    getServiceUrl(): Map<string, string> {
        return this.serviceUrl;
    }

    // Find service URL
    findServiceUrl(channelId: string): string {
        if (this.serviceUrl.has(channelId)) {
            return this.serviceUrl.get(channelId);
        } else {
            return '';
        }
    }

    // Get channel
    getChannel(): ChannelInfo[] {
        return this.channels;
    }

    // Find channel by name
    findChannelByName(name: string): ChannelInfo {
        let channel = null;
        for (const element of this.channels) {
            if (element.name === name) {
                channel = element;
                break;
            }
        }

        return channel;
    }

    // Find channel by id
    findChannelById(id: string): ChannelInfo {
        let channel = null;
        for (const element of this.channels) {
            if (element.id === id) {
                channel = element;
                break;
            }
        }

        return channel;
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

    // Get commonBot chatting type
    getChattingType(type: string): IChattingType {
        let chattingType: IChattingType = IChattingType.UNKNOWN;

        if (type === 'channel') {
            chattingType = IChattingType.PUBLIC_CHANNEL;
        } else if (type === 'personal') {
            chattingType = IChattingType.PERSONAL;
        } else if (type === 'groupChat') {
            chattingType = IChattingType.GROUP;
        } else {
            chattingType = IChattingType.UNKNOWN;
        }
        return chattingType;
    }
}

export = BotActivityHandler;
