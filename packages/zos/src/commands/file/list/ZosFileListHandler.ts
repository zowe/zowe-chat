/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import { IZosFilesResponse, List } from '@zowe/zos-files-for-zowe-sdk';
import { ISession, Session, SessConstants } from '@zowe/imperative';
import i18next from 'i18next';

import {
  logger,
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
  Util,
} from '@zowe/chat';

import ZosFileSlackView from './ZosFileSlackView';
import ZosFileMattermostView from './ZosFileMattermostView';
import ZosFileMsteamsView from './ZosFileMsteamsView';

class ZosFileHandler extends ChatHandler {
  private view: ZosFileSlackView | ZosFileMattermostView | ZosFileMsteamsView = null;

  constructor(botOption: IBotOption, botLimit: IBotLimit) {
    super(botOption, botLimit);

    this.getFile = this.getFile.bind(this);
    this.getMounts = this.getMounts.bind(this);

    if (botOption.chatTool.type === IChatToolType.SLACK) {
      this.view = new ZosFileSlackView(botOption, <ISlackBotLimit>botLimit);
    } else if (botOption.chatTool.type === IChatToolType.MATTERMOST) {
      this.view = new ZosFileMattermostView(botOption, <IMattermostBotLimit>botLimit);
    } else if (botOption.chatTool.type === IChatToolType.MSTEAMS) {
      this.view = new ZosFileMsteamsView(botOption, <IMsteamsBotLimit>botLimit);
    }
  }

