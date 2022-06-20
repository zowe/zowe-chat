/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */


import type {Application} from 'express';
import type {Receiver} from '@slack/bolt';
import CommonBot from '../CommonBot';

export {TaskModuleTaskInfo, Attachment} from 'botbuilder';


/* eslint-disable no-unused-vars */
export const enum IProtocol {
    HTTP = 'http',
    HTTPS = 'https',
    WS = 'ws',
    WSS = 'wss',
}

export const enum ILogLevel {
    ERROR = 'error',
    WARN = 'warn',
    INFO = 'info',
    VERBOSE = 'verbose',
    DEBUG = 'debug',
    SILLY = 'silly'
}

export const enum IChatToolType {
    MATTERMOST = 'mattermost',
    SLACK = 'slack',
    MSTEAMS = 'msteams',
    DUMMY = 'dummy'
}

export const enum IMessageType {
    PLAIN_TEXT = 'plainText',

    MATTERMOST_ATTACHMENT = 'mattermost.attachment',
    MATTERMOST_DIALOG_OPENING = 'mattermost.dialog.opening',

    SLACK_BLOCK = 'slack.block',
    SLACK_VIEW = 'slack.view',
    SLACK_VIEW_UPDATE = 'slack.viewUpdate',

    MSTEAMS_ADAPTIVE_CARD = 'msteams.adaptiveCard',
}

export const enum IChattingType {
    PERSONAL = 'personal', // 1 on 1 chatting
    PUBLIC_CHANNEL = 'publicChannel', //
    PRIVATE_CHANNEL = 'privateChannel',
    GROUP = 'group', // Group chatting
    UNKNOWN = 'unknown',
}

export interface IMessage {
    type: IMessageType,
    message: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    mentions?: Record<string, any>[], // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface IBotOption {
    messagingApp: IMessagingApp,
    chatTool: IChatTool
}

export interface ILogOption {
    filePath: string,
    level: ILogLevel,
    maximumSize: string,
    maximumFiles: string
}

export interface IAppOption extends IHttpEndpoint {
    tlsKey: string,
    tlsCert: string
}

export interface IHttpEndpoint {
    protocol: IProtocol,
    hostName: string,
    port: number,
    basePath: string
}

export interface IMessagingApp {
    option: IAppOption,
    app: Application
}

export interface IChatTool {
    type: IChatToolType,
    option: IMattermostOption | ISlackOption | IMsteamsOption
}

// # Mattermost Variable         Required  Description
// # MATTERMOST_HOST             Yes       The Mattermost host e.g. mm.yourcompany.com
// # MATTERMOST_GROUP            Yes       The team/group on your Mattermost server e.g. core
// # MATTERMOST_USER             No        The Mattermost user account name e.g. hubot@yourcompany.com
// # MATTERMOST_PASSWORD         No        The password of the user e.g. s3cr3tP@ssw0rd!
// # MATTERMOST_ACCESS_TOKEN     No        The personal access token of the user
// # MATTERMOST_WSS_PORT         No        Overrides the default port 443 for websocket (wss://) connections
// # MATTERMOST_HTTP_PORT        No        Overrides the default port (80 or 443) for http:// or https:// connections
// # MATTERMOST_TLS_VERIFY       No        (default: true) set to 'false' to allow connections when certs can not be verified
//                                         (ex: self-signed, internal CA, ... - MITM risks)
// # MATTERMOST_USE_TLS          No        (default: true) set to 'false' to switch to http/ws protocols
// # MATTERMOST_LOG_LEVEL        No        (default: info) set log level (also: debug, ...)
// # MATTERMOST_REPLY            No        (default: true) set to 'false' to stop posting reply responses as comments
// # MATTERMOST_IGNORE_USERS     No        (default: empty) Enter a comma-separated list of 1
export interface IMattermostOption {
    protocol: IProtocol,
    hostName: string,
    port: number,
    basePath: string,
    tlsCertificate: string,
    teamUrl: string,
    botUserName: string,
    botAccessToken: string,
    // integrationEndpoint: IHttpEndpoint,
}

// Option to create Slack chatbot
// Doc: https://slack.dev/bolt-js/reference#initialization-options
export interface ISlackOption {
    botUserName: string,

    // A string from your app’s configuration (under “Basic Information”) which verifies that incoming events are coming from Slack
    signingSecret: string,

    // A string or object that specifies the endpoint(s) that the receiver will listen for incoming requests from Slack.
    // Required when your app connects and receives data from Slack via a HTTP endpoint connection.
    endpoints: string | Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any

    // Determine whether events should be immediately acknowledged. Defaults to false.
    // processBeforeResponse: boolean,

