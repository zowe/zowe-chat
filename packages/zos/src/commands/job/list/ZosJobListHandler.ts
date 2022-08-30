/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import { AppConfig, AppConfigLoader, ChatHandler, ICommand, IExecutor, Logger } from '@zowe/chat';
import { IBotLimit, IBotOption, IChatToolType, IMattermostBotLimit, IMessage, IMessageType, IMsteamsBotLimit, ISlackBotLimit } from '@zowe/commonbot';
import { ISession, SessConstants, Session } from '@zowe/imperative';
import { GetJobs, IJob } from '@zowe/zos-jobs-for-zowe-sdk';

import { ZosJobMattermostView } from './ZosJobMattermostView';
import { ZosJobMsteamsView } from './ZosJobMsteamsView';
import { ZosJobSlackView } from './ZosJobSlackView';

const logger = Logger.getInstance();
const config: AppConfig = AppConfigLoader.loadAppConfig();


class ZosJobHandler extends ChatHandler {
    private view: ZosJobSlackView | ZosJobMattermostView | ZosJobMsteamsView = null;

    constructor(botOption: IBotOption, botLimit: IBotLimit) {
        super(botOption, botLimit);

        this.getJob = this.getJob.bind(this);

        if (botOption.chatTool === IChatToolType.SLACK) {
            this.view = new ZosJobSlackView(botOption, <ISlackBotLimit> botLimit);
        } else if (botOption.chatTool === IChatToolType.MATTERMOST) {
            this.view = new ZosJobMattermostView(botOption, <IMattermostBotLimit> botLimit);
        } else if (botOption.chatTool === IChatToolType.MSTEAMS) {
            this.view = new ZosJobMsteamsView(botOption, <IMsteamsBotLimit> botLimit);
        }
    }

    // Get command view for command 'zos job list job'
    async getJob(command: ICommand, executor: IExecutor): Promise<IMessage[]> {
        // Print start log
        logger.start(this.getJob, this);

        let messages: IMessage[] = [];
        try {
            const options = command.adjective.option;

            // Get option job id -- Optional
            let id: string = null;
            if (options['id'] !== undefined) {
                id = options['id'];
            }
            logger.debug(`id: ${id}`);

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
            let prefix: string = '*';
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
                limit = String(config.app.recordLimit);
            }
            logger.debug(`limit: ${limit}`);

            // Check if limit value is valid.
            if (limit === null || limit === undefined
                || limit.trim() === '' || isNaN(Number(limit))) {
                return messages = [{
                    type: IMessageType.PLAIN_TEXT,
                    message: 'Invalid adjective limit!',
                }];
            }

            // TODO: Will integrate with Authentication functionality later.
            /* let hostName: string = null;
            if (adjectives['host'] !== undefined) {
                hostName = adjectives['host'];
            } else if (adjectives['h'] !== undefined) {
                hostName = adjectives['h'];
            } else {
                return messages = [{
                    type: IMessageType.PLAIN_TEXT,
                    message: 'Please specify host name using --host or -h.',
                }];
            }

            let port: string = null;
            if (adjectives['port'] !== undefined) {
                port = adjectives['port'];
            } else {
                return messages = [{
                    type: IMessageType.PLAIN_TEXT,
                    message: 'Please specify port using --port.',
                }];
            }

            let user: string = null;
            if (adjectives['user'] !== undefined) {
                user = adjectives['user'];
            } else if (adjectives['u'] !== undefined) {
                user = adjectives['u'];
            } else {
                return messages = [{
                    type: IMessageType.PLAIN_TEXT,
                    message: 'Please specify user using --user or -u.',
                }];
            }

            let password: string = null;
            if (adjectives['password'] !== undefined) {
                password = adjectives['password'];
            } else {
                return messages = [{
                    type: IMessageType.PLAIN_TEXT,
                    message: 'Please specify password using --password.',
                }];
            } */

            // session to connect Zosmf REST API.
            const sessionInfo: ISession = {
                hostname: '',
                // hostname: hostName,
                port: 443,
                // port: Number(port).valueOf(),
                user: '',
                password: '',
                // user: user,
                // password: password,
                type: SessConstants.AUTH_TYPE_BASIC,
                rejectUnauthorized: false,
            };
            const session = new Session(sessionInfo);

            // By default the session user is used as owner.
            // But if id is specified, then filter job with * as owner.
            if (id !== null && id !== undefined && id !== '') {
                owner = '*';
            }

            // Get the list of jobs
            const jobs: IJob[] = await GetJobs.getJobsCommon(session,
                    {owner: owner, prefix: prefix, jobid: id, execData: true, maxJobs: Number(limit).valueOf()});
            logger.debug(`Got ${jobs.length} job.`);


            if (id !== null && jobs.length === 1) { // if id is specified, show detail view.
                messages = this.view.getDetail(jobs, executor);
            } else {
                messages = this.view.getOverview(jobs, executor, command);
            }

            return messages;
        } catch (error) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(error.name), error));

            return messages = [{
                type: IMessageType.PLAIN_TEXT,
                message: 'Internal Error!',
            }];
        } finally {
            // Print end log
            logger.end(this.getJob, this);
        }
    }
}

export = ZosJobHandler;
