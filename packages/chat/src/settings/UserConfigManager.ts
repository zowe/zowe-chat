/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import * as fs from 'fs-extra';
import { logger } from '../utils/Logger';
import { IChatConfigSchema, IConfigBlockDefinition } from '../types/IChatConfigSchema';
import { Util } from '../utils/Util';

export class UserConfigManager {
  // TODO: Drop config schema as a member variable? Is it only needed during init?
  private readonly configSchema: IChatConfigSchema;
  private readonly configData: any;
  private readonly configFilePath: string;

  constructor(aggregateConfig: IChatConfigSchema) {
    this.configSchema = aggregateConfig;
    // TODO: need more discussion on whether we should support user configuration in v1 // = appConfig.app.extendedConfigDir;
    let userConfigDir;
    if (userConfigDir === undefined) {
      userConfigDir = './_config';
    }

    try {
      fs.ensureDirSync(userConfigDir);
      if (userConfigDir.endsWith('/')) {
        userConfigDir = userConfigDir.substring(0, userConfigDir.length - 1);
      }
      fs.ensureFileSync(`${userConfigDir}/user.yaml`);
      this.configFilePath = `${userConfigDir}/user.yaml`;
    } catch (error) {
      // ZWECC001E: Internal server error: {{error}}
      logger.error(Util.getErrorMessage('ZWECC001E', { error: 'User config manager create exception', ns: 'ChatMessage' }));
      logger.error(logger.getErrorStack(new Error(error.name), error));

      logger.error(
        `Error creating file within directory: ${userConfigDir}. Please ensure this directory exists and Zowe Chat can write to it.`,
      );
      logger.debug(`Error details: ${error}`);
      throw Error('Unable to initialize the runtime config manager. See Log for details.');
    }

    const configContents = fs.readJSONSync(`${this.configFilePath}`, { throws: false });
    if (configContents == null) {
      this.configData = this.generateConfig(this.configSchema);
    } else {
      this.configData = configContents;
    }
    this.validateConfig();
    this.writeConfigFile();
  }

  private generateConfig(schema: IChatConfigSchema) {
    const config: any = {};
    for (const block of schema.sections) {
      config[block.key] = {};
    }
    return config;
  }

  public updateConfig(schemaBlock: IConfigBlockDefinition, config: any): void {
    this.configData[schemaBlock.key] = config;
    this.writeConfigFile();
  }

  public getConfigFromSchema(schemaBlock: IConfigBlockDefinition): any {
    return this.configData[schemaBlock.key];
  }

  private writeConfigFile(): void {
    fs.writeJSONSync(this.configFilePath, this.configData, { spaces: 2 });
  }

  // TODO: move validation as a function of ConfigSchema??
  private validateConfig(): void {
    for (const block of this.configSchema.sections) {
      this.validateProperties(block.properties, [block.key]);
    }
  }

  // TODO: better type checking for properties
  private validateProperties(properties: any, accessPrefix: string[]): void {
    let context = this.configData;
    for (const prefix of accessPrefix) {
      context = context[`${prefix}`];
    }
    for (const property of Object.keys(properties)) {
      if (context[property] === undefined) {
        // check for sub-properties first
        if (properties[property].type === 'object' && properties[property].properties !== undefined) {
          context[property] = {};
          this.validateProperties(properties[property].properties, accessPrefix.concat([property]));
        } else if (properties[property].default !== undefined) {
          context[property] = properties[property].default;
        }
      }
    }
  }
}
