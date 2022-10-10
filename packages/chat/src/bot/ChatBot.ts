/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import { CommonBot, IBotOption, IChatTool, IMattermostOption, ISlackOption } from '@zowe/commonbot';
import * as fs from "fs-extra";
import * as yaml from "js-yaml";
import * as path from "path";
import { AppConfig, MattermostConfig, MsteamsConfig, SlackConfig } from '../config/base/AppConfig';
import { UserConfigManager } from '../config/UserConfigManager';
import { EnvironmentVariables } from '../const/EnvironmentVariables';
import { LogoutMessageListener } from '../listeners/bot/LogoutMessageListener';
import { BotEventListener } from '../listeners/BotEventListener';
import { BotMessageListener } from '../listeners/BotMessageListener';
import { SecurityConfigSchema } from '../security/config/SecurityConfigSchema';
import { SecurityManager } from '../security/SecurityManager';
import { IChatListenerType, IChatPlugin } from '../types';
import { Logger } from '../utils/Logger';
import Util from "../utils/Util";
import { MessagingApp } from './MessagingApp';

/**
 *  The entrypoint class for the Zowe ChatBot. 
 * 
 *  @export
 *  @class ChatBot
 * 
 *  @example <caption>Initializing ChatBot</caption>
 *  // Zowe ChatBot requires {@linkcode AppConfig} configuration and a {@linkcode Logger} in order to load.
 *  // Run these commands in order first to make ensure configuration and loggers are available. 
 *  // If you do not run these commands, ChatBot will run them as part of startup anyway. 
 *  const appConfig = AppConfigLoader.loadAppConfig()
 *  const log = Logger.getInstance()
 *  // Get ChatBot instance
 *  const chatBot = ChatBot.getInstance()
 *  // If there is an error during bot initialization, the process will quit with error information.
 *  // There is no way to catch this error. If there is no error, continue..
 *  // Kick off the chat bot
 *  chatBot.run()
 */
export class ChatBot {

    // Singleton representing the running server
    private static instance: ChatBot;

    // Capabilities required by the ChatBot to run, all initialized in constructor
    private readonly security: SecurityManager
    private readonly log: Logger;
    private readonly appConfig: AppConfig;
    private readonly configManager: UserConfigManager
    private readonly app: MessagingApp;
    private readonly pluginHome: string;
    private readonly bot: CommonBot;
    private readonly plugins: IChatPlugin[] = [];
    private readonly botMessageListener: BotMessageListener;
    private readonly botEventListener: BotEventListener;


    /**
     * Private constructor for ChatBot object initialization, only intended for use by {@link getInstance()}  
     * 
     * Requires {@link AppConfig} and {@link Logger} in order to complete initialization. This constructor will
     * initialize all major components of Zowe Chat, i.e. the CommonBot framework, Zowe Chat plugins, the UI, REST, and Messaging Server,
     * 
     * {@link run()} must be run by the caller after receiving an instance to begin listening for chat messages and events
     * 
     * @param chatConfig 
     * @param log 
     */
    private constructor(chatConfig: AppConfig, log: Logger) {

        this.log = log
        this.appConfig = chatConfig
        this.pluginHome = EnvironmentVariables.ZOWE_CHAT_PLUGINS_DIR

        try {
            this.log.silly(`Zowe Chat Config: \n ${JSON.stringify(this.appConfig, null, 4)}`);

            // built-in config schemas and security manager. future: add plugin config schemas, if present
            let blockConfigList = [SecurityConfigSchema]
            this.configManager = new UserConfigManager(this.appConfig, { sections: blockConfigList }, log);
            this.security = new SecurityManager(this.appConfig, this.configManager, log)
            this.log.debug("Admin configuration and security facility initialized")

            // Messaging app
            this.log.debug("Init messaging app")
            this.app = new MessagingApp(this.appConfig.app.server, this.security, this.log);
            this.log.debug("Completed messaging app init")

            // Commonbot
            let cBotOpts: IBotOption = this.generateBotOpts(this.appConfig, this.app);
            this.botMessageListener = new BotMessageListener(this.appConfig, this.security, this.app, this.log);
            this.botEventListener = new BotEventListener(this.appConfig, this.security, this.app, this.log);
            this.log.info("Creating CommonBot ...");
            this.bot = new CommonBot(cBotOpts);
            this.log.info("CommonBot initialized")

            // Plugins / listeners
            this.loadInternalMessageListeners()
            this.plugins = [];
            this.loadPlugins();
            this.log.info("Plugins initialized")

        } catch (error) {
            this.log.error(this.log.getErrorStack(new Error(`Failed to create chat bot!`), error))
            process.exit(1);
        }
    }

