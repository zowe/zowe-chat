/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import {IJob, GetJobs} from '@zowe/zos-jobs-for-zowe-sdk';
import {
    ISession,
    Session,
    SessConstants,
} from '@zowe/imperative';

import {Logger, IMessage, IMessageType, IChatToolType, IExecutor, IBotOption, Config} from '@zowe/chat';

import {ICommand} from '../types/index';
import ZosJobSlackView from './view/ZosJobSlackView';
import ZosJobMattermostView from './view/ZosJobMattermostView';
import ZosJobMsteamsView from './view/ZosJobMsteamsView';

const logger = Logger.getInstance();

class ZosJobHandler {
    private view: ZosJobSlackView | ZosJobMattermostView | ZosJobMsteamsView = null;

    constructor(botOption: IBotOption) {
        this.getJob = this.getJob.bind(this);

        if ( botOption.chatTool.type === IChatToolType.SLACK) {
            this.view = new ZosJobSlackView(botOption);
        } else if (botOption.chatTool.type === IChatToolType.MATTERMOST) {
            this.view = new ZosJobMattermostView(botOption);
        } else if (botOption.chatTool.type === IChatToolType.MSTEAMS) {
            this.view = new ZosJobMsteamsView(botOption);
        }
    }

    // Get command view for command 'zos job list job'
    async getJob(command: ICommand, executor: IExecutor): Promise<IMessage[]> {
        // Print start log
        logger.start(this.getJob, this);

        let messages: IMessage[] = [];
        try {
            const adjectives = command.adjectives;

            // Get adjective job id -- Optional
            let id: string = null;
            if (adjectives['id'] !== undefined) {
                id = adjectives['id'];
            }
            logger.debug(`id: ${id}`);

            // Get adjective owner -- Optional
            let owner: string = null;
            if (adjectives['owner'] !== undefined) {
                owner = adjectives['owner'];
            } else if (adjectives['o'] !== undefined) {
                owner = adjectives['o'];
            }
            logger.debug(`owner: ${owner}`);


            // Get adjective prefix -- Optional
            // By default * is used as prefix.
            let prefix: string = '*';
            if (adjectives['prefix'] !== undefined) {
                prefix = adjectives['prefix'];
            } else if (adjectives['p'] !== undefined) {
                prefix = adjectives['p'];
            }
            logger.debug(`prefix: ${prefix}`);

            // Get adjective limit -- Optional
            let limit: string = null;
            if (adjectives['limit'] !== undefined) {
                limit = adjectives['limit'];
            } else {
                limit = String(Config.getInstance().getConfig().chatServer.recordLimit);
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

            // Add record limit from Zowe Chat configuration to adjectives, then adjectives[limit] can be reached when generating header message.
            adjectives['limit'] = limit;

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
                hostname: 'winmvs3b.hursley.ibm.com',
                port: 32070,
                password: 'bnz4youy',
                user: 'lxhong',
                // hostname: hostName,
                // port: Number(port).valueOf(),
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


            if (id !== null
                    && jobs.length === 1) { // if id is specified, show detail view.
                messages = this.view.getDetail(jobs, executor, adjectives);
            } else {
                messages = this.view.getOverview(jobs, executor, adjectives);
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
