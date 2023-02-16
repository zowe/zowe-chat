/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import { IChatToolType, ILogOption } from '@zowe/bot';
import { IConfig, IChatServerConfig, IMattermostConfig, IMsteamsConfig, ISlackConfig, IZosmfServerConfig } from '../types/IConfig';
import { Util } from '../utils/Util';
import { EnvironmentVariable } from './EnvironmentVariable';

/**
 * Class which reads the application configuration file (YAML)
 */
class Config {
  private config: IConfig;

  constructor() {
    // Initialize
    this.config = {
      chatServer: null,
      chatTool: null,
      zosmfServer: null,
    };

    // Load chat server config: chatServer.yaml
    this.loadChatServerConfig();

    // Load chat tool config: ./chatTools/...
    this.loadChatToolConfig();

    // Load z/OSMF server config: zosmfServer.yaml
    this.loadZosmfServerConfig();
  }

  public getConfig(): IConfig {
    return this.config;
  }

  public getChatServerConfig(): IChatServerConfig {
    return this.config.chatServer;
  }

  public getChatToolConfig(): IMattermostConfig | ISlackConfig | IMsteamsConfig {
    return this.config.chatTool;
  }

  public getZosmfServerConfig(): IZosmfServerConfig {
    return this.config.zosmfServer;
  }

  public getLogOption(): ILogOption {
    return this.config.chatServer.log;
  }

  // Load chat server configuration file: chatServer.yaml
  private loadChatServerConfig(): void {
    let chatServerConfig: IChatServerConfig = null;

    try {
      const filePath = `${EnvironmentVariable.ZOWE_CHAT_CONFIG_HOME}/chatServer.yaml`;

      // Read chatServer.yaml configuration
      chatServerConfig = <IChatServerConfig>Util.readYamlFile(filePath);
      console.info(`chatServer.yaml:\n ${Util.maskSensitiveInfo(JSON.stringify(chatServerConfig, null, 4))}`);

      // Check result
      if (chatServerConfig === null) {
        // ZWECC003E: Failed to the read the file {{filePath}}
        console.error(`ZWECC003E: Failed to the read the file ${filePath}`);
        process.exit(1);
      }

      // Set chat server config
      this.config.chatServer = chatServerConfig;
    } catch (error) {
      // ZWECC001E: Internal server error: {{error}}
      console.error(Util.getErrorMessage('ZWECC001E', { error: 'Chat server configure loading exception', ns: 'ChatMessage' }));
      console.error(error.stack);

      process.exit(2);
    }

    return;
  }

  // Load chat tool configuration file
  private loadChatToolConfig(): IMattermostConfig | ISlackConfig | IMsteamsConfig {
    let chatToolConfig: IMattermostConfig | ISlackConfig | IMsteamsConfig = null;

    try {
      let filePath = '';

      // Load chat tool configuration
      if (this.config.chatServer.chatToolType === IChatToolType.MATTERMOST) {
        // Read mattermost.yaml
        filePath = `${EnvironmentVariable.ZOWE_CHAT_CONFIG_HOME}/chatTools/mattermost.yaml`;
        chatToolConfig = <IMattermostConfig>Util.readYamlFile(filePath);
        console.info(`chatTools/mattermost.yaml:\n ${Util.maskSensitiveInfo(JSON.stringify(chatToolConfig, null, 4))}`);
      } else if (this.config.chatServer.chatToolType === IChatToolType.SLACK) {
        // Read slack.yaml
        filePath = `${EnvironmentVariable.ZOWE_CHAT_CONFIG_HOME}/chatTools/slack.yaml`;
        chatToolConfig = <IMattermostConfig>Util.readYamlFile(filePath);
        console.info(`chatTools/slack.yaml:\n ${Util.maskSensitiveInfo(JSON.stringify(chatToolConfig, null, 4))}`);
      } else if (this.config.chatServer.chatToolType === IChatToolType.MSTEAMS) {
        // Read msteams.yaml
        filePath = `${EnvironmentVariable.ZOWE_CHAT_CONFIG_HOME}/chatTools/msteams.yaml`;
        chatToolConfig = <IMattermostConfig>Util.readYamlFile(filePath);
        console.info(`chatTools/msteams.yaml:\n ${Util.maskSensitiveInfo(JSON.stringify(chatToolConfig, null, 4))}`);
      } else {
        // ZWECC005E: Unsupported value ${value} for the item ${item}
        console.error(`ZWECC005E: Unsupported value ${this.config.chatServer.chatToolType} for the item chatToolType`);
        process.exit(3);
      }

      // Check result
      if (chatToolConfig === null) {
        // ZWECC003E: Failed to the read the file {{filePath}}
        console.error(`ZWECC003E: Failed to the read the file ${filePath}`);
        process.exit(4);
      }

      // Set chat tool config
      this.config.chatTool = chatToolConfig;
    } catch (error) {
      // ZWECC001E: Internal server error: {{error}}
      console.error(Util.getErrorMessage('ZWECC001E', { error: 'Chat tool configure loading exception', ns: 'ChatMessage' }));
      console.error(error.stack);
      process.exit(5);
    }

    return chatToolConfig;
  }

  // Load z/OSMF server configuration file: zosmfServer.yaml
  private loadZosmfServerConfig(): IZosmfServerConfig {
    let zosmfServerConfig: IZosmfServerConfig = null;

    try {
      const filePath = `${EnvironmentVariable.ZOWE_CHAT_CONFIG_HOME}/zosmfServer.yaml`;

      // Read zosmfServer.yaml configuration
      zosmfServerConfig = <IZosmfServerConfig>Util.readYamlFile(filePath);
      console.info(`zosmfServer.yaml:\n ${Util.maskSensitiveInfo(JSON.stringify(zosmfServerConfig, null, 4))}`);

      // Check result
      if (zosmfServerConfig === null) {
        // ZWECC003E: Failed to the read the file {{filePath}}
        console.error(`ZWECC003E: Failed to the read the file ${filePath}`);
        process.exit(6);
      }

      // Set z/OSMF server config
      this.config.zosmfServer = zosmfServerConfig;
    } catch (error) {
      // ZWECC001E: Internal server error: {{error}}
      console.error(Util.getErrorMessage('ZWECC001E', { error: 'z/OSMF server configure loading exception', ns: 'ChatMessage' }));
      console.error(error.stack);
      process.exit(7);
    }

    return zosmfServerConfig;
  }
}

// Export single instance of Config class
const config = new Config();
Object.freeze(config);
export { config };
