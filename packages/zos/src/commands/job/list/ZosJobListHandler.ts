/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import i18next from 'i18next';
import { logger, Util } from '@zowe/chat';
import { config } from '@zowe/chat';

import {
  ChatHandler,
  ChatPrincipal,
  IBotLimit,
  IBotOption,
  IChatToolType,
  ICommand,
  IExecutor,
  IMattermostBotLimit,
  IMessage,
  IMessageType,
  IMsteamsBotLimit,
  ISlackBotLimit,
} from '@zowe/chat';
import { ISession, SessConstants, Session } from '@zowe/imperative';
import { GetJobs, IJob } from '@zowe/zos-jobs-for-zowe-sdk';

import { ZosJobMattermostView } from './ZosJobMattermostView';
import { ZosJobMsteamsView } from './ZosJobMsteamsView';
import { ZosJobSlackView } from './ZosJobSlackView';

class ZosJobHandler extends ChatHandler {
  private view: ZosJobSlackView | ZosJobMattermostView | ZosJobMsteamsView = null;

  constructor(botOption: IBotOption, botLimit: IBotLimit) {
    super(botOption, botLimit);

    this.getJob = this.getJob.bind(this);

    if (botOption.chatTool.type === IChatToolType.SLACK) {
      this.view = new ZosJobSlackView(botOption, <ISlackBotLimit>botLimit);
    } else if (botOption.chatTool.type === IChatToolType.MATTERMOST) {
      this.view = new ZosJobMattermostView(botOption, <IMattermostBotLimit>botLimit);
    } else if (botOption.chatTool.type === IChatToolType.MSTEAMS) {
      this.view = new ZosJobMsteamsView(botOption, <IMsteamsBotLimit>botLimit);
    }
  }

  // Get command view for command 'zos job list status'
  async getJob(command: ICommand, executor: IExecutor): Promise<IMessage[]> {
    // Print start log
    logger.start(this.getJob, this);

    let messages: IMessage[] = [];
    try {
      const auth: ChatPrincipal = <ChatPrincipal>command.extraData.principal;
      const zosmfConfig = config.getZosmfServerConfig();

      // Get positional argument - job id
      const positionalArgument = command.adjective.arguments;
      let id: string = null;
      if (positionalArgument.length > 0) {
        id = positionalArgument[0];
      }
      logger.debug(`id: ${id}`);

      const options = command.adjective.option;

      // Get option owner -- Optional
      let owner: string = null;
      if (options['owner'] !== undefined) {
        owner = options['owner'];
      } else if (options['o'] !== undefined) {
        owner = options['o'];
      }
      logger.debug(`owner: ${owner}`);

      // Get option prefix -- Optional
      // By default * is used as prefix.
      let prefix = '*';
      if (options['prefix'] !== undefined) {
        prefix = options['prefix'];
      } else if (options['p'] !== undefined) {
        prefix = options['p'];
      }
      logger.debug(`prefix: ${prefix}`);

      // Get option limit -- Optional
      let limit: string = null;
      if (options['limit'] !== undefined) {
        limit = options['limit'];
      } else {
        limit = String(config.getChatServerConfig().limit.record);
      }
      logger.debug(`limit: ${limit}`);

      // Check if limit value is valid.
      if (limit === null || limit === undefined || ('' + limit).trim() === '' || isNaN(Number(limit))) {
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

      // By default the session user is used as owner.
      // But if the job id is specified, then filter job with * as owner.
      if (id !== null) {
        owner = '*';
      }

      // Get jobs
      const jobs: IJob[] = await GetJobs.getJobsCommon(session, {
        owner: owner,
        prefix: prefix,
        jobid: id,
        execData: true,
        maxJobs: Number(limit).valueOf(),
      });
      logger.debug(`Got ${jobs.length} job.`);

      if (id !== null && jobs.length === 1) {
        // if the job id is specified, show detail view.
        messages = this.view.getDetail(jobs, executor);
      } else {
        messages = this.view.getOverview(jobs, executor, command);
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
      logger.error(Util.getErrorMessage('ZWECC001E', { error: 'Zos job list handler exception', ns: 'ChatMessage' }));
      logger.error(logger.getErrorStack(new Error(error.name), error));

      return (messages = [
        {
          type: IMessageType.PLAIN_TEXT,
          message: message,
        },
      ]);
    } finally {
      // Print end log
      logger.end(this.getJob, this);
    }
  }
}

export = ZosJobHandler;
