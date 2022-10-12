/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import { IChatTool as ChatToolType, IProtocol, ISlackConfigHttpEndpoint, ISlackConfigSocketMode } from "@zowe/commonbot";

/**
 *  The top-level configuration object used by Zowe Chat.
 */
export type AppConfig = {
    chatToolType: ChatToolType;
    chatToolConfig: MattermostConfig | SlackConfig | MsteamsConfig;
    security: SecurityConfig;
    app: ChatAppConfig;
};

/** 
 *  This configuration is required in order for users to authenticate succesfully against Zowe Chat.
 */
export type SecurityConfig = {
    zosmf: ZosmfServerConfig;
    authMode: AuthType;
    serviceAccount: ServiceAccount;
};

/**
 * Service account ID and password (or other opaque credential) which can be used on behalf of a calling  user
 */
export type ServiceAccount = {
    user: string;
    password: string;
};

/**
 * Standard z/OSMF Server Configuration object
 */
export type ZosmfServerConfig = {
    host: string,
    protocol: string,
    port: number,
    rejectUnauthorized: boolean;
};

/**
 * Configuration for Zowe Chat's features - which chat to connect to, where the express server should runm, log options, etc.
 */
export type ChatAppConfig = {

    server: ServerOptions;
    log: LogOption;
    recordLimit: number;
    pluginLimit: number;
    extendedConfigDir: string;

};

/**
 * Configuration for Zowe Chat's logger
 */
export type LogOption = {
    filePath: string,
    level: LogLevel,
    maximumSize: string,
    maximumFiles: number;
};

/**
 * Configuration for Mattermost  connection
 */
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
};

/**
 * Configuration for a slack connection
 */
export type SlackConfig = {
    botUserName: string;
    signingSecret: string;
    token: string;
    socketMode: ISlackConfigSocketMode;
    httpEndpoint: ISlackConfigHttpEndpoint;
};


/**
 * Configuration for Microsoft Teams. MessagingApp is required.
 */
export type MsteamsConfig = {
    botUserName: string;
    botId: string;
    botPassword: string;
    messagingApp: ServerOptions;
};

/**
 * Configuration options for the express server within Zowe Chat
 */
export type ServerOptions = {
    protocol: IProtocol;
    hostName: string;
    messagePort: number;
    webappPort: number;
    basePath: string;
    tlsKey: string;
    tlsCert: string;
};


/**
 * Zowe Chat's supported log levels
 */
export enum LogLevel {
    ERROR = 'error',
    WARN = 'warn',
    INFO = 'info',
    VERBOSE = 'verbose',
    DEBUG = 'debug',
    SILLY = 'silly'
}

/**
 * authN/authZ modes supported by Zowe chat out of the box for use in downstream API calls
 */
export enum AuthType {
    TOKEN = 'token',
    PASSWORD = 'password',
}