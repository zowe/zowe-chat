/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import {IChatToolType, IConfig, ILogLevel, ILogOption, IMattermostConfig, IMattermostOption, IMsteamsConfig, IBotOption,
    ISlackConfig, ISlackOption, IChatServerConfig} from '../types';

import fs = require('fs');
import path = require('path');
import yaml = require('js-yaml');
import MessagingApp = require('../bot/MessagingApp');

class Config {
    private static instance: Config;
    private config: IConfig;
    private botOption: IBotOption;
    private app: MessagingApp;
    private pluginHome: string;

    private constructor() {
        // Initialize
        this.config = {
            chatServer: null,
            chatTool: null,
        };
        this.botOption = null;
        this.app = null;
        this.pluginHome = '/usr/lpp/zowe/zowechat'; // Default value

        // Read Zowe Chat server configuration
        this.config.chatServer = <IChatServerConfig> this.readYamlFile(`${__dirname}/../config/chatServer.yaml`);
        console.info(`chatServer.yaml: `);
        console.info(JSON.stringify(this.config.chatServer, null, 4));

        // Config log
        this.configLog();

        // Config chat tool
        this.configChatTool();

        // Config plugin home
        this.configPluginHome();

        if (Config.instance === undefined) {
            Config.instance = this;
        }

        return Config.instance;
    }

    // Get the singleton instance
    static getInstance(): Config {
        if (Config.instance === undefined) {
            Config.instance = new Config();
        }

        return Config.instance;
    }

    // Get config
    getConfig(): IConfig {
        return this.config;
    }

    // Get log option
    getLogOption(): ILogOption {
        return this.config.chatServer.log;
    }

    // Get bot option
    getBotOption(): IBotOption {
        return this.botOption;
    }

    // Get messaging app
    getMessagingApp(): MessagingApp {
        return this.app;
    }

    // Get plugin home
    getPluginHome(): string {
        return this.pluginHome;
    }

    // Read YAML file
    private readYamlFile(filePath: string): unknown {
        let content = null;
        try {
            if (fs.existsSync(filePath)) {
                content = yaml.load(fs.readFileSync(filePath, 'utf8'));
            } else {
                console.error(`The YAML file ${filePath} does not exist!`);
                process.exit(1);
            }
        } catch (error) {
            console.error(`Exception occurred when read the YAML files ${filePath}!`);
            console.error(error.stack);
            process.exit(2);
        }

        return content;
    }

    // Config log
    private configLog(): void {
        try {
            // Handle environment variables
            if (process.env.ZOWE_CHAT_LOG_FILE_PATH !== undefined && process.env.ZOWE_CHAT_LOG_FILE_PATH.trim() !== '') {
                this.config.chatServer.log.filePath = process.env.ZOWE_CHAT_LOG_FILE_PATH; // Set log file
            } else {
                this.config.chatServer.log.filePath = `${__dirname}/../log/zoweChatServer.log`;
            }
            const filePath = path.dirname(this.config.chatServer.log.filePath);
            if (fs.existsSync(filePath) === false) {
                fs.mkdirSync(filePath, {recursive: true}); // Create log file folder if not exist
            }
            if (process.env.ZOWE_CHAT_LOG_LEVEL !== undefined && process.env.ZOWE_CHAT_LOG_LEVEL.trim() !== '') {
                const logLevels: string[] = [ILogLevel.ERROR, ILogLevel.WARN, ILogLevel.INFO, ILogLevel.DEBUG, ILogLevel.VERBOSE, ILogLevel.SILLY];
                if (logLevels.includes(process.env.ZOWE_CHAT_LOG_LEVEL)) {
                    this.config.chatServer.log.level = <ILogLevel>process.env.ZOWE_CHAT_LOG_LEVEL;
                } else {
                    console.error('Unsupported value specified in the variable ZOWE_CHAT_LOG_LEVEL!');
                }
            }
            if (process.env.ZOWE_CHAT_LOG_MAX_SIZE !== undefined && process.env.ZOWE_CHAT_LOG_MAX_SIZE.trim() !== '') {
                this.config.chatServer.log.maximumSize = process.env.ZOWE_CHAT_LOG_MAX_SIZE;
            }
            if (process.env.ZOWE_CHAT_LOG_MAX_FILES !== undefined && process.env.ZOWE_CHAT_LOG_MAX_FILES.trim() !== '') {
                this.config.chatServer.log.maximumFiles = process.env.ZOWE_CHAT_LOG_MAX_FILES;
            }
        } catch (error) {
            console.error(`Failed to config the log!`);
            console.error(error.stack);
            process.exit(3);
        }
    }

