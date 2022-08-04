
export type AppConfig = {
    chatServer: IChatServerConfig;
    chatTool: IMattermostConfig | ISlackConfig | IMsteamsConfig;
}

export type IChatServerConfig = {
    chatToolType: IChatToolType;
    log: ILogOption;
    recordLimit: number;
    pluginLimit: number;
    extendedConfigDir: string;
    userId: string;
    userPassword: string;
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
    messagingApp: IAppOption;
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
    messagingApp: IAppOption;
}

export type IMsteamsConfig = {
    botUserName: string;
    botId: string;
    botPassword: string;
    messagingApp: IAppOption;
}

export type ILogOption = {
    filePath: string,
    level: ILogLevel,
    maximumSize: string,
    maximumFiles: string
}

export type IHttpEndpoint = {
    protocol: IProtocol,
    hostName: string,
    port: number,
    basePath: string
}

export interface IAppOption extends IHttpEndpoint {
    tlsKey: string,
    tlsCert: string
}

export const enum IChatToolType {
    MATTERMOST = 'mattermost',
    SLACK = 'slack',
    MSTEAMS = 'msteams'
}

export enum ILogLevel {
    ERROR = 'error',
    WARN = 'warn',
    INFO = 'info',
    VERBOSE = 'verbose',
    DEBUG = 'debug',
    SILLY = 'silly'
}

export const enum IProtocol {
    HTTP = 'http',
    HTTPS = 'https',
    WS = 'ws',
    WSS = 'wss',
}