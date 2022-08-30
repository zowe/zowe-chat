/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import { IChatToolType as ChatToolType, IProtocol } from "@zowe/commonbot";

/**
 * 
 */
export type AppConfig = {
    app: ChatAppConfig;
    mattermost: MattermostConfig;
    slack: SlackConfig;
    msteams: MsteamsConfig;
}

export type ChatAppConfig = {
    chatToolType: ChatToolType
    server: ServerOptions
    log: LogOption;
    recordLimit: number;
    pluginLimit: number;
    extendedConfigDir: string;
    userId: string;
    userPassword: string;
}

export type LogOption = {
    filePath: string,
    level: LogLevel,
    maximumSize: string,
    maximumFiles: number
}


export type MattermostConfig = {
    protocol: IProtocol;
    hostName: string;
    port: number;
    basePath: string;
    tlsCertificate: string;
    teamUrl: string;
    botUserName: string;
    botAccessToken: string;
    messagingApp: ServerOptions;
}

export type SlackConfig = {
    botUserName: string;
    signingSecret: string;
    token: string;
    socketMode: ISlackConfigSocketMode;
    httpEndpoint: ISlackConfigHttpEndpoint;
}

export type ISlackConfigSocketMode = {
    enabled: boolean;
    appToken: string;
}

export type ISlackConfigHttpEndpoint = {
    enabled: boolean;
    messagingApp: ServerOptions;
}

export type MsteamsConfig = {
    botUserName: string;
    botId: string;
    botPassword: string;
    messagingApp: ServerOptions;
}


export type ServerOptions = {
    protocol: IProtocol;
    hostName: string;
    port: number;
    basePath: string;
    tlsKey: string;
    tlsCert: string;
}


export enum LogLevel {
    ERROR = 'error',
    WARN = 'warn',
    INFO = 'info',
    VERBOSE = 'verbose',
    DEBUG = 'debug',
    SILLY = 'silly'
}
