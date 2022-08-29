/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import { CommonBot, IBotOption, IChatToolType, IMattermostOption, ISlackOption } from '@zowe/commonbot';
import * as fs from "fs-extra";
import * as yaml from "js-yaml";
import * as path from "path";
import { AppConfigLoader } from '../config/AppConfigLoader';
import { AppConfig } from '../config/base/AppConfig';
import { UserConfigManager } from '../config/UserConfigManager';
import { BotEventListener } from '../listeners/BotEventListener';
import { BotMessageListener } from '../listeners/BotMessageListener';
import { SecurityConfigSchema } from '../security/config/SecurityConfigSchema';
import { SecurityFacility } from '../security/SecurityFacility';
import { IChatListenerType, IChatPlugin } from '../types';
import { Logger } from '../utils/Logger';
import { MessagingApp } from './MessagingApp';
import Util = require('../utils/Util');

export class ChatBot {

    private static instance: ChatBot;
    private readonly security: SecurityFacility
    private readonly log: Logger;
    private readonly appConfig: AppConfig;
    private readonly configManager: UserConfigManager
    private readonly app: MessagingApp;
    private readonly pluginHome = '/usr/lpp/zowe/zowechat';
    private readonly bot: CommonBot;
    private readonly plugins: IChatPlugin[] = [];
    private botMessageListener: BotMessageListener;
    private botEventListener: BotEventListener;


    // TODO: Can we cleanup or clarify the initialization logic? For some steps, ordering is required but not explicit enough?
    private constructor(chatConfig: AppConfig, log: Logger) {
        // App Config and Log are used in multiple methods within the constructor.
        this.log = log
        this.appConfig = chatConfig

        try {
            this.log.debug(`Zowe Chat Config: \n ${JSON.stringify(this.appConfig, null, 4)}`);

            let blockConfigList = [SecurityConfigSchema]
            this.configManager = new UserConfigManager(this.appConfig, { sections: blockConfigList }, log);
            this.security = new SecurityFacility(this.configManager, log)
            this.log.info("Admin configuration and security facility initialized")

            this.app = new MessagingApp(this.appConfig.app.server, this.security, this.log);
            let cBotOpts: IBotOption = this.generateBotOpts(this.app);
            this.botMessageListener = new BotMessageListener(this.appConfig, this.security, this.log);
            this.botEventListener = new BotEventListener(this.appConfig, this.log);
            this.log.info("Creating CommonBot ...");
            // TODO: Fix casting, circular dependency between config and commonbot
            this.bot = new CommonBot(cBotOpts);
            this.log.info("Bot initialized")
            this.plugins = [];
            this.loadPlugins();
            this.log.info("Plugins initialized")


            for (let plugin of this.plugins) {
                // TODO: Build plugin configuration interface, other plugin initialization APIs?
                /**
                  *    if (plugin.getConfigSchema() !== undefined) {
                  *        admConfigList.push(plugin.configSchema);
                  *    }
                  */
            }


            this.botMessageListener = new BotMessageListener(this.appConfig, this.security, log);
            this.botEventListener = new BotEventListener(this.appConfig, log);
        } catch (error) {
            console.log(error)
            this.log.error(`Failed to create chat bot!`);
            this.log.error(`Error details: ${error}`);
            this.log.debug(`Error stack: ${error.stack}`)
            process.exit(1);
        }
    }

    // Run chat bot
    public run(): void {
        // Print start log
        this.log.start(this.run, this);
        try {
            // Load plugins
            this.log.info('Load Zowe Chat plugins ...');


            // Start server
            const app = this.app
            if (app !== null) {
                this.log.info('Start messaging server ...');
                app.startServer();
            }

            // Register listeners
            this.log.info('Register message listeners ...');
            this.bot.listen(this.botMessageListener.matchMessage, this.botMessageListener.processMessage);

            // Register routers
            this.log.info('Register event routers ...');
            this.bot.route(this.bot.getOption().messagingApp.option.basePath, this.botEventListener.processEvent);

            // // Load translation resource
            // this.log.info('Load translations ...');
        } catch (error) {
            this.log.error(`Failed to run Zowe chat bot!`);
            this.log.error(`${error}`);
            process.exit(2);
        } finally {
            // Print end log
            this.log.end(this.run, this);
        }
    }

