/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import { List, IZosFilesResponse } from '@zowe/zos-files-for-zowe-sdk';
import { ISession, Session, SessConstants } from '@zowe/imperative';
import i18next from 'i18next';

import {
  logger,
  Util,
  IMessage,
  IMessageType,
  IChatToolType,
  IExecutor,
  config,
  ChatHandler,
  IBotOption,
  IBotLimit,
  ICommand,
  IMsteamsBotLimit,
  IMattermostBotLimit,
  ISlackBotLimit,
  ChatPrincipal,
} from '@zowe/chat';

import ZosDatasetSlackView from './ZosDatasetSlackView';
import ZosDataseMattermostView from './ZosDatasetMattermostView';
import ZosDatasetMsteamsView from './ZosDatasetMsteamsView';

class ZosDatasetListHandler extends ChatHandler {
  private view: ZosDatasetSlackView | ZosDataseMattermostView | ZosDatasetMsteamsView = null;

  constructor(botOption: IBotOption, botLimit: IBotLimit) {
    super(botOption, botLimit);

    this.getDataset = this.getDataset.bind(this);
    this.getDatasetMember = this.getDatasetMember.bind(this);

    if (botOption.chatTool.type === IChatToolType.SLACK) {
      this.view = new ZosDatasetSlackView(botOption, <ISlackBotLimit>botLimit);
    } else if (botOption.chatTool.type === IChatToolType.MATTERMOST) {
      this.view = new ZosDataseMattermostView(botOption, <IMattermostBotLimit>botLimit);
    } else if (botOption.chatTool.type === IChatToolType.MSTEAMS) {
      this.view = new ZosDatasetMsteamsView(botOption, <IMsteamsBotLimit>botLimit);
    }
  }

