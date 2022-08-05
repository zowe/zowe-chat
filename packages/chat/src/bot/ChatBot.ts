/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import CommonBot, { IBotOption, IMattermostOption, ISlackOption } from '@zowe/commonbot';
import * as fs from "fs-extra";
import * as yaml from "js-yaml";
import path from 'path';
import { AppConfig, IChatToolType, IMattermostConfig, IMsteamsConfig, ISlackConfig } from '../config/base/AppConfig';
import { UserConfigManager } from '../config/UserConfigManager';
import EventListener from '../listener/EventListener';
import { MessageListener } from '../listener/MessageListener';
import { SecurityConfigSchema } from '../security/config/SecurityConfigSchema';
import { SecurityFacility } from '../security/SecurityFacility';
import { IChatListenerType, IChatPlugin } from '../types';
import { Logger } from '../utils/Logger';
import { MessagingApp } from './MessagingApp';


export class ChatBot {

    private readonly mSecurity: SecurityFacility
    private readonly mLog: Logger;
    private readonly appConfig: AppConfig;
    private readonly configManager: UserConfigManager
    private readonly mApp: MessagingApp;
    private readonly mPluginHome = '/usr/lpp/zowe/zowechat';
    private readonly mBot: CommonBot;
    private readonly plugins: IChatPlugin[] = [];
    private messageListener: MessageListener;
    private eventListener: EventListener;

    // TODO: Can we cleanup or clarify the initialization logic? For some steps, ordering is required but not explicit enough?
    constructor(chatConfig: AppConfig, log: Logger) {
        this.mLog = log
        this.appConfig = chatConfig

        try {
            this.mLog.debug(`Zowe Chat Config: \n ${JSON.stringify(this.appConfig, null, 4)}`);
            let botOpts: IBotOption = this.generateBotOpts();

            // TODO: Fix casting, circular dependency between config and commonbot
            this.mApp = new MessagingApp(botOpts.messagingApp.option as any);
            botOpts.messagingApp.app = this.mApp.getApplication();
            this.mBot = new CommonBot(botOpts);

            this.plugins = [];
            this.loadPlugins();

            let blockConfigList = [SecurityConfigSchema]

            for (let plugin of this.plugins) {
                // TODO: Build plugin configuration interface
                /**
                  *    if (plugin.configSchema !== undefined) {
                  *        admConfigList.push(plugin.configSchema);
                  *    }
                  */
            }
            this.configManager = new UserConfigManager(this.appConfig, { sections: blockConfigList }, log);
            this.mSecurity = new SecurityFacility(this.configManager, log)
            this.messageListener = new MessageListener(this.appConfig, this.mSecurity, log);
            this.eventListener = new EventListener(this.appConfig, log);
        } catch (error) {
            this.mLog.error(`Failed to create chat bot!`);
            this.mLog.error(`Error details: ${error}`);
            this.mLog.debug(`Error stack: ${error.stack}`)
            process.exit(1);
        }
    }