    // Load plugins
    private loadPlugins(): void {
        // Print start log
        this.log.start(this.loadPlugins, this);

        try {
            // Get plugin home
            const pluginHome = this.pluginHome;
            let pluginYamlFilePath = `${pluginHome}${path.sep}plugin.yaml`;
            this.log.info(`Zowe Chat plugin home: ${pluginHome}`);

            // Read plugin configuration file
            if (fs.existsSync(pluginYamlFilePath) === false) {
                //  Check zowe chat server configuration folder
                pluginYamlFilePath = `${__dirname}${path.sep}..${path.sep}config${path.sep}plugin.yaml`;
                if (fs.existsSync(pluginYamlFilePath) === false) {
                    this.log.error(`Zowe Chat plugin configuration file plugin.yaml does not exist in ${pluginHome} `
                        + `and ${__dirname}${path.sep}..${path.sep}config !`);
                    this.log.error(`Skip loading plugins!`);
                    return;
                }
            }

            // Read Zowe Chat plugins configuration file
            let pluginList = <IChatPlugin[]>this.readYamlFile(pluginYamlFilePath)
            this.log.info(`${pluginYamlFilePath}:\n${JSON.stringify(this.plugins, null, 4)}`);

            // Sort plugin per priority in ascend order: Priority 1 (Urgent) · Priority 2 (High) · Priority 3 (Medium) · Priority 4 (Low)
            this.plugins.sort((a, b) => a.priority - b.priority);
            this.log.debug(`Plugins sorted by priority:\n${JSON.stringify(this.plugins, null, 4)}`);

            // Load plugins one by one in priority descend order
            for (const plugin of pluginList) {
                this.log.info(`Loading the plugin ${plugin.package} ...`);

                // Get plugin installed path
                let pluginPath = '';
                const segments: string[] = plugin.package.split('/');
                if (segments.length === 2) {
                    pluginPath = `${pluginHome}${path.sep}${segments[0]}${path.sep}${segments[1]}`;
                } else {
                    pluginPath = `${pluginHome}${path.sep}${plugin.package}`;
                }

                // Check whether the plugin is installed
                if (fs.existsSync(pluginPath) === false) {
                    this.log.error(`Can't load the plugin ${plugin.package} due to the plugin file path "${pluginPath}" does not exist!`);
                    continue;
                }

                // Verify the consistency of package name
                const packageFilePath = `${pluginPath}${path.sep}package.json`;
                const packageName = Util.getPackageName(packageFilePath);
                if (plugin.package !== packageName) {
                    this.log.error(`Can't load the plugin ${plugin.package} due to the specified package name in ${pluginYamlFilePath} `
                        + `is not consistent with the real package name in ${packageFilePath}`);
                    continue;
                }

                // Load plugin
                const ZoweChatPlugin = require(pluginPath);

                // Create and register listeners
                for (const listenerName of plugin.listeners) {
                    // Create listener
                    if (listenerName.endsWith('MessageListener')) {
                        this.botMessageListener.registerChatListener({
                            'listenerName': listenerName,
                            'listenerType': IChatListenerType.MESSAGE,
                            'listenerInstance': new ZoweChatPlugin[listenerName](this.log),
                            'chatPlugin': plugin,
                        });
                    } else if (listenerName.endsWith('EventListener')) {
                        this.botEventListener.registerChatListener({
                            'listenerName': listenerName,
                            'listenerType': IChatListenerType.EVENT,
                            'listenerInstance': new ZoweChatPlugin[listenerName](this.log),
                            'chatPlugin': plugin,
                        });
                    } else {
                        this.log.error(`The listener "${listenerName}" is not supported!`);
                    }
                }

                this.log.debug(`Loading plugin ${plugin.package} complete`);
                this.plugins.push(plugin)
            }
        } catch (error) {
            // Print exception stack
            this.log.error(`${error}`);
        } finally {
            // Print end log
            this.log.end(this.loadPlugins, this);
        }
    }

    private readYamlFile(filePath: string): any {
        if (!fs.existsSync(filePath)) {
            this.log.info(`TBD002E: File ${filePath} does not exist.`);
            throw new Error(`TBD002E: File ${filePath} does not exist.`);
        }

        try {
            return yaml.load(fs.readFileSync(filePath).toString(), {});
        } catch (err) {
            this.log.info(`TBD003E: Error parsing the content for file ${filePath}. Please make sure the file is valid YAML.`);
            this.log.info(err)
            throw new Error(`TBD003E: Error parsing the content for file ${filePath}. Please make sure the file is valid YAML.`);
        }
    }

