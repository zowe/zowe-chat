import { IChatToolType, IProtocol } from "@zowe/commonbot";

export type AppConfig = {
    app: ChatAppConfig;
    mattermost: IMattermostConfig;
    slack: ISlackConfig;
    msteams: IMsteamsConfig;
}

export type ChatAppConfig = {
    chatToolType: IChatToolType
    server: IServerOptions
    log: ILogOption;
    recordLimit: number;
    pluginLimit: number;
    extendedConfigDir: string;
    userId: string;
    userPassword: string;
}

export type ILogOption = {
    filePath: string,
    level: ILogLevel,
    maximumSize: string,
    maximumFiles: number
}


export type IMattermostConfig = {
    protocol: IProtocol;
    hostName: string;
    port: number;
    basePath: string;
    tlsCertificate: string;
    teamUrl: string;
    botUserName: string;
    botAccessToken: string;
    messagingApp: IServerOptions;
}

export type ISlackConfig = {
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
    messagingApp: IServerOptions;
}

export type IMsteamsConfig = {
    botUserName: string;
    botId: string;
    botPassword: string;
    messagingApp: IServerOptions;
}


export type IServerOptions = {
    protocol: IProtocol;
    hostName: string;
    port: number;
    basePath: string;
    tlsKey: string;
    tlsCert: string;
}


export enum ILogLevel {
    ERROR = 'error',
    WARN = 'warn',
    INFO = 'info',
    VERBOSE = 'verbose',
    DEBUG = 'debug',
    SILLY = 'silly'
}