  // Get command view for command 'zos dataset list status'
  async getDataset(command: ICommand, executor: IExecutor): Promise<IMessage[]> {
    // Print start log
    logger.start(this.getDataset, this);

    let messages: IMessage[] = [];
    try {
      const auth: ChatPrincipal = <ChatPrincipal>command.extraData.principal;
      const zosmfConfig = config.getZosmfServerConfig();

      // Get positional argument - dataset name
      const positionalArgument = command.adjective.arguments;
      let name: string = null;
      if (positionalArgument.length > 0) {
        name = positionalArgument[0];
      }
      logger.debug(`name: ${name}`);

      const options = command.adjective.option;

      // Get option dsname-level -- optional
      let dsNameLevel: string = null;
      if (options['dsname-level'] !== undefined) {
        dsNameLevel = options['dsname-level'];
      } else if (options['dl'] !== undefined) {
        dsNameLevel = options['dl'];
      }
      logger.debug(`dsname-Level: ${dsNameLevel}`);

      if (name === null && dsNameLevel === null) {
        return (messages = [
          {
            type: IMessageType.PLAIN_TEXT,
            message: i18next.t('common.error.missing.argumentOrOption', {
              argumentName: 'dataset name',
              optionName: 'dsname-level',
              ns: 'ZosMessage',
            }),
          },
        ]);
      }

      // Get option volume-serial -- Optional
      let volumeSerial: string = null;
      if (options['volume-serial'] !== undefined) {
        volumeSerial = options['volume-serial'];
      } else if (options['vs'] !== undefined) {
        volumeSerial = options['vs'];
      }
      logger.debug(`volume-serial: ${volumeSerial}`);

      // Get option start -- Optional
      let start: string = null;
      if (options['start'] !== undefined) {
        start = options['start'];
      } else if (options['s'] !== undefined) {
        start = options['s'];
      }
      logger.debug(`start: ${start}`);

      // Get option limit -- Optional
      let limit: string = null;
      if (options['limit'] !== undefined) {
        limit = options['limit'];
      } else {
        limit = String(config.getConfig().chatServer.limit.record);
      }
      logger.debug(`limit: ${limit}`);

      // Check if limit value is valid.
      if (limit === null || limit === undefined || limit.trim() === '' || isNaN(Number(limit))) {
        return (messages = [
          {
            type: IMessageType.PLAIN_TEXT,
            message: i18next.t('common.error.invalid.format', { optionName: 'limit', ns: 'ZosMessage' }),
          },
        ]);
      }

      let ru = true;
      if (zosmfConfig?.rejectUnauthorized !== undefined) {
        ru = zosmfConfig.rejectUnauthorized;
      }

      // session to connect Zosmf REST API.
      const sessionInfo: ISession = {
        hostname: zosmfConfig.hostName,
        port: Number(zosmfConfig.port + '').valueOf(),
        user: auth.getUser().getMainframeUser(),
        password: auth.getCredentials().value,
        type: SessConstants.AUTH_TYPE_BASIC,
        rejectUnauthorized: ru,
      };
      const session = new Session(sessionInfo);

      /* Because dataset name in zosmf Rest API support wildcard, positional argument dataset name leverage this functionality
       * by querying dataset with this dataset name using zosmf.
       * So we query datasets with dataset name and dsname level separately, then merge them. */
      // Query with dataset name
      let resOfQueryWithName: IZosFilesResponse = null;
      if (name !== null) {
        resOfQueryWithName = await List.dataSet(session, encodeURIComponent(name), {
          volume: volumeSerial,
          attributes: true,
          start: start,
          maxLength: Number(limit).valueOf(),
        });
      }

      // Query with dsname level
      let resOfQueryWithDsNameLevel: IZosFilesResponse = null;
      if (dsNameLevel !== null) {
        resOfQueryWithDsNameLevel = await List.dataSet(session, encodeURIComponent(dsNameLevel), {
          volume: volumeSerial,
          attributes: true,
          start: start,
          maxLength: Number(limit).valueOf(),
        });
      }

      // Get the list of datasets
      let datasets: Record<string, unknown>[] = [];
      // At least one of responseForName or responseForDsNameLevel is not null because One of name or dsname level is required.
      if (resOfQueryWithName !== null && resOfQueryWithDsNameLevel !== null) {
        if (resOfQueryWithName.apiResponse.items.length > 0 && resOfQueryWithDsNameLevel.apiResponse.items.length > 0) {
          for (const ds1 of resOfQueryWithDsNameLevel.apiResponse.items) {
            for (const ds2 of resOfQueryWithName.apiResponse.items) {
              if (ds1.dsname === ds2.dsname) {
                datasets.push(ds1);
                break;
              }
            }
          }
        } else if (resOfQueryWithName.apiResponse.items.length > 0) {
          // Only query with dsname level get result.
          datasets = resOfQueryWithName.apiResponse.items;
        } else {
          datasets = resOfQueryWithDsNameLevel.apiResponse.items; // Only query with data set name get result.
        }
      } else if (resOfQueryWithName === null) {
        datasets = resOfQueryWithDsNameLevel.apiResponse.items;
      } else {
        datasets = resOfQueryWithName.apiResponse.items;
      }

      // If dataset name is provided in positional argument with no wildcard, filter dataset list to exactly match.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (name !== null && name.indexOf('*') === -1 && name.indexOf('**') === -1 && name.indexOf('%') === -1) {
        for (const ds of datasets) {
          if (ds.dsname === name.toUpperCase()) {
            datasets = [];
            datasets.push(ds);
            break;
          }
        }
      }

      logger.debug(`Got ${datasets.length} datasets.`);

      if (
        name !== null &&
        name.indexOf('*') === -1 &&
        name.indexOf('**') === -1 &&
        name.indexOf('%') === -1 &&
        datasets.length === 1
      ) {
        messages = this.view.getDetail(datasets, executor, command);
      } else {
        messages = this.view.getOverview(datasets, executor, command);
      }

      return messages;
    } catch (error) {
      // Got RestClientError: z/OSMF REST API Error
      let message = i18next.t('common.error.internal', { ns: 'ZosMessage' });
      if (error.errorCode !== undefined && error.mDetails !== undefined && error.mDetails.causeErrors !== undefined) {
        const causeErrors = JSON.parse(error.mDetails.causeErrors);
        if (causeErrors.message !== undefined && causeErrors.message !== '') {
          message = i18next.t('common.error.restAPI', { ns: 'ZosMessage', message: causeErrors.message });
        }
      }

      logger.error(Util.getErrorMessage('ZWECC001E', { error: 'Zos dataset list handler exception', ns: 'ChatMessage' }));
      logger.error(logger.getErrorStack(new Error(error.name), error));

      return (messages = [
        {
          type: IMessageType.PLAIN_TEXT,
          message: message,
        },
      ]);
    } finally {
      // Print end log
      logger.end(this.getDataset, this);
    }
  }

  // Get command view for command 'zos dataset list member'
  async getDatasetMember(command: ICommand, executor: IExecutor): Promise<IMessage[]> {
    // Print start log
    logger.start(this.getDatasetMember, this);

    let messages: IMessage[] = [];
    try {
      const auth: ChatPrincipal = <ChatPrincipal>command.extraData.principal;
      const zosmfConfig = config.getZosmfServerConfig();

      // Get positional argument - dataset member name
      const positionalArgument = command.adjective.arguments;
      let name: string = null;
      if (positionalArgument.length > 0) {
        name = positionalArgument[0];
        logger.debug(`datasetMemberName: ${name}`);
      }

      const options = command.adjective.option;

      // Get option dataset-name -- Required
      let datasetName: string = null;
      if (options['dataset-name'] !== undefined) {
        datasetName = options['dataset-name'];
      } else if (options['dn'] !== undefined) {
        datasetName = options['dn'];
      }
      logger.debug(`dataset-name: ${datasetName}`);
      if (datasetName === null) {
        return (messages = [
          {
            type: IMessageType.PLAIN_TEXT,
            message: i18next.t('common.error.missing.Option', { optionName: 'dataset-name', ns: 'ZosMessage' }),
          },
        ]);
      }

      // Get option limit -- Optional
      let limit: string = null;
      if (options['limit'] !== undefined) {
        limit = options['limit'];
      } else {
        limit = String(config.getConfig().chatServer.limit.record);
      }
      logger.debug(`limit: ${limit}`);

      // Check if limit value is valid.
      if (limit === null || limit === undefined || limit.trim() === '' || isNaN(Number(limit))) {
        return (messages = [
          {
            type: IMessageType.PLAIN_TEXT,
            message: i18next.t('common.error.invalid.format', { optionName: 'limit', ns: 'ZosMessage' }),
          },
        ]);
      }

      let ru = true;
      if (zosmfConfig?.rejectUnauthorized !== undefined) {
        ru = zosmfConfig.rejectUnauthorized;
      }

      // session to connect Zosmf REST API.
      const sessionInfo: ISession = {
        hostname: zosmfConfig.hostName,
        port: Number(zosmfConfig.port + '').valueOf(),
        user: auth.getUser().getMainframeUser(),
        password: auth.getCredentials().value,
        type: SessConstants.AUTH_TYPE_BASIC,
        rejectUnauthorized: ru,
      };
      const session = new Session(sessionInfo);

      // Get the list of dataset members
      const response: IZosFilesResponse = await List.allMembers(session, datasetName, {
        pattern: name,
        attributes: true,
        maxLength: Number(limit).valueOf(),
      });
      logger.debug(`Got ${response.apiResponse.returnedRows} dataset member`);

      if (name !== null && name.indexOf('*') === -1 && name.indexOf('%') === -1 && response.apiResponse.returnedRows === 1) {
        // If member name without wildcard is provided and there is only one dataset, show detail view.
        messages = this.view.getMemberDetail(response.apiResponse.items, executor);
      } else {
        messages = this.view.getMemberOverview(response.apiResponse.items, executor, command);
      }

      return messages;
    } catch (error) {
      // Got RestClientError: z/OSMF REST API Error
      let message = i18next.t('common.error.internal', { ns: 'ZosMessage' });
      if (error.errorCode !== undefined && error.mDetails !== undefined && error.mDetails.causeErrors !== undefined) {
        const causeErrors = JSON.parse(error.mDetails.causeErrors);
        if (causeErrors.message !== undefined && causeErrors.message !== '') {
          message = i18next.t('common.error.restAPI', { ns: 'ZosMessage', message: causeErrors.message });
        }
      }

      logger.error(Util.getErrorMessage('ZWECC001E', { error: 'Zos dataset list handler exception', ns: 'ChatMessage' }));
      logger.error(logger.getErrorStack(new Error(error.name), error));

      return (messages = [
        {
          type: IMessageType.PLAIN_TEXT,
          message: message,
        },
      ]);
    } finally {
      // Print end log
      logger.end(this.getDatasetMember, this);
    }
  }
}

export = ZosDatasetListHandler;