    private generateBotOpts(messageApp: MessagingApp): IBotOption {
        let botOpts: IBotOption;
        try {
            // Read chat tool configuration
            if (this.appConfig.app.chatToolType === IChatToolType.MATTERMOST) {
                // Read Mattermost configuration file
                this.log.debug(`mattermost configuration: `);
                this.log.debug(JSON.stringify(this.appConfig.mattermost, null, 4));

                // Get Mattermost option
                // TODO: Fix casting, circular dependency between config and commonbot
                const option: IMattermostOption = { ...this.appConfig.mattermost };
                botOpts = {
                    messagingApp: {
                        option: this.appConfig.app.server,
                        app: messageApp.getApplication(),
                    },
                    chatTool: IChatToolType.MATTERMOST,
                    mattermost: option,
                };

                // Read certificate
                if (fs.existsSync(this.appConfig.app.server.tlsCert)) {
                    botOpts.mattermost.tlsCertificate = fs.readFileSync(this.appConfig.app.server.tlsCert, 'utf8');
                } else {
                    this.log.error(`The TLS certificate file ${this.appConfig.app.server.tlsCert} does not exist!`);
                    process.exit(4);
                }

                // Create messaging app

            } else if (this.appConfig.app.chatToolType === IChatToolType.SLACK) {
                // Read Slack configuration file
                console.info(`slack.configuration: `);
                console.info(JSON.stringify(this.appConfig.slack, null, 4));

                // Get slack option
                const option: ISlackOption = {
                    botUserName: this.appConfig.slack.botUserName,
                    signingSecret: this.appConfig.slack.signingSecret,
                    endpoints: '',
                    receiver: null,
                    token: this.appConfig.slack.token,
                    logLevel: this.appConfig.app.log.level,
                    socketMode: true,
                    appToken: null,
                };
                if (this.appConfig.slack.socketMode.enabled === false && this.appConfig.slack.httpEndpoint.enabled === true) { // Http endpoint mode
                    option.endpoints = this.appConfig.slack.httpEndpoint.messagingApp.basePath;
                    option.receiver = null; // The value will be updated by Common Bot Framework
                    option.socketMode = false;
                    // TODO: Fix casting, circular dependency between config and commonbot

                    botOpts = {
                        messagingApp: {
                            option: this.appConfig.app.server,
                            app: messageApp.getApplication(),
                        },
                        chatTool: IChatToolType.SLACK,
                        slack: option,
                    };


                } else { // Socket mode
                    // TODO: Fix casting, circular dependency between config and commonbot

                    option.appToken = this.appConfig.slack.socketMode.appToken;

                    botOpts = {
                        messagingApp: {
                            option: this.appConfig.app.server,
                            app: messageApp.getApplication(),
                        },
                        chatTool: IChatToolType.SLACK,
                        slack: option,

                    };
                }
            } else if (this.appConfig.app.chatToolType === IChatToolType.MSTEAMS) {
                // Read Microsoft Teams configuration file
                console.info(`msteams.yaml: `);
                console.info(JSON.stringify(this.appConfig.msteams, null, 4));
                // TODO: Fix casting, circular dependency between config and commonbot
                // Get Microsoft Teams option
                botOpts = {
                    messagingApp: {
                        option: this.appConfig.app.server,
                        app: messageApp.getApplication(),
                    },
                    chatTool: IChatToolType.MSTEAMS,
                    msteams: {
                        'botUserName': this.appConfig.msteams.botUserName,
                        'botId': this.appConfig.msteams.botId,
                        'botPassword': this.appConfig.msteams.botPassword,
                    },

                };

            } else {
                this.log.error(`Unsupported chat tool: ${this.appConfig.app.chatToolType}`);
                process.exit(5);
            }
        } catch (error) {
            this.log.error(`Failed to config the chat tool!`);
            this.log.error(error.stack);
            process.exit(5);
        }

        return botOpts
    }

    public static getInstance(): ChatBot {
        if (!ChatBot.instance) {
            ChatBot.instance = new ChatBot(AppConfigLoader.loadAppConfig(), Logger.getInstance());
        }
        return ChatBot.instance;
    }
}