    // Run chat bot
    public run(): void {
        // Print start log
        this.mLog.start(this.run, this);
        try {
            // Load plugins
            this.mLog.info('Load Zowe Chat plugins ...');


            // Start server
            const app = this.mApp
            if (app !== null) {
                this.mLog.info('Start messaging server ...');
                app.startServer();
            }

            // Register listeners
            this.mLog.info('Register message listeners ...');
            this.mBot.listen(this.messageListener.matchMessage, this.messageListener.processMessage);


            // Register routers
            this.mLog.info('Register event routers ...');
            this.mBot.route(this.mBot.getOption().messagingApp.option.basePath, this.eventListener.processEvent);

            // // Load translation resource
            // logger.info('Load translations ...');
        } catch (error) {
            this.mLog.error(`Failed to run Zowe chat bot!`);
            this.mLog.error(`${error}`);
            process.exit(2);
        } finally {
            // Print end log
            this.mLog.end(this.run, this);
        }
    }
    // Load plugins
    private loadPlugins(): void {
        // Print start log
        this.mLog.start(this.loadPlugins, this);

        try {
            // Get plugin home
            const pluginHome = this.mPluginHome;
            let pluginYamlFilePath = `${pluginHome}${path.sep}plugin.yaml`;
            this.mLog.info(`Zowe Chat plugin home: ${pluginHome}`);

            // Read plugin configuration file
            if (fs.existsSync(pluginYamlFilePath) === false) {
                //  Check zowe chat server configuration folder
                pluginYamlFilePath = `${__dirname}${path.sep}..${path.sep}config${path.sep}plugin.yaml`;
                if (fs.existsSync(pluginYamlFilePath) === false) {
                    this.mLog.error(`Zowe Chat plugin configuration file plugin.yaml does not exist in ${pluginHome} `
                        + `and ${__dirname}${path.sep}..${path.sep}config !`);
                    this.mLog.error(`Skip loading plugins!`);
                    return;
                }
            }

            // Read Zowe Chat plugins configuration file
            let pluginList = <IChatPlugin[]>yaml.load(fs.readFileSync(pluginYamlFilePath, 'utf8'));
            this.mLog.info(`${pluginYamlFilePath}:\n${JSON.stringify(this.plugins, null, 4)}`);

            // Sort plugin per priority in descend order
            pluginList.sort((a, b) => b.priority - a.priority);
            this.mLog.debug(`Plugins sorted by priority:\n${JSON.stringify(this.plugins, null, 4)}`);

            // Load plugins one by one in priority descend order
            for (const plugin of pluginList) {
                this.mLog.info(`Loading the plugin ${plugin.package} ...`);

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
                    this.mLog.error(`The plugin file "${pluginPath}" does not exist!`);
                } else {
                    // Load plugin
                    const ZoweChatPlugin = require(pluginPath);

                    // Create and register listeners
                    for (const listenerName of plugin.listeners) {
                        // Create listener
                        if (listenerName.endsWith('MessageListener')) {
                            this.messageListener.registerChatListener({
                                'listenerName': listenerName,
                                'listenerType': IChatListenerType.MESSAGE,
                                'listenerInstance': new ZoweChatPlugin[listenerName](this.mLog),
                                'chatPlugin': plugin,
                            });
                        } else if (listenerName.endsWith('EventListener')) {
                            this.eventListener.registerChatListener({
                                'listenerName': listenerName,
                                'listenerType': IChatListenerType.EVENT,
                                'listenerInstance': new ZoweChatPlugin[listenerName](this.mLog),
                                'chatPlugin': plugin,
                            });
                            // this.bot.listen(listener.matchEvent.bind(listener.this), listener.processEvent.bind(listener.this));
                        } else {
                            this.mLog.error(`The listener "${listenerName}" is not supported!`);
                        }
                    }
                }
                this.mLog.debug(`Loading plugin ${plugin.package} complete`);
                this.plugins.push(plugin)
            }
        } catch (error) {
            // Print exception stack
            this.mLog.error(`${error}`);
        } finally {
            // Print end log
            this.mLog.end(this.loadPlugins, this);
        }
    }

    private readYamlFile(filePath: string): any {
        if (!fs.existsSync(filePath)) {
            this.mLog.info(`TBD002E: File ${filePath} does not exist.`);
            throw new Error(`TBD002E: File ${filePath} does not exist.`);
        }

        try {
            return yaml.load(fs.readFileSync(filePath).toString(), {});
        } catch (err) {
            this.mLog.info(`TBD003E: Error parsing the content for file ${filePath}. Please make sure the file is valid YAML.`);
            this.mLog.info(err)
            throw new Error(`TBD003E: Error parsing the content for file ${filePath}. Please make sure the file is valid YAML.`);
        }
    }

    private generateBotOpts(): IBotOption {
        let botOpts: IBotOption;
        try {
            // Read chat tool configuration
            if (this.appConfig.chatServer.chatToolType === IChatToolType.MATTERMOST) {
                // Read Mattermost configuration file
                this.appConfig.chatTool = this.readYamlFile(`${__dirname}/../config/chatTools/mattermost.yaml`) as IMattermostConfig;
                this.mLog.debug(`mattermost.yaml: `);
                this.mLog.debug(JSON.stringify(this.appConfig.chatTool, null, 4));

                // Get Mattermost option
                // TODO: Fix casting, circular dependency between config and commonbot
                const option: IMattermostConfig = { ...this.appConfig.chatTool };
                option.messagingApp = undefined;
                botOpts = {
                    messagingApp: {
                        option: this.appConfig.chatTool.messagingApp as any,
                        app: null,
                    },
                    chatTool: {
                        type: IChatToolType.MATTERMOST as any,
                        option: option as any,
                    },
                };

                // Read certificate
                if (fs.existsSync((<IMattermostOption>(botOpts.chatTool.option)).tlsCertificate)) {
                    (<IMattermostOption>(botOpts.chatTool.option)).tlsCertificate = fs.readFileSync(this.appConfig.chatTool.tlsCertificate, 'utf8');
                } else {
                    this.mLog.error(`The TLS certificate file ${(<IMattermostOption>(botOpts.chatTool.option)).tlsCertificate} does not exist!`);
                    process.exit(4);
                }

                // Create messaging app

            } else if (this.appConfig.chatServer.chatToolType === IChatToolType.SLACK) {
                // Read Slack configuration file
                this.appConfig.chatTool = <ISlackConfig>this.readYamlFile(`${__dirname}/../config/chatTools/slack.yaml`);
                console.info(`slack.yaml: `);
                console.info(JSON.stringify(this.appConfig.chatTool, null, 4));

                // Get slack option
                const option: ISlackOption = {
                    botUserName: this.appConfig.chatTool.botUserName,
                    signingSecret: this.appConfig.chatTool.signingSecret,
                    endpoints: '',
                    receiver: null,
                    token: this.appConfig.chatTool.token,
                    logLevel: this.appConfig.chatServer.log.level,
                    socketMode: true,
                    appToken: null,
                };
                if (this.appConfig.chatTool.socketMode.enabled === false && this.appConfig.chatTool.httpEndpoint.enabled === true) { // Http endpoint mode
                    option.endpoints = this.appConfig.chatTool.httpEndpoint.messagingApp.basePath;
                    option.receiver = null; // The value will be updated by Common Bot Framework
                    option.socketMode = false;
                    // TODO: Fix casting, circular dependency between config and commonbot

                    botOpts = {
                        'messagingApp': {
                            'option': this.appConfig.chatTool.httpEndpoint.messagingApp as any,
                            'app': null,
                        },
                        'chatTool': {
                            'type': IChatToolType.SLACK as any,
                            'option': option,
                        },
                    };


                } else { // Socket mode
                    // TODO: Fix casting, circular dependency between config and commonbot

                    option.appToken = this.appConfig.chatTool.socketMode.appToken;

                    botOpts = {
                        'messagingApp': {
                            'option': this.appConfig.chatTool.httpEndpoint.messagingApp as any,
                            'app': null,
                        },
                        'chatTool': {
                            'type': IChatToolType.SLACK as any,
                            'option': option,
                        },
                    };
                }
            } else if (this.appConfig.chatServer.chatToolType === IChatToolType.MSTEAMS) {
                // Read Microsoft Teams configuration file
                this.appConfig.chatTool = <IMsteamsConfig>this.readYamlFile(`${__dirname}/../config/chatTools/msteams.yaml`);
                console.info(`msteams.yaml: `);
                console.info(JSON.stringify(this.appConfig.chatTool, null, 4));
                // TODO: Fix casting, circular dependency between config and commonbot
                // Get Microsoft Teams option
                botOpts = {
                    'messagingApp': {
                        'option': this.appConfig.chatTool.messagingApp as any,
                        'app': null,
                    },
                    'chatTool': {
                        'type': IChatToolType.MSTEAMS as any,
                        'option': {
                            'botUserName': this.appConfig.chatTool.botUserName,
                            'botId': this.appConfig.chatTool.botId,
                            'botPassword': this.appConfig.chatTool.botPassword,
                        },
                    },
                };

            } else {
                this.mLog.error(`Unsupported chat tool: ${this.appConfig.chatServer.chatToolType}`);
                process.exit(5);
            }
        } catch (error) {
            this.mLog.error(`Failed to config the chat tool!`);
            this.mLog.error(error.stack);
            process.exit(5);
        }

        return botOpts
    }

}
