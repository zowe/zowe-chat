/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import { IJob } from '@zowe/zos-jobs-for-zowe-sdk';

import { ChatMattermostView, IExecutor, Logger } from '@zowe/chat';
import { IBotOption, IMessage, IMessageType } from '@zowe/commonbot';
import * as i18nJsonData from '../../i18n/jobDisplay.json';


export class ZosJobMattermostView extends ChatMattermostView {
    private readonly log: Logger

    constructor(botOption: IBotOption) {
        super(botOption, null);
        this.log = Logger.getInstance();
        this.botOption = botOption;
    }

    // Get overview view.
    getOverview(jobs: IJob[], executor: IExecutor, adjectives: Record<string, string>, packageName: string): IMessage[] {
        // Print start log
        this.log.start(this.getOverview, this);

        let messages: IMessage[] = [];

        try {
            let headerMessage = '';
            if (jobs.length === 0) {
                headerMessage = `@${executor.name}. I haven't found any jobs that match the filter.`;
                return messages = [{
                    type: IMessageType.PLAIN_TEXT,
                    message: headerMessage,
                }];
            } else {
                // TODO: Think about what message should be when  too many jobs are searched, if jobs.length > limit.
                headerMessage = `@${executor.name}. I have found ${jobs.length} jobs that match the filter:`;
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
            const contextData = {
                'pluginId': packageName,
                'token': '',
                'id': '',
            };
            super.addMenuAction(actions, i18nJsonData.overview.dropDownPlaceholder,
                `${this.botOption.messagingApp.option.protocol}://${this.botOption.messagingApp.option.hostName}:${this.botOption.messagingApp.option.port}${this.botOption.messagingApp.option.basePath}`,
                contextData, detailOptions);

            // Create message attachments
            const attachmentObject: Record<string, any> = {
                props: {
                    attachments: [
                        {
                            pretext: headerMessage,
                            fields: fields,
                            actions: actions,
                        },
                    ],
                },
            };
            messages.push({
                type: IMessageType.MATTERMOST_ATTACHMENT,
                message: attachmentObject,
            });
            return messages;
        } catch (error) {
            this.log.error(this.log.getErrorStack(new Error(error.name), error));

            return messages = [{
                type: IMessageType.PLAIN_TEXT,
                message: 'Internal error',
            }];
        } finally {
            // Print end log
            this.log.end(this.getOverview);
        }
    }

    // Get detail view.
    getDetail(jobs: IJob[], executor: IExecutor, adjectives: Record<string, string>): IMessage[] {
        // Print start log
        this.log.start(this.getDetail, this);

        let messages: IMessage[] = [];

        try {
            // Get header message
            let headerMessage = '';
            if (jobs.length === 0) {
                headerMessage = `@${executor.name}. I haven't found any jobs that match the filter.`;
                return messages = [{
                    type: IMessageType.PLAIN_TEXT,
                    message: headerMessage,
                }];
            } else {
                headerMessage = `@${executor.name}. Here is the the basic information of ${jobs[0].jobid}:`;
            }

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
                    value: `**${i18nJsonData.detail.ExecutionSubmittedTime}: ** ${job['exec-submitted'] === undefined ? ' ' : job['exec-submitted']}`,
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
            const attachmentObject: Record<string, any> = {
                props: {
                    attachments: [
                        {
                            pretext: headerMessage,
                            fields: fields,
                            actions: [],
                        },
                    ],
                },
            };

            messages.push({
                type: IMessageType.MATTERMOST_ATTACHMENT,
                message: attachmentObject,
            });
            return messages;
        } catch (error) {
            this.log.error(this.log.getErrorStack(new Error(error.name), error));

            return messages = [{
                type: IMessageType.PLAIN_TEXT,
                message: 'Internal error',
            }];
        } finally {
            // Print end log
            this.log.end(this.getDetail);
        }
    }
}