/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import CommonBot, { IBotOption, IChatToolType, IMattermostOption, IProtocol, ISlackOption } from '@zowe/bot';
import * as fs from 'fs-extra';
import * as path from 'path';

import { config } from '../settings/Config';
import { logger } from '../utils/Logger';

import { UserConfigManager } from '../settings/UserConfigManager';
import { EnvironmentVariable } from '../settings/EnvironmentVariable';
import { LogoutMessageListener } from '../listeners/bot/LogoutMessageListener';
import { BotEventListener } from '../listeners/BotEventListener';
import { BotMessageListener } from '../listeners/BotMessageListener';
import { ChatEventListener } from '../listeners/ChatEventListener';
import { ChatMessageListener } from '../listeners/ChatMessageListener';
import { SecurityConfigSchema } from '../security/SecurityConfigSchema';
import { SecurityManager } from '../security/SecurityManager';
import { IChatListenerType, IChatPlugin } from '../types';
import { Util } from '../utils/Util';
import ChatResource from './ChatResource';
import { ChatWebApp } from './ChatWebApp';
import { MessagingApp } from './MessagingApp';
import { IConfig, IMattermostConfig, IMsteamsConfig, ISecurityChallengeMethod, ISlackConfig } from '../types/IConfig';

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
  // Capabilities required by the ChatBot to run, all initialized in constructor
  private readonly security: SecurityManager;
  private readonly configManager: UserConfigManager;
  private messagingApp: MessagingApp;
  private readonly webApp: ChatWebApp;
  private readonly bot: CommonBot;
  private readonly plugins: IChatPlugin[] = [];
  private readonly botMessageListener: BotMessageListener;
  private readonly botEventListener: BotEventListener;
  private readonly chatResource: ChatResource;

  /**
   * Private constructor for ChatBot object initialization, only intended for use by {@link getInstance()}
   *
   * Requires {@link AppConfig} and {@link Logger} in order to complete initialization. This constructor will
   * initialize all major components of Zowe Chat, i.e. the CommonBot framework, Zowe Chat plugins, the UI, REST, and Messaging Server,
   *
   * {@link run()} must be run by the caller after receiving an instance to begin listening for chat messages and events
   *
   */
  constructor() {
    try {
      const cfg = config.getConfig();
      logger.silly(`Zowe Chat Config: \n ${JSON.stringify(cfg, null, 4)}`);

      // built-in config schemas and security manager. future: add plugin config schemas, if present
      logger.debug('Creating security manager ...');
      const blockConfigList = [SecurityConfigSchema];
      this.configManager = new UserConfigManager({ sections: blockConfigList });
      this.security = new SecurityManager(this.configManager);

      // Messaging App
      this.messagingApp = null; // messagingApp will be created on demand when bot option is generated

      // Web app
      if (cfg.chatServer.securityChallengeMethod === ISecurityChallengeMethod.WEBAPP) {
        logger.debug('Creating web app ...');
        this.webApp = new ChatWebApp(cfg.chatServer.webApp, this.security);
      } else {
        this.webApp = null;
      }

      // Commonbot
      logger.info('Creating CommonBot ...');
      const botOption = this.generateBotOption(cfg);
      this.bot = new CommonBot(botOption);

      // Bot Listener
      logger.info('Creating bot listener ...');
      this.botMessageListener = new BotMessageListener(this.security, this.webApp);
      this.botEventListener = new BotEventListener(this.security, this.webApp);

      // Plugins
      logger.info('Creating plugin pool ...');
      this.plugins = [];

      // Translation resources
      logger.info('Creating translation resource ...');
      this.chatResource = new ChatResource();
    } catch (error) {
      // ZWECC001E: Internal server error: {{error}}
      logger.error('ZWECC001E: Internal server error: Chatbot creation exception');
      logger.error(logger.getErrorStack(new Error(error.name), error));
      throw error;
    }
  }

  // Run chat bot
  async run(): Promise<void> {
    // Print start log
    logger.start(this.run, this);

    try {
      // Load plugin
      this.loadInternalMessageListeners();
      logger.info('Load Zowe Chat plugins ...');
      this.loadPlugin();

      // Load translation resources
      logger.info('Load translation resources ...');
      await this.chatResource.initialize();

      // Start webApp server
      if (this.webApp !== null) {
        logger.info('Start webApp server ...');
        this.webApp.startServer();
      }

      // Start messaging server
      if (this.messagingApp !== null) {
        logger.info('Start messaging server ...');
        this.messagingApp.startServer();
      }

      // Register listeners
      logger.info('Register message listeners ...');
      this.bot.listen(this.botMessageListener.matchMessage, this.botMessageListener.processMessage);

      // Register routers
      logger.info('Register event routers ...');
      this.bot.route(this.bot.getOption().messagingApp.option.basePath, this.botEventListener.processEvent);
    } catch (error) {
      // ZWECC001E: Internal server error: {{error}}
      logger.error(Util.getErrorMessage('ZWECC001E', { error: 'Run Zowe chat bot exception', ns: 'ChatMessage' }));
      logger.error(logger.getErrorStack(new Error(error.name), error));
      throw error;
    } finally {
      // Print end log
      logger.end(this.run, this);
    }
  }

  /**
   * Sets listeners which are part of the core Zowe Chat service.
   */
  private loadInternalMessageListeners(): void {
    logger.start(this.loadInternalMessageListeners, this);

    this.botMessageListener.registerChatListener({
      listenerName: 'LogoutListener',
      listenerType: IChatListenerType.MESSAGE,
      listenerInstance: new LogoutMessageListener(this.security),
      chatPlugin: {
        listeners: ['LogoutMessageListener'],
        package: 'chat',
        registry: 'local',
        version: 1,
        priority: 1,
      },
    });

    logger.end(this.loadInternalMessageListeners, this);
  }

  /**
   * Loads Zowe Chatbot plugins dynamically. Reads the plugin.yaml configuration file to further process plugins.
   *
   * See the plugin.yaml file for more information on plugin loading.
   *
   */
  private loadPlugin(): void {
    // Print start log
    logger.start(this.loadPlugin, this);

    try {
      // Get plugin home
      const pluginHome = EnvironmentVariable.ZOWE_CHAT_PLUGIN_HOME;
      let pluginYamlFilePath = `${pluginHome}${path.sep}plugin.yaml`;
      logger.info(`Zowe Chat plugin home: ${pluginHome}`);

      // Read plugin configuration file
      if (fs.existsSync(pluginYamlFilePath) === false) {
        //  Check zowe chat server configuration folder
        pluginYamlFilePath = `${__dirname}${path.sep}..${path.sep}config${path.sep}plugin.yaml`;
        if (fs.existsSync(pluginYamlFilePath) === false) {
          // ZWECC002E: The file {{filePath}} does not exist
          logger.error(
            Util.getErrorMessage('ZWECC002E', {
              filePath: `${pluginHome}${path.sep}plugin.yaml or ${pluginYamlFilePath}`,
              ns: 'ChatMessage',
            }),
          );
          logger.error(`Skip loading plugins!`);
          return;
        }
      }

      // Read Zowe Chat plugins configuration file
      const pluginList = <IChatPlugin[]>Util.readYamlFile(pluginYamlFilePath);
      logger.info(`${pluginYamlFilePath}:\n${JSON.stringify(this.plugins, null, 4)}`);

      // Sort plugin per priority in ascend order: Priority 1 (Urgent) · Priority 2 (High) · Priority 3 (Medium) · Priority 4 (Low)
      pluginList.sort((a, b) => a.priority - b.priority);
      logger.debug(`Plugins sorted by priority:\n${JSON.stringify(pluginList, null, 4)}`);

      // Load plugins one by one in priority descend order
      for (const plugin of pluginList) {
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
          // ZWECC002E: The file {{filePath}} does not exist
          logger.error(Util.getErrorMessage('ZWECC002E', { filePath: pluginPath, ns: 'ChatMessage' }));
          logger.error(`Can't load the plugin ${plugin.package} due to the plugin file path "${pluginPath}" does not exist!`);
          continue;
        }

        // Verify the consistency of package name
        const packageFilePath = `${pluginPath}${path.sep}package.json`;
        const packageName = Util.getPackageName(packageFilePath);
        if (plugin.package !== packageName) {
          // ZWECC005E: Unsupported value {{value}} for the item {{item}}
          logger.error(Util.getErrorMessage('ZWECC005E', { value: plugin.package, item: 'package', ns: 'ChatMessage' }));
          logger.error(
            `Can't load the plugin ${plugin.package} due to the specified package name in ${pluginYamlFilePath} ` +
              `is not consistent with the real package name in ${packageFilePath}`,
          );
          continue;
        }

        // Load plugin
        const ZoweChatPlugin = require(pluginPath);

        // Create and register listeners
        plugin.listeners = [];
        let files = fs.readdirSync(`${pluginPath}${path.sep}listeners`, { withFileTypes: true });
        for (const file of files) {
          if (file.isFile() && file.name.endsWith('.js')) {
            // .js file
            const listenerName = file.name.replace('.js', '');

            // Create listener
            if (ZoweChatPlugin[listenerName] !== undefined) {
              if (ZoweChatPlugin[listenerName].prototype instanceof ChatMessageListener) {
                this.botMessageListener.registerChatListener({
                  listenerName: listenerName,
                  listenerType: IChatListenerType.MESSAGE,
                  listenerInstance: new ZoweChatPlugin[listenerName](),
                  chatPlugin: plugin,
                });

                plugin.listeners.push(listenerName);
              } else if (ZoweChatPlugin[listenerName].prototype instanceof ChatEventListener) {
                this.botEventListener.registerChatListener({
                  listenerName: listenerName,
                  listenerType: IChatListenerType.EVENT,
                  listenerInstance: new ZoweChatPlugin[listenerName](),
                  chatPlugin: plugin,
                });

                plugin.listeners.push(listenerName);
              } else {
                // ZWECC005E: Unsupported value {{value}} for the item {{item}}
                logger.error(
                  Util.getErrorMessage('ZWECC005E', { value: listenerName, item: 'Zowe Chat Listener Type', ns: 'ChatMessage' }),
                );
                logger.error(`The listener "${listenerName}" is not supported by Zowe Chat!`);
              }
            } else {
              logger.error(`The listener "${listenerName}" is not exported by the plugin ${plugin.package}!`);
            }
          }
        }

        // Load translation resources
        plugin.resources = [];
        files = fs.readdirSync(`${pluginPath}${path.sep}i18n${path.sep}en_US`, { withFileTypes: true });
        for (const file of files) {
          if (file.isFile() && file.name.endsWith('.json')) {
            // JSON translation file
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
      // ZWECC001E: Internal server error: {{error}}
      logger.error(Util.getErrorMessage('ZWECC001E', { error: 'Zowe Chat plugin loading exception', ns: 'ChatMessage' }));
      logger.error(logger.getErrorStack(new Error(error.name), error));
      throw error;
    } finally {
      // Print end log
      logger.end(this.loadPlugin, this);
    }
  }

  /**
   * Takes configuration options from appConfig and messageApp, and converts them to configuration format for CommonBot.
   *
   * @param config
   * @returns
   */
  private generateBotOption(config: IConfig): IBotOption {
    // Print start log
    logger.start(this.generateBotOption, this);

    let botOption: IBotOption = null;
    try {
      // Read chat tool configuration
      if (config.chatServer.chatToolType === IChatToolType.MATTERMOST) {
        // Get Mattermost config
        const mattermostConfig = { ...(<IMattermostConfig>config.chatTool) };
        mattermostConfig.messagingApp = undefined;

        // Generate Mattermost option
        botOption = {
          messagingApp: {
            option: (<IMattermostConfig>config.chatTool).messagingApp,
            app: null,
          },
          chatTool: {
            type: IChatToolType.MATTERMOST,
            option: mattermostConfig,
          },
        };

        // Read certificate
        if (mattermostConfig.protocol.toLowerCase() === IProtocol.HTTPS) {
          if (fs.existsSync(mattermostConfig.tlsCertificate)) {
            (<IMattermostOption>botOption.chatTool.option).tlsCertificate = fs.readFileSync(mattermostConfig.tlsCertificate, 'utf8');
          } else {
            // ZWECC002E: The file {{filePath}} does not exist
            logger.error(Util.getErrorMessage('ZWECC002E', { filePath: mattermostConfig.tlsCertificate, ns: 'ChatMessage' }));
            throw new Error('Could not load the mattermost tlsCertificate');
          }
        }

        // Create messaging app
        this.messagingApp = new MessagingApp(botOption.messagingApp.option);
        botOption.messagingApp.app = this.messagingApp.getApplication();
      } else if (config.chatServer.chatToolType === IChatToolType.SLACK) {
        // Get slack config
        const slackConfig = { ...(<ISlackConfig>config.chatTool) };

        // Generate slack option
        const option: ISlackOption = {
          botUserName: config.chatTool.botUserName,
          signingSecret: slackConfig.signingSecret,
          endpoints: '',
          receiver: null,
          token: slackConfig.token,
          logLevel: config.chatServer.log.level,
          socketMode: true,
          appToken: null,
        };
        if (slackConfig.socketMode.enabled === false && slackConfig.httpEndpoint.enabled === true) {
          // Http endpoint mode
          option.endpoints = slackConfig.httpEndpoint.messagingApp.basePath;
          option.receiver = null; // The value will be updated by Common Bot Framework
          option.socketMode = false;

          botOption = {
            messagingApp: {
              option: slackConfig.httpEndpoint.messagingApp,
              app: null,
            },
            chatTool: {
              type: IChatToolType.SLACK,
              option: option,
            },
          };

          // Create messaging app
          this.messagingApp = new MessagingApp(botOption.messagingApp.option);
          botOption.messagingApp.app = this.messagingApp.getApplication();
        } else {
          // Socket mode
          option.appToken = slackConfig.socketMode.appToken;

          botOption = {
            messagingApp: {
              option: slackConfig.httpEndpoint.messagingApp,
              app: null,
            },
            chatTool: {
              type: IChatToolType.SLACK,
              option: option,
            },
          };
        }
      } else if (config.chatServer.chatToolType === IChatToolType.MSTEAMS) {
        // Get Microsoft Teams config
        const msteamsConfig = { ...(<IMsteamsConfig>config.chatTool) };

        // Generate Microsoft Teams option
        botOption = {
          messagingApp: {
            option: msteamsConfig.messagingApp,
            app: null,
          },
          chatTool: {
            type: IChatToolType.MSTEAMS,
            option: {
              botUserName: msteamsConfig.botUserName,
              botId: msteamsConfig.botId,
              botPassword: msteamsConfig.botPassword,
            },
          },
        };

        // Create messaging app
        this.messagingApp = new MessagingApp(botOption.messagingApp.option);
        botOption.messagingApp.app = this.messagingApp.getApplication();
      } else {
        // ZWECC005E: Unsupported value ${value} for the item ${item}
        logger.error(
          Util.getErrorMessage('ZWECC005E', { value: config.chatServer.chatToolType, item: 'chatToolType', ns: 'ChatMessage' }),
        );
        throw new Error('Could not find a supporter chatToolType');
      }
    } catch (error) {
      // ZWECC001E: Internal server error: {{error}}
      logger.error(Util.getErrorMessage('ZWECC001E', { error: 'Chat tool configuration exception', ns: 'ChatMessage' }));
      logger.error(logger.getErrorStack(new Error(error.name), error));
      throw error;
    } finally {
      // Print end log
      logger.end(this.generateBotOption, this);
    }

    return botOption;
  }
}

// Export single instance of Config class
const chatBot = new ChatBot();
Object.freeze(chatBot);
export { chatBot };
