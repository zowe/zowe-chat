/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import {IBotOption, IChatListenerType, IChatPlugin} from '../types';

import fs = require('fs');
import path = require('path');
import yaml = require('js-yaml');
import CommonBot from '@zowe/commonbot';

import Config = require('../common/Config');
import Logger = require('../utils/Logger');
import BotEventListener = require('../listeners/BotEventListener');
import BotMessageListener = require('../listeners/BotMessageListener');
import Util = require('../utils/Util');
import ChatResource = require('./ChatResource');
import ChatMessageListener = require('../listeners/ChatMessageListener');
import ChatEventListener = require('../listeners/ChatEventListener');

const logger = Logger.getInstance();
const config = Config.getInstance();

class ChatBot {
    private static instance: ChatBot;
    private botOption: IBotOption;
    private bot: CommonBot;
    private plugins: IChatPlugin[];
    private botMessageListener: BotMessageListener;
    private botEventListener: BotEventListener;
    private chatResource: ChatResource;

    private constructor() {
        try {
            logger.debug(`Zowe Chat Config: \n ${JSON.stringify(config.getConfig(), null, 4)}`);

            this.botOption = config.getBotOption();
            this.bot = new CommonBot(this.botOption);
            this.plugins = [];
            this.botMessageListener = new BotMessageListener();
            this.botEventListener = new BotEventListener();
            this.chatResource = new ChatResource();

            if (ChatBot.instance === undefined) {
                ChatBot.instance = this;
            }

            return ChatBot.instance;
        } catch (error) {
            logger.error(`Failed to create chat bot!`);
            logger.error(logger.getErrorStack(new Error(error.name), error));
            process.exit(1);
        }
    }

    // Get the singleton instance
    static getInstance(): ChatBot {
        if (ChatBot.instance === undefined) {
            ChatBot.instance = new ChatBot();
        }

        return ChatBot.instance;
    }

    // Run chat bot
    async run(): Promise<void> {
        // Print start log
        logger.start(this.run, this);

        try {
            // Load plugins
            logger.info('Load Zowe Chat plugins ...');
            this.loadPlugins();

            // Load translation resources
            await this.chatResource.initialize();

            // Start server
            const app = config.getMessagingApp();
            if (app !== null) {
                logger.info('Start messaging server ...');
                app.startServer();
            }

            // Register listeners
            logger.info('Register message listeners ...');
            this.bot.listen(this.botMessageListener.matchMessage, this.botMessageListener.processMessage);


            // Register routers
            logger.info('Register event routers ...');
            this.bot.route(this.botOption.messagingApp.option.basePath, this.botEventListener.processEvent);

            // // Load translation resource
            // logger.info('Load translations ...');
        } catch (error) {
            logger.error(`Failed to run Zowe chat bot!`);
            logger.error(logger.getErrorStack(new Error(error.name), error));
            process.exit(2);
        } finally {
            // Print end log
            logger.end(this.run, this);
        }
    }

    // Load plugins
    private loadPlugins(): void {
        // Print start log
        logger.start(this.loadPlugins, this);

        try {
            // Get plugin home
            const pluginHome = config.getPluginHome();
            let pluginYamlFilePath = `${pluginHome}${path.sep}plugin.yaml`;
            logger.info(`Zowe Chat plugin home: ${pluginHome}`);

            // Read plugin configuration file
            if (fs.existsSync(pluginYamlFilePath) === false) {
                //  Check zowe chat server configuration folder
                pluginYamlFilePath = `${__dirname}${path.sep}..${path.sep}config${path.sep}plugin.yaml`;
                if (fs.existsSync(pluginYamlFilePath) === false) {
                    logger.error(`Zowe Chat plugin configuration file plugin.yaml does not exist in ${pluginHome} `
                        + `and ${__dirname}${path.sep}..${path.sep}config !`);
                    logger.error(`Skip loading plugins!`);
                    return;
                }
            }

            // Read Zowe Chat plugins configuration file
            this.plugins = <IChatPlugin[]>yaml.load(fs.readFileSync(pluginYamlFilePath, 'utf8'));
            logger.info(`${pluginYamlFilePath}:\n${JSON.stringify(this.plugins, null, 4)}`);

            // Sort plugin per priority in ascend order: Priority 1 (Urgent) · Priority 2 (High) · Priority 3 (Medium) · Priority 4 (Low)
            this.plugins.sort((a, b)=>a.priority - b.priority);
            logger.debug(`Plugins sorted by priority:\n${JSON.stringify(this.plugins, null, 4)}`);

            // Load plugins one by one in priority descend order
            for (const plugin of this.plugins) {
                logger.info(`Loading the plugin ${plugin.package} ...`);

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
                    logger.error(`Can't load the plugin ${plugin.package} due to the plugin file path "${pluginPath}" does not exist!`);
                    continue;
                }

                // Verify the consistency of package name
                const packageFilePath = `${pluginPath}${path.sep}package.json`;
                const packageName = Util.getPackageName(packageFilePath);
                if (plugin.package !== packageName) {
                    logger.error(`Can't load the plugin ${plugin.package} due to the specified package name in ${pluginYamlFilePath} `
                        + `is not consistent with the real package name in ${packageFilePath}`);
                    continue;
                }

                // Load plugin
                const ZoweChatPlugin = require(pluginPath);

                // Create and register listeners
                plugin.listeners = [];
                let files = fs.readdirSync(`${pluginPath}${path.sep}listeners`, {withFileTypes: true});
                for (const file of files) {
                    if (file.isFile() && file.name.endsWith('.js')) { // .js file
                        const listenerName = file.name.replace('.js', '');

                        // Create listener
                        if (ZoweChatPlugin[listenerName] !== undefined) {
                            if (ZoweChatPlugin[listenerName].prototype instanceof ChatMessageListener) {
                                this.botMessageListener.registerChatListener({
                                    'listenerName': listenerName,
                                    'listenerType': IChatListenerType.MESSAGE,
                                    'listenerInstance': new ZoweChatPlugin[listenerName](),
                                    'chatPlugin': plugin,
                                });

                                plugin.listeners.push(listenerName);
                            } else if (ZoweChatPlugin[listenerName].prototype instanceof ChatEventListener) {
                                this.botEventListener.registerChatListener({
                                    'listenerName': listenerName,
                                    'listenerType': IChatListenerType.EVENT,
                                    'listenerInstance': new ZoweChatPlugin[listenerName](),
                                    'chatPlugin': plugin,
                                });

                                plugin.listeners.push(listenerName);
                            } else {
                                logger.error(`The listener "${listenerName}" is not supported by Zowe Chat!`);
                            }
                        } else {
                            logger.error(`The listener "${listenerName}" is not exported by the plugin ${plugin.package}!`);
                        }
                    }
                }

                // Load translation resources
                plugin.resources = [];
                files = fs.readdirSync(`${pluginPath}${path.sep}i18n${path.sep}en_US`, {withFileTypes: true});
                for (const file of files) {
                    if (file.isFile() && file.name.endsWith('.json')) { // JSON translation file
                        logger.debug(`Loading translation resource: ${file.name} ...`);
                        plugin.resources.push({
                            namespace: file.name.replace('.json', ''),
                            loadPath: `${pluginPath}${path.sep}i18n${path.sep}{{lng}}${path.sep}${file.name}`,
                        });
                    }
                }
                this.chatResource.addResource(plugin.resources);
            }
        } catch (error) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(error.name), error));
        } finally {
            // Print end log
            logger.end(this.loadPlugins, this);
        }
    }
}

// Create instance
// const chatBot = ChatBot.getInstance();
// Object.freeze(chatBot);

export = ChatBot;

