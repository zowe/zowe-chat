/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import {IJob} from '@zowe/zos-jobs-for-zowe-sdk';

import {Logger, IMessage, IMessageType, IBotOption, ChatMattermostView, IExecutor} from '@zowe/chat';

import * as i18nJsonData from '../../i18n/jobDisplay.json';
import Util from '../../utils/Util';

const logger = Logger.getInstance();

class ZosJobMattermostView extends ChatMattermostView {
    private botOption: IBotOption;

    constructor(botOption: IBotOption) {
        super();

        this.botOption = botOption;
    }

    // Get overview view.
    getOverview(jobs: IJob[], executor: IExecutor, adjectives: Record<string, string>): IMessage[] {
        // Print start log
        logger.start(this.getOverview, this);

        let messages: IMessage[] = [];

        try {
            const headerMessage = super.getHeaderMessage(jobs.length, executor, adjectives, 'job', '');
            if (jobs.length === 0) {
                return messages = [{
                    type: IMessageType.PLAIN_TEXT,
                    message: headerMessage,
                }];
            }

            const detailOptions = [];
            // Create fields array within attachment.
            const fields = [];
            let job: Record<string, any>;
            for (job of jobs) {
                fields.push({
                    short: true,
                    value: `**${job.jobid}** (ID: ${job.jobname})`,
                },
                {
                    short: true,
                    value: '',
                },
                {
                    short: true,
                    value: `**${i18nJsonData.overview.owner}: ** ${job.owner}`,
                },
                {
                    short: true,
                    value: `**${i18nJsonData.overview.subSystem}: ** ${job.subsystem}`,
                },
                {
                    short: true,
                    value: `**${i18nJsonData.overview.status}: ** ${job.status}`,
                },
                {
                    short: true,
                    value: `**${i18nJsonData.overview.type}: ** ${job.type}`,
                },
                {
                    short: true,
                    value: `**${i18nJsonData.overview.returnCode}: ** ${job.retcode === null ? ' ' : job.retcode}`,
                },
                {
                    short: true,
                    value: `**${i18nJsonData.overview.startedTime}: **${job['exec-started'] === undefined ? ' ' : job['exec-started']}`,
                },
                {
                    short: false,
                    value: `*** \n`,
                });

                // Options for details message menu.
                detailOptions.push({
                    'text': `Details of ${job.jobname}(${job.jobid})`,
                    'value': `@${this.botOption.chatTool.option.botUserName}:zos:job:list:job:id=${job.jobid}`,
                });
            }

            // Add action
            const actions = <Record<string, unknown>[]>[];
            super.addMessageMenuAction(Util.getPackageName(), actions, detailOptions, i18nJsonData.overview.dropDownPlaceholder);

            // Create message attachments
            const attachmentObject: Record<string, any> = this.getMessageAttachments(headerMessage, fields, actions);
            messages.push({
                type: IMessageType.MATTERMOST_ATTACHMENT,
                message: attachmentObject,
            });
            return messages;
        } catch (error) {
            logger.error(logger.getErrorStack(new Error(error.name), error));

            return messages = [{
                type: IMessageType.PLAIN_TEXT,
                message: 'Internal error',
            }];
        } finally {
            // Print end log
            logger.end(this.getOverview);
        }
    }

    // Get detail view.
    getDetail(jobs: IJob[], executor: IExecutor, adjectives: Record<string, string>): IMessage[] {
        // Print start log
        logger.start(this.getDetail, this);

        let messages: IMessage[] = [];

        try {
            const job: Record<string, any> = jobs[0];

            // Create fields array within attachment.
            const fields = [];
            fields.push({
                short: false,
                value: `**${job.jobname}** (ID: ${job.jobid})`,
            },
            {
                short: true,
                value: `**${i18nJsonData.detail.owner}: ** ${job.owner}`,
            },
            {
                short: true,
                value: `**${i18nJsonData.detail.subSystem}: ** ${job.subsystem}`,
            },
            {
                short: true,
                value: `**${i18nJsonData.detail.status}: ** ${job.status}`,
            },
            {
                short: true,
                value: `**${i18nJsonData.detail.type}: ** ${job.type}`,
            },
            {
                short: true,
                value: `**${i18nJsonData.detail.returnCode}: ** ${job.retcode === null ? ' ' : job.retcode}`,
            },
            {
                short: true,
                value: `**${i18nJsonData.detail.class}: ** ${job.class}`,
            },
            {
                short: true,
                value: `**${i18nJsonData.detail.PhaseName}: ** ${job['phase-name'] === undefined ? ' ' : job['phase-name']}`,
            },
            {
                short: true,
                value: `**${i18nJsonData.detail.Phase}: ** ${job.phase}`,
            },
            {
                short: true,
                value: `**${i18nJsonData.detail.ExecutionSystem}: ** ${job['exec-system'] === undefined ? ' ' : job['exec-system']}`,
            },
            {
                short: true,
                value: `**${i18nJsonData.detail.ExecutionMember}: ** ${job['exec-member'] === undefined ? ' ' : job['exec-member']}`,
            },
            {
                short: true,
                value: `**${i18nJsonData.detail.startedTime}: ** ${job['exec-started'] === undefined ? ' ' : job['exec-started']}`,
            },
            {
                short: true,
                value: `**${i18nJsonData.detail.ExecutionSubmittedTime}: ** ${job['exec-submitted'] === undefined ? ' ': job['exec-submitted']}`,
            },
            {
                short: true,
                value: `**${i18nJsonData.detail.ExecutionEndedTime}: ** ${job['exec-ended'] === undefined ? ' ' : job['exec-ended']}`,
            },
            {
                short: true,
                value: `**${i18nJsonData.detail.reasonNotRunning}: ** ${job['reason-not-running'] === undefined ? ' ' : job['reason-not-running']}`,
            },
            {
                short: true,
                value: `**${i18nJsonData.detail.openJob}: ** [Zosmf](${job.url})`,
            });

            // Create message attachments
            const attachmentObject: Record<string, any> = this.getMessageAttachments(
                    super.getHeaderMessage(jobs.length, executor, adjectives, 'job', jobs[0].jobid, true), fields, []);

            messages.push({
                type: IMessageType.MATTERMOST_ATTACHMENT,
                message: attachmentObject,
            });
            return messages;
        } catch (error) {
            logger.error(logger.getErrorStack(new Error(error.name), error));

            return messages = [{
                type: IMessageType.PLAIN_TEXT,
                message: 'Internal error',
            }];
        } finally {
            // Print end log
            logger.end(this.getDetail);
        }
    }
}

export = ZosJobMattermostView;
