/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import { IChatToolType, IProtocol, IAppOption, ILogOption} from ".";

/**
 *  The top-level configuration object used by Zowe Chat.
 */
export interface IConfig {
    chatServer: IChatServerConfig,
    chatTool: IMattermostConfig | ISlackConfig | IMsteamsConfig;
    zosmfServer: IZosmfServerConfig,
};

/**
 * Zowe Chat Server Configuration object
 */
export interface IChatServerConfig {
    chatToolType: IChatToolType;
    log: ILogOption;
    limit: ILimit;
    securityChallengeMethod: ISecurityChallengeMethod;
    webApp: IAppOption;
}

/**
 * Chatting limit Configuration object
 */
export interface ILimit {
    record: number;
    plugin: number;
}

/**
 * Configuration for Mattermost  connection
 */
export interface IMattermostConfig {
    protocol: IProtocol;
    hostName: string;
    port: number;
    basePath: string;
    tlsCertificate: string;
    teamUrl: string;
    botUserName: string;
    botAccessToken: string;
    messagingApp: IAppOption;
};

/**
 * Configuration for a slack connection
 */
export interface ISlackConfig {
    botUserName: string;
    signingSecret: string;
    token: string;
    socketMode: ISlackConfigSocketMode;
    httpEndpoint: ISlackConfigHttpEndpoint;
};

export interface ISlackConfigSocketMode {
    enabled: boolean;
    appToken: string;
}

export interface ISlackConfigHttpEndpoint {
    enabled: boolean;
    messagingApp: IAppOption;
}

/**
 * Configuration for Microsoft Teams. MessagingApp is required.
 */
export interface IMsteamsConfig {
    botUserName: string;
    botId: string;
    botPassword: string;
    messagingApp: IAppOption;
};

/**
 * Standard z/OSMF Server Configuration object
 */
 export interface IZosmfServerConfig {
    hostName: string,
    protocol: IProtocol,
    port: number,
    rejectUnauthorized: boolean;
    authType: IAuthType;
    serviceAccount: IServiceAccountConfig;
};

/**
 * Service account configuration object
 */
 export interface IServiceAccountConfig extends  IAccount {
    enable: boolean;
};

/**
 * Service account ID and password (or other opaque credential) which can be used on behalf of a calling  user
 */
export interface IAccount {
    user: string;
    password: string;
};

/**
 * authN/authZ type supported by Zowe chat out of the box for use in downstream API calls
 */
export enum IAuthType {
    TOKEN = 'token',
    PASSWORD = 'password',
}

/**
 *  Security challenge method supported by Zowe chat
 */
export enum ISecurityChallengeMethod {
    WEBAPP = 'webapp',
    DIALOG = 'dialog',
}