    /**
     *  Begin execution of the Zowe ChatBot
     */
    public run(): void {
        // Print start log
        this.log.start(this.run, this);
        try {

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
            this.log.error(this.log.getErrorStack(new Error(`Failed to run Zowe chat bot!`), error));
            this.log.error(`${error}`);
            process.exit(2);
        } finally {
            // Print end log
            this.log.end(this.run, this);
        }
    }

    /**
     * Sets listeners which are part of the core Zowe Chat service.
     */
    private loadInternalMessageListeners(): void {
        this.log.start(this.loadInternalMessageListeners, this)

        this.botMessageListener.registerChatListener({
            listenerName: "LogoutListener",
            listenerType: IChatListenerType.MESSAGE,
            listenerInstance: new LogoutMessageListener(this.security, this.log),
            chatPlugin: {
                listeners: ['LogoutMessageListener'],
                package: 'chat',
                registry: 'local',
                version: 1,
                priority: 1,
            },
        })

        this.log.end(this.loadInternalMessageListeners, this)
    }

    /**
     * Loads Zowe Chatbot plugins dynamically. Reads the plugin.yaml configuration file to further process plugins.
     * 
     * See the plugin.yaml file for more information on plugin loading.
     * 
     */
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
            pluginList.sort((a, b) => a.priority - b.priority);
            this.log.debug(`Plugins sorted by priority:\n${JSON.stringify(pluginList, null, 4)}`);

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



                // Create and register listeners
                for (const listenerName of plugin.listeners) {
                    // Create listener
                    if (listenerName.endsWith('MessageListener')) {

                        // Load plugin
                        const ZoweChatPlugin = require(pluginPath);
                        console.log(ZoweChatPlugin)

                        this.botMessageListener.registerChatListener({
                            'listenerName': listenerName,
                            'listenerType': IChatListenerType.MESSAGE,
                            'listenerInstance': new ZoweChatPlugin[listenerName](),
                            'chatPlugin': plugin,
                        });
                    } else if (listenerName.endsWith('EventListener')) {


                        // Load plugin
                        const ZoweChatPlugin = require(pluginPath);

                        this.botEventListener.registerChatListener({
                            'listenerName': listenerName,
                            'listenerType': IChatListenerType.EVENT,
                            'listenerInstance': new ZoweChatPlugin[listenerName](),
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

    /**
     * Reads and returns the yaml file located at filePath
     * 
     * @param filePath 
     * @returns 
     */
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

    /**
     * Takes configuration options from appConfig and messageApp, and converts them to configuration format for CommonBot.
     * 
     * @param appConfig 
     * @param messageApp 
     * @returns 
     */
    private generateBotOpts(appConfig: AppConfig, messageApp: MessagingApp): IBotOption {
        let botOpts: IBotOption;
        try {
            // Read chat tool configuration
            if (appConfig.chatToolType === IChatTool.MATTERMOST) {
                // Read Mattermost configuration file
                this.log.debug(`mattermost configuration: `);
                this.log.debug(JSON.stringify(appConfig.chatToolConfig, null, 4));

                // Get Mattermost option
                const mmConfig = appConfig.chatToolConfig as MattermostConfig
                const option: IMattermostOption = { ...mmConfig };
                botOpts = {
                    messagingApp: {
                        option: appConfig.app.server,
                        app: messageApp.getApplication(),
                    },
                    chatTool: IChatTool.MATTERMOST,
                    mattermost: option,
                };


                // Read certificate
                if (mmConfig.protocol === "https") {
                    if (fs.existsSync(mmConfig.tlsCertificate)) {
                        botOpts.mattermost.tlsCertificate = fs.readFileSync(mmConfig.tlsCertificate, 'utf8');
                    } else {
                        this.log.error(`The TLS certificate file ${mmConfig.tlsCertificate} does not exist!`);
                        process.exit(4);
                    }
                }

                // Create messaging app

            } else if (appConfig.chatToolType === IChatTool.SLACK) {
                // Read Slack configuration file
                console.info(`slack.configuration: `);
                console.info(JSON.stringify(appConfig.chatToolConfig, null, 4));

                const slackConfig = appConfig.chatToolConfig as SlackConfig
                // Get slack option
                const option: ISlackOption = {
                    botUserName: slackConfig.botUserName,
                    signingSecret: slackConfig.signingSecret,
                    endpoints: '',
                    receiver: null,
                    token: slackConfig.token,
                    logLevel: appConfig.app.log.level,
                    socketMode: true,
                    appToken: null,
                };
                if (slackConfig.socketMode.enabled === false && slackConfig.httpEndpoint.enabled === true) { // Http endpoint mode
                    option.endpoints = slackConfig.httpEndpoint.messagingApp.basePath;
                    option.receiver = null; // The value will be updated by Common Bot Framework
                    option.socketMode = false;
                    // TODO: Fix casting, circular dependency between config and commonbot

                    botOpts = {
                        messagingApp: {
                            option: appConfig.app.server,
                            app: messageApp.getApplication(),
                        },
                        chatTool: IChatTool.SLACK,
                        slack: option,
                    };


                } else { // Socket mode
                    // TODO: Fix casting, circular dependency between config and commonbot

                    option.appToken = slackConfig.socketMode.appToken;

                    botOpts = {
                        messagingApp: {
                            option: appConfig.app.server,
                            app: messageApp.getApplication(),
                        },
                        chatTool: IChatTool.SLACK,
                        slack: option,

                    };
                }
            } else if (appConfig.chatToolType === IChatTool.MSTEAMS) {
                // Read Microsoft Teams configuration file
                console.info(`msteams.yaml: `);
                console.info(JSON.stringify(appConfig.chatToolConfig, null, 4));

                const mstConfig: MsteamsConfig = appConfig.chatToolConfig as MsteamsConfig
                // TODO: Fix casting, circular dependency between config and commonbot
                // Get Microsoft Teams option
                botOpts = {
                    messagingApp: {
                        option: appConfig.app.server,
                        app: messageApp.getApplication(),
                    },
                    chatTool: IChatTool.MSTEAMS,
                    msteams: {
                        'botUserName': mstConfig.botUserName,
                        'botId': mstConfig.botId,
                        'botPassword': mstConfig.botPassword,
                    },
                };
            } else {
                this.log.error(`Unsupported chat tool: ${appConfig.chatToolType}`);
                process.exit(5);
            }
        } catch (error) {
            this.log.error(`Failed to config the chat tool!`);
            this.log.error(error.stack);
            process.exit(5);
        }

        return botOpts
    }

    /**
     * Returns the ChatBot singleton, or creates it if it does not exist.
     * 
     * @returns ChatBot
     */
    public static getInstance(appConfig: AppConfig, logger: Logger): ChatBot {
        if (!ChatBot.instance) {
            ChatBot.instance = new ChatBot(appConfig, logger);
        }
        return ChatBot.instance;
    }
}
