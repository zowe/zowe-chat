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

import Config = require('../common/Config');
import Logger = require('../utils/Logger');
import EventListener = require('../listener/EventListener');
import MessageListener = require('../listener/MessageListener');
import CommonBot from 'commonbot';

const logger = Logger.getInstance();
const config = Config.getInstance();

class ChatBot {
    private static instance: ChatBot;
    private botOption: IBotOption;
    private bot: CommonBot;
    private plugins: IChatPlugin[];
    private messageListener: MessageListener;
    private eventListener: EventListener;

    private constructor() {
        try {
            logger.debug(`Zowe Chat Config: \n ${JSON.stringify(config.getConfig(), null, 4)}`);

            this.botOption = config.getBotOption();
            this.bot = new CommonBot(this.botOption);
            this.plugins = [];
            this.messageListener = new MessageListener();
            this.eventListener = new EventListener();

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
    run(): void {
        // Print start log
        logger.start(this.run, this);

        try {
            // Load plugins
            logger.info('Load Zowe Chat plugins ...');
            this.loadPlugins();

            // Start server
            const app = config.getMessagingApp();
            if (app !== null) {
                logger.info('Start messaging server ...');
                app.startServer();
            }

            // Register listeners
            logger.info('Register message listeners ...');
            this.bot.listen(this.messageListener.matchMessage, this.messageListener.processMessage);


            // Register routers
            logger.info('Register event routers ...');
            this.bot.route(this.botOption.messagingApp.option.basePath, this.eventListener.processEvent);

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

            // Sort plugin per priority in descend order
            this.plugins.sort((a, b)=>b.priority - a.priority);
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
                    logger.error(`The plugin file "${pluginPath}" does not exist!`);
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
                                'listenerInstance': new ZoweChatPlugin[listenerName](logger),
                                'chatPlugin': plugin,
                            });
                        } else if (listenerName.endsWith('EventListener')) {
                            this.eventListener.registerChatListener({
                                'listenerName': listenerName,
                                'listenerType': IChatListenerType.EVENT,
                                'listenerInstance': new ZoweChatPlugin[listenerName](logger),
                                'chatPlugin': plugin,
                            });
                            // this.bot.listen(listener.matchEvent.bind(listener.this), listener.processEvent.bind(listener.this));
                        } else {
                            logger.error(`The listener "${listenerName}" is not supported!`);
                        }
                    }
                }
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