  // Get command view for command 'zos file list status'
  async getFile(command: ICommand, executor: IExecutor): Promise<IMessage[]> {
    // Print start log
    logger.start(this.getFile, this);

    let messages: IMessage[] = [];
    try {
      const auth: ChatPrincipal = <ChatPrincipal>command.extraData.principal;
      const zosmfConfig = config.getZosmfServerConfig();

      // Get positional argument - file/directory name
      const positionalArgument = command.adjective.arguments;
      let fileName: string = null;
      if (positionalArgument.length > 0) {
        fileName = positionalArgument[0];
      }

      const options = command.adjective.option;

      // Get option path -- optional
      let path: string = null;
      if (options['path'] !== undefined) {
        path = options['path'];
      } else if (options['p'] !== undefined) {
        path = options['p'];
      }
      logger.debug(`path: ${path}`);

      if (path === null) {
        return (messages = [
          {
            type: IMessageType.PLAIN_TEXT,
            message: i18next.t('common.error.missing.Option', { optionName: 'path', ns: 'ZosMessage' }),
          },
        ]);
      }
      if (typeof path !== 'string') {
        return (messages = [
          {
            type: IMessageType.PLAIN_TEXT,
            message: i18next.t('common.error.invalid.format', { optionName: 'path', ns: 'ZosMessage' }),
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

      // Get the list of files
      const response: IZosFilesResponse = await List.fileList(
        session,
        path,
        // Retrieve all files and filter in case file name is provided with wildcard in positional argument
        // {maxLength: Number(limit).valueOf()});
        {},
      );
      logger.debug(`Got ${response.apiResponse.returnedRows} uss files`);

      if (response.apiResponse.returnedRows === 1) {
        // Only 1 record (path is a specific file, show overview view.
        messages = this.view.getDetail(response.apiResponse.items, executor);
      } else {
        // Path is is directory.
        const files = [];
        if (fileName) {
          // Positional argument is provided.
          if (fileName.indexOf('*') === -1 && fileName.indexOf('?') === -1) {
            // No wildcard in filename, exactly match
            for (const file of response.apiResponse.items) {
              if (file.name === fileName) {
                files.push(file);
                break;
              }
            }
            messages = this.view.getDetail(files, executor);
          } else {
            // Contain wildcard in filename
            let fileNameWithWildCard = fileName.replace('+', '\\+'); // Replace special character +
            fileNameWithWildCard = fileNameWithWildCard.replace('.', '\\.'); // Replace special character .
            fileNameWithWildCard = fileNameWithWildCard.replace('?', '.'); // Replace ? with Regex . to match any single character
            fileNameWithWildCard = fileNameWithWildCard.replace('*', '.*'); // Replace * with .* to match any single character 0 or more times

            const regex = new RegExp(fileNameWithWildCard);
            const files = [];
            for (const file of response.apiResponse.items) {
              if (regex.test(file.name)) {
                files.push(file);
              }
              if (files.length >= Number(limit).valueOf()) {
                break;
              }
            }
            messages = this.view.getOverview(files, executor, command);
          }
        } else {
          // No Positional argument, show overview view.
          let files = response.apiResponse.items;
          if (response.apiResponse.items.length > 0) {
            if (response.apiResponse.items.length < Number(limit).valueOf()) {
              files = response.apiResponse.items;
            } else {
              files = response.apiResponse.items.slice(0, Number(limit).valueOf());
            }
          }
          messages = this.view.getOverview(files, executor, command);
        }
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

      logger.error(Util.getErrorMessage('ZWECC001E', { error: 'Zos file list handler exception', ns: 'ChatMessage' }));
      logger.error(logger.getErrorStack(new Error(error.name), error));

      return (messages = [
        {
          type: IMessageType.PLAIN_TEXT,
          message: message,
        },
      ]);
    } finally {
      // Print end log
      logger.end(this.getFile, this);
    }
  }

  // Get command view for command 'zos file list mounts'
  async getMounts(command: ICommand, executor: IExecutor): Promise<IMessage[]> {
    // Print start log
    logger.start(this.getMounts, this);

    let messages: IMessage[] = [];
    try {
      const auth: ChatPrincipal = <ChatPrincipal>command.extraData.principal;
      const zosmfConfig = config.getZosmfServerConfig();

      // Get positional argument - file system name
      const positionalArgument = command.adjective.arguments;
      let fileSystemName: string = null;
      if (positionalArgument.length > 0) {
        fileSystemName = positionalArgument[0];
        logger.debug(`fileSystemName:${fileSystemName}`);
      }

      const options = command.adjective.option;

      // Get option mount-point -- Optional
      let mountPoint: string = null;
      if (options['mount-point'] !== undefined) {
        mountPoint = options['mount-point'];
      } else if (options['mp'] !== undefined) {
        mountPoint = options['mp'];
      }

      logger.debug(`mount-point:${mountPoint}`);

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

      // Get the list of file systems
      let fileSystems = [];
      let response;
      if (mountPoint !== null) {
        // mount point is provided, query with mount point
        response = await List.fsWithPath(session, {
          path: mountPoint,
          fsname: null,
          maxLength: 0,
        });
        if (fileSystemName === null) {
          fileSystems = response.apiResponse.items;
          if (response.apiResponse.items.length > 0) {
            if (response.apiResponse.items.length < Number(limit).valueOf()) {
              fileSystems = response.apiResponse.items;
            } else {
              fileSystems = response.apiResponse.items.slice(0, response.apiResponse.items.length);
            }
          }
        } else {
          // filter all file systems with fileSystemName.
          fileSystems = this.filterFileSystemByName(response.apiResponse.items, fileSystemName, Number(limit).valueOf());
        }
      } else {
        // mount point is not provided.
        if (fileSystemName !== null) {
          // positional argument fileSystemName is provided.
          if (fileSystemName.indexOf('*') === -1 && fileSystemName.indexOf('?') === -1) {
            // positional argument fileSystemName without wildcard is provided
            response = await List.fs(session, {
              path: null,
              fsname: fileSystemName,
              maxLength: Number(limit).valueOf(),
            });
            fileSystems = response.apiResponse.items;
          } else {
            // positional argument fileSystemName with wildcard is provided, query all file systems.
            response = await List.fs(session, {
              path: null,
              fsname: null,
              maxLength: 0,
            });
            // filter all file systems with fileSystemName.
            fileSystems = this.filterFileSystemByName(response.apiResponse.items, fileSystemName, Number(limit).valueOf());
          }
        } else {
          // fileSystemName and mount point are all not provided.
          response = await List.fs(session, {
            path: null,
            fsname: null,
            maxLength: Number(limit).valueOf(),
          });
          fileSystems = response.apiResponse.items;
        }
      }

      logger.debug(`Got ${fileSystems.length} file systems.`);

      // Show detailView if one file system is found and a mountPoint is provided and a fileSystemName without wildcard is provided
      if (
        fileSystems.length === 1 &&
        (mountPoint !== null || (fileSystemName !== null && fileSystemName.indexOf('*') === -1 && fileSystemName.indexOf('?') === -1))
      ) {
        messages = this.view.getMountsDetail(response.apiResponse.items, executor);
      } else {
        messages = this.view.getMountsOverview(fileSystems, executor, command);
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

      logger.error(Util.getErrorMessage('ZWECC001E', { error: 'Zos file list handler exception', ns: 'ChatMessage' }));
      logger.error(logger.getErrorStack(new Error(error.name), error));

      return (messages = [
        {
          type: IMessageType.PLAIN_TEXT,
          message: message,
        },
      ]);
    } finally {
      // Print end log
      logger.end(this.getMounts, this);
    }
  }

  // Filter file systems with file system name which contain wildcard.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filterFileSystemByName(fileSystems: Record<string, any>[], fileSystemName: string, limit: number): Record<string, unknown>[] {
    // Print start log
    logger.start(this.filterFileSystemByName, this);
    const filteredSystems = [];
    try {
      const containWildcard: boolean = fileSystemName.indexOf('*') === -1 || fileSystemName.indexOf('?') === -1;

      if (containWildcard === false) {
        for (const system of fileSystems) {
          if (system.name === fileSystemName) {
            filteredSystems.push(system);
            break;
          }
        }
      } else {
        let fileSysNamWithWildCard = fileSystemName.replace('+', '\\+'); // Replace special character +
        fileSysNamWithWildCard = fileSysNamWithWildCard.replace('.', '\\.'); // Replace special character .
        fileSysNamWithWildCard = fileSysNamWithWildCard.replace('?', '.'); // Replace ? with Regex . to match any single character
        fileSysNamWithWildCard = fileSysNamWithWildCard.replace('*', '.*'); // Replace * with .* to match any single character 0 or more times

        const regex = new RegExp(fileSysNamWithWildCard);
        for (const fileSystem of fileSystems) {
          if (regex.test(fileSystem.name)) {
            filteredSystems.push(fileSystem);
          }
          if (filteredSystems.length >= Number(limit).valueOf()) {
            break;
          }
        }
      }
      return filteredSystems;
    } catch (error) {
      // Print exception stack
      logger.error(logger.getErrorStack(new Error(error.name), error));

      return [];
    } finally {
      // Print end log
      logger.end(this.filterFileSystemByName, this);
    }
  }
}

export = ZosFileHandler;