    // The client ID string from your app’s configuration which is required to configure OAuth.
    // clientId: string,

    // The client secret string from your app’s configuration which is required to configure OAuth.
    // clientSecret: string,

    // Recommended parameter (string) that’s passed when configuring OAuth to prevent CSRF attacks
    // stateSecret: string,

    // Defines how to save, fetch and delete installation data when configuring OAuth. The default installationStore is an in-memory store.
    // installationStore: string

    // Array of scopes that your app will request within the OAuth process.
    // scopes: string[],

        // Optional object that can be used to customize the default OAuth support. Read more in the OAuth documentation.
    // installerOptions: Record<string, any>,


    // An instance of Receiver that parses and handles incoming events.
    receiver: Receiver,

    // Optional HTTP Agent used to set up proxy support.
    // agent: string,

    // Optional string to set a custom TLS configuration for HTTP client requests. Must be one of: "pfx", "key", "passphrase", "cert", or "ca".
    // clientTls: string,

    // A store to set and retrieve state-related conversation information. By default, apps have access to an in-memory store.
    // convoStore: string,

    // A string from your app’s configuration (under “Settings” > “Install App”) required for calling the Web API.
    // May not be passed when using authorize, orgAuthorize, or OAuth.
    token: string,

    // Can only be used when authorize is not defined. The optional botId is the ID for your bot token (ex: B12345) which can be used to ignore messages
    // sent by your app. If a xoxb- token is passed to your app, this value will automatically be retrieved by your app calling the auth.test method.
    // botId: string,

    // Can only be used wihen authorize is not defined. The optional botUserId is distinct from the botId, as it’s the user ID associated with your bot user
    // used to identify direct mentions. If a xoxb- token is passed to your app, this value will automatically be retrieved by your app calling the auth.
    // test method.
    // botUserId: string,

    // Function for multi-team installations that determines which token is associated with the incoming event.
    // authorize: string,

    // Option that allows you to pass a custom logger rather than using the built-in one.
    // logger: string,

    // control how much or what kind of information is logged
    // Supported values: DEBUG, INFO, WARN, and ERROR. By default, logLevel is set to INFO.
    logLevel: string,

    // When set to true, the global error handler is passed an object with additional request context. Available from version 3.8.0, defaults to false
    // extendedErrorHandler: boolean,

    // Enable a middleware function that ignores any messages coming from your app. Requires a botId. Defaults to true.
    // ignoreSelf: boolean,

    // Allows setting a custom endpoint for the Slack API. Used most often for testing.
    // clientOptions.slackApiUrl: string,

    // Enable Socket Mode to allow your app to connect and receive data from Slack via a WebSocket connection.
    // Defaults to false.
    socketMode: boolean,

    // Activate the developer mode. Defaults to false.
    // developerMode: boolean,

    // Required when Socket Mode is enabled
    // Doc: https://slack.dev/bolt-js/concepts#socket-mode
    appToken: string,
}

// # MS Teams Variable           Required  Description
// # BotId                       Yes       The ID of your MS Teams bot
// # BotPassword                 Yes       The password of your MS Teams bot
export interface IMsteamsOption {
    botUserName: string,
    botId: string,
    botPassword: string,
    // messagingEndpoint: IHttpEndpoint,
}

export interface IMessageMatcherFunction {
    (message: string): boolean
}

export interface IMessageHandlerFunction {
    (chatContextData: IChatContextData): Promise<void>
}

export interface IMessageMatcher {
    matcher: IMessageMatcherFunction,
    handlers: IMessageHandlerFunction[]
}

export interface IMessageHandlerIndex {
    matcherIndex: number,
    handlerIndex: number
}

export interface IRoute {
    path: string,
    handler: IRouteHandlerFunction
}

export interface IRouteHandlerFunction {
    (chatContextData: IChatContextData): Promise<void | Record<string, any>> // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface IUser {
    id: string,
    name: string,
    email: string,
}

export interface IChatContextData {
    message: string,
    bot: CommonBot,
    chatToolContext: Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
    chattingType: IChattingType,
    user: IUser,
    channel: IName,
    team: IName,
    tenant: IName,
}

export interface IName {
    id: string,
    name: string
}

export interface IChannel {
    id: string,
    name: string,
    chattingType: IChattingType,
}

export const enum IConnectionStatus {
    ALIVE = 'alive',
    NOT_CONNECTED = 'not_connected',
    CONNECTING = 'connecting',
    RECONNECTING = 'reconnecting',
    CLOSED = 'closed',
    CLOSING = 'closing',
    EXPIRED = 'expired',
    ERROR = 'error',
}