    // Config chat tool
    private configChatTool(): void {
        try {
            // Read chat tool configuration
            if (this.config.chatServer.chatToolType === IChatToolType.MATTERMOST) {
                // Read Mattermost configuration file
                this.config.chatTool = <IMattermostConfig> this.readYamlFile(`${__dirname}/../config/chatTools/mattermost.yaml`);
                console.info(`mattermost.yaml: `);
                console.info(JSON.stringify(this.config.chatTool, null, 4));

                // Get Mattermost option
                const option = {...this.config.chatTool};
                option.messagingApp = undefined;
                this.botOption = {
                    'messagingApp': {
                        'option': this.config.chatTool.messagingApp,
                        'app': null,
                    },
                    'chatTool': {
                        'type': IChatToolType.MATTERMOST,
                        'option': option,
                    },
                };

                // Read certificate
                if (fs.existsSync((<IMattermostOption>(this.botOption.chatTool.option)).tlsCertificate)) {
                    (<IMattermostOption>(this.botOption.chatTool.option)).tlsCertificate = fs.readFileSync(this.config.chatTool.tlsCertificate, 'utf8');
                } else {
                    console.error(`The TLS certificate file ${this.config.chatTool.tlsCertificate} does not exist!`);
                    process.exit(4);
                }

                // Create messaging app
                this.app = new MessagingApp(this.botOption.messagingApp.option);
                this.botOption.messagingApp.app = this.app.getApplication();
            } else if (this.config.chatServer.chatToolType === IChatToolType.SLACK) {
                // Read Slack configuration file
                this.config.chatTool = <ISlackConfig> this.readYamlFile(`${__dirname}/../config/chatTools/slack.yaml`);
                console.info(`slack.yaml: `);
                console.info(JSON.stringify(this.config.chatTool, null, 4));

                // Get slack option
                const option: ISlackOption = {
                    botUserName: this.config.chatTool.botUserName,
                    signingSecret: this.config.chatTool.signingSecret,
                    endpoints: '',
                    receiver: null,
                    token: this.config.chatTool.token,
                    logLevel: this.config.chatServer.log.level,
                    socketMode: true,
                    appToken: null,
                };
                if (this.config.chatTool.socketMode.enabled === false && this.config.chatTool.httpEndpoint.enabled === true) { // Http endpoint mode
                    option.endpoints = this.config.chatTool.httpEndpoint.messagingApp.basePath;
                    option.receiver = null; // The value will be updated by Common Bot Framework
                    option.socketMode = false;

                    this.botOption = {
                        'messagingApp': {
                            'option': this.config.chatTool.httpEndpoint.messagingApp,
                            'app': null,
                        },
                        'chatTool': {
                            'type': IChatToolType.SLACK,
                            'option': option,
                        },
                    };

                    // Create messaging app
                    this.app = new MessagingApp(this.botOption.messagingApp.option);
                    this.botOption.messagingApp.app = this.app.getApplication();
                } else { // Socket mode
                    option.appToken = this.config.chatTool.socketMode.appToken;

                    this.botOption = {
                        'messagingApp': {
                            'option': this.config.chatTool.httpEndpoint.messagingApp,
                            'app': null,
                        },
                        'chatTool': {
                            'type': IChatToolType.SLACK,
                            'option': option,
                        },
                    };
                }
            } else if (this.config.chatServer.chatToolType === IChatToolType.MSTEAMS) {
                // Read Microsoft Teams configuration file
                this.config.chatTool = <IMsteamsConfig> this.readYamlFile(`${__dirname}/../config/chatTools/msteams.yaml`);
                console.info(`msteams.yaml: `);
                console.info(JSON.stringify(this.config.chatTool, null, 4));

                // Get Microsoft Teams option
                this.botOption = {
                    'messagingApp': {
                        'option': this.config.chatTool.messagingApp,
                        'app': null,
                    },
                    'chatTool': {
                        'type': IChatToolType.MSTEAMS,
                        'option': {
                            'botUserName': this.config.chatTool.botUserName,
                            'botId': this.config.chatTool.botId,
                            'botPassword': this.config.chatTool.botPassword,
                        },
                    },
                };

                // Create messaging app
                this.app = new MessagingApp(this.botOption.messagingApp.option);
                this.botOption.messagingApp.app = this.app.getApplication();
            } else {
                console.error(`Unsupported chat tool: ${this.config.chatServer.chatToolType}`);
                process.exit(5);
            }
        } catch (error) {
            console.error(`Failed to config the chat tool!`);
            console.error(error.stack);
            process.exit(5);
        }
    }

    // Config plugin home
    private configPluginHome(): void {
        try {
            // Handle environment variables
            if (process.env.ZOWE_CHAT_PLUGIN_HOME !== undefined && process.env.ZOWE_CHAT_PLUGIN_HOME.trim() !== ''
                && fs.existsSync(process.env.ZOWE_CHAT_PLUGIN_HOME)) {
                this.pluginHome = process.env.ZOWE_CHAT_PLUGIN_HOME;
            }
        } catch (error) {
            console.error(`Failed to config the plugin home!`);
            console.error(error.stack);
            process.exit(6);
        }
    }
}

// Create instance
// const config = Config.getInstance();
// Object.freeze(config);

export = Config;
