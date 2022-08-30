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

import { ChatSlackView, ICommand, IExecutor } from '@zowe/chat';
import { IBotOption, IMessage, IMessageType, ISlackBotLimit } from '@zowe/commonbot';
const i18nJsonData = require('../../../i18n/jobDisplay.json');


export class ZosJobSlackView extends ChatSlackView {
    constructor(botOption: IBotOption, botLimit: ISlackBotLimit) {
        super(botOption, botLimit);
    }

    // Get overview view.
    getOverview(jobs: IJob[], executor: IExecutor, command: ICommand): IMessage[] {
        // Print start log
        this.log.start(this.getOverview, this);

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
                // TODO: Think about what message should be when  too many jobs are searched, if jobs.length > limit.
                headerMessage = `@${executor.name}. I have found ${jobs.length} jobs that match the filter:`;
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const blockObject: Record<string, any> = {
                'blocks': [
                    {
                        'type': 'section',
                        'text': {
                            'type': 'mrkdwn',
                            'text': headerMessage,
                        },
                    },
                ],
                'channel': executor.channel.id,
            };

            const detailOptions = [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let job: Record<string, any>;
            for (job of jobs) {
                // Create fields array within section block.
                const jobSection = {
                    'type': 'section',
                    'fields': [
                        {
                            'type': 'mrkdwn',
                            'text': `*${job.jobname}* (ID: ${job.jobid})`,
                        },
                        {
                            'type': 'mrkdwn',
                            'text': ' ',
                        },
                        {
                            'type': 'mrkdwn',
                            'text': `*${i18nJsonData.overview.owner}:* ${job.owner}`,
                        },
                        {
                            'type': 'mrkdwn',
                            'text': `*${i18nJsonData.overview.subSystem}:* ${job.subsystem}`,
                        },
                        {
                            'type': 'mrkdwn',
                            'text': `*${i18nJsonData.overview.status}:* ${job.status}`,
                        },
                        {
                            'type': 'mrkdwn',
                            'text': `*${i18nJsonData.overview.type}:* ${job.type}`,
                        },
                        {
                            'type': 'mrkdwn',
                            'text': `*${i18nJsonData.overview.returnCode}:* ${job.retcode === null ? ' ' : job.retcode}`,
                        },
                        {
                            'type': 'mrkdwn',
                            'text': `*${i18nJsonData.overview.startedTime}:* ${job['exec-started'] === undefined ? ' ' : job['exec-started']}`,
                        },
                    ],
                };

                // Add section block to message blocks.
                blockObject.blocks.push(jobSection);

                // Add divider block
                blockObject.blocks.push(
                    {
                        'type': 'divider',
                    },
                );

                // Create options for job details select menu
                detailOptions.push(super.createSelectMenuOption(`Details of ${job.jobname}(${job.jobid})`,
                    `@${this.botName}:zos:job:list:status:id=${job.jobid}`));
            }

            // Create action block object.
            const actionBlock = {
                'type': 'actions',
                'elements': <Record<string, unknown>[]>[],
            };
            const actionData = {
                'pluginId': command.extraData.chatPlugin.package,
                'actionId': 'showJobDetails',
                'token': '',
                'placeHolder': i18nJsonData.overview.dropDownPlaceholder,
            };
            super.addSelectMenuAction(actionBlock, actionData, detailOptions);

            // Add action block object to message attachments.
            if (actionBlock.elements.length > 0) {
                blockObject.blocks.push(actionBlock);
            }

            messages.push({
                type: IMessageType.SLACK_BLOCK,
                message: blockObject,
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
    getDetail(jobs: IJob[], executor: IExecutor): IMessage[] {
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

            // Get job
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const job: Record<string, any> = jobs[0];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const blockObject: Record<string, any> = {
                'blocks': [
                    {
                        'type': 'section',
                        'text': {
                            'type': 'mrkdwn',
                            'text': headerMessage,
                        },
                    },
                ],
                'channel': executor.channel.id,
            };

            // Create fields array within section block.
            let jobSection = {
                'type': 'section',
                'fields': [
                    {
                        'type': 'mrkdwn',
                        'text': `*${job.jobname}* (ID: ${job.jobid})`,
                    },
                    {
                        'type': 'plain_text',
                        'text': ' ',
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18nJsonData.detail.owner}:* ${job.owner}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18nJsonData.detail.subSystem}:* ${job.subsystem}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18nJsonData.detail.status}:* ${job.status}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18nJsonData.detail.type}:* ${job.type}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18nJsonData.detail.returnCode}:* ${job.retcode === null ? ' ' : job.retcode}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18nJsonData.detail.class}:* ${job.class}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18nJsonData.detail.PhaseName}:* ${job['phase-name'] === undefined ? ' ' : job['phase-name']}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18nJsonData.detail.Phase}:* ${job.phase}`,
                    },
                ],
            };

            blockObject.blocks.push(jobSection);
            // Only 10 items are allowed in one section.
            jobSection = {
                'type': 'section',
                'fields': [
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18nJsonData.detail.ExecutionMember}:* ${job['exec-system'] === undefined ? ' ' : job['exec-system']}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18nJsonData.detail.ExecutionSystem}:* ${job['exec-member'] === undefined ? ' ' : job['exec-member']}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18nJsonData.detail.startedTime}:* ${job['exec-started'] === undefined ? ' ' : job['exec-started']}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18nJsonData.detail.ExecutionSubmittedTime}:* ${job['exec-submitted'] === undefined ? ' ' : job['exec-submitted']}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18nJsonData.detail.ExecutionEndedTime}:* ${job['exec-ended'] === undefined ? ' ' : job['exec-ended']}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18nJsonData.detail.reasonNotRunning}:* `
                            + `${job['reason-not-running'] === undefined ? ' ' : job['reason-not-running']}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18nJsonData.detail.openJob}:* <${job.url}|Zosmf>`,
                    },
                ],
            };

            blockObject.blocks.push(jobSection);

            // Add divider block
            blockObject.blocks.push(
                {
                    'type': 'divider',
                },
            );

            messages.push({
                type: IMessageType.SLACK_BLOCK,
                message: blockObject,
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

