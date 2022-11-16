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
import i18next from 'i18next';

import { logger, Util } from '@zowe/chat';
import { ChatSlackView, IBotOption, ICommand, IExecutor, IMessage, IMessageType, ISlackBotLimit } from '@zowe/chat';

export class ZosJobSlackView extends ChatSlackView {
    constructor(botOption: IBotOption, botLimit: ISlackBotLimit) {
        super(botOption, botLimit);
    }

    // Get overview view.
    getOverview(jobs: IJob[], executor: IExecutor, command: ICommand): IMessage[] {
        // Print start log
        logger.start(this.getOverview, this);

        let messages: IMessage[] = [];
        try {
            // Generate header message
            let headerMessage = '';
            if (jobs.length === 0) {
                return messages = [{
                    type: IMessageType.PLAIN_TEXT,
                    message: i18next.t('common.data.foundZero',
                            { executor: executor.name, resourceName: i18next.t('command.job.list.status.resourceName',
                                    { ns: 'ZosMessage' }), ns: 'ZosMessage' }),
                }];
            } else {
                // TODO: Think about what message should be when  too many jobs are searched, if jobs.length > limit.
                headerMessage = i18next.t('common.data.foundMoreThanOne',
                        { executor: executor.name, resourceName: i18next.t('command.job.list.status.resourceName', { ns: 'ZosMessage' }), ns: 'ZosMessage' });
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

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let job: Record<string, any>;
            const detailOptions = [];
            for (job of jobs) {
                // Create fields array within section block.
                const jobSection = {
                    'type': 'section',
                    'fields': [
                        {
                            'type': 'mrkdwn',
                            'text': `:card_index: *${i18next.t('command.job.list.status.name', { ns: 'ZosMessage' })}:*  ${job.jobname}`,
                        },
                        {
                            'type': 'mrkdwn',
                            'text': `*${i18next.t('command.job.list.status.id', { ns: 'ZosMessage' })}:* ${job.jobid}`,
                        },
                        {
                            'type': 'mrkdwn',
                            'text': `*${i18next.t('command.job.list.status.owner', { ns: 'ZosMessage' })}:* ${job.owner}`,
                        },
                        {
                            'type': 'mrkdwn',
                            'text': `*${i18next.t('command.job.list.status.subSystem', { ns: 'ZosMessage' })}:* ${job.subsystem}`,
                        },
                        {
                            'type': 'mrkdwn',
                            'text': `*${i18next.t('command.job.list.status.status', { ns: 'ZosMessage' })}:* ${this.getJobStatusIcon(job.status)}`,
                        },
                        {
                            'type': 'mrkdwn',
                            'text': `*${i18next.t('command.job.list.status.type', { ns: 'ZosMessage' })}:* ${job.type}`,
                        },
                        {
                            'type': 'mrkdwn',
                            'text': `*${i18next.t('command.job.list.status.returnCode', { ns: 'ZosMessage' })}:* ${job.retcode === null ? ' ' : job.retcode}`,
                        },
                        {
                            'type': 'mrkdwn',
                            'text': `*${i18next.t('command.job.list.status.startedTime', { ns: 'ZosMessage' })}:* `
                                    + `${job['exec-started'] === undefined ? ' ' : job['exec-started']}`,
                        },
                    ],
                };

                // Add section block to message blocks.
                blockObject.blocks.push(jobSection);

                // Add divider block
                blockObject.blocks.push({
                    'type': 'divider',
                },
                );

                // Create options for job details select menu
                detailOptions.push(super.createSelectMenuOption(`${job.jobname}(ID: ${job.jobid})`,
                        `@${this.botOption.chatTool.option.botUserName}:zos:job:list:status:${job.jobid}`));
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
                'placeHolder': i18next.t('command.job.list.status.dropDownPlaceholder', { ns: 'ZosMessage' }),
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
            // ZWECC001E: Internal server error: {{error}}
            logger.error(Util.getErrorMessage('ZWECC001E', { error: 'Zos job view create exception', ns: 'ChatMessage' }));
            logger.error(logger.getErrorStack(new Error(error.name), error));

            return messages = [{
                type: IMessageType.PLAIN_TEXT,
                message: i18next.t('common.error.internal', { ns: 'ZosMessage' }),
            }];
        } finally {
            // Print end log
            logger.end(this.getOverview);
        }
    }

    // Get detail view.
    getDetail(jobs: IJob[], executor: IExecutor): IMessage[] {
        // Print start log
        logger.start(this.getDetail, this);

        let messages: IMessage[] = [];

        try {
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
                            'text': i18next.t('common.data.foundOne',
                                    { executor: executor.name, resourceName: i18next.t('command.job.list.detail.resourceName', { ns: 'ZosMessage' }),
                                        ns: 'ZosMessage' }),
                        },
                    },
                ],
                'channel': executor.channel.id,
            };

            // Add fields array to section block.
            blockObject.blocks.push({
                'type': 'section',
                'text': {
                    'type': 'mrkdwn',
                    'text': `*${i18next.t('command.job.list.detail.details', { ns: 'ZosMessage' })}${job.jobname}*`,
                },
            },
            {
                'type': 'divider',
            });

            // Only 10 items are allowed in one section.
            blockObject.blocks.push({
                'type': 'section',
                'fields': [
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.job.list.detail.id', { ns: 'ZosMessage' })}:* ${job.jobid}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.job.list.detail.owner', { ns: 'ZosMessage' })}:* ${job.owner}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.job.list.detail.subSystem', { ns: 'ZosMessage' })}:* ${job.subsystem}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.job.list.detail.status', { ns: 'ZosMessage' })}:* ${this.getJobStatusIcon(job.status)}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.job.list.detail.type', { ns: 'ZosMessage' })}:* ${job.type}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.job.list.detail.returnCode', { ns: 'ZosMessage' })}:* ${job.retcode === null? ' ': job.retcode}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.job.list.detail.class', { ns: 'ZosMessage' })}:* ${job.class}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.job.list.detail.PhaseName', { ns: 'ZosMessage' })}:* `
                                + `${job['phase-name'] === undefined ? ' ' : job['phase-name']}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.job.list.detail.Phase', { ns: 'ZosMessage' })}:* ${job.phase ? ' ' : job.phase}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.job.list.detail.ExecutionMember', { ns: 'ZosMessage' })}:* `
                            + `${job['exec-system'] === undefined ? ' ' : job['exec-system']}`,
                    },
                ],
            },
            {
                'type': 'section',
                'fields': [
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.job.list.detail.ExecutionSystem', { ns: 'ZosMessage' })}:* `
                            + `${job['exec-member'] === undefined ? ' ' : job['exec-member']}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.job.list.detail.startedTime', { ns: 'ZosMessage' })}:* `
                            + `${job['exec-started'] === undefined ? ' ' : job['exec-started']}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.job.list.detail.ExecutionSubmittedTime', { ns: 'ZosMessage' })}:* `
                            + `${job['exec-submitted'] === undefined ? ' ': job['exec-submitted']}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.job.list.detail.ExecutionEndedTime', { ns: 'ZosMessage' })}:* `
                            + `${job['exec-ended'] === undefined ? ' ' : job['exec-ended']}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.job.list.detail.reasonNotRunning', { ns: 'ZosMessage' })}:* `
                            + `${job['reason-not-running'] === undefined ? ' ' : job['reason-not-running']}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.job.list.detail.openJob', { ns: 'ZosMessage' })}:* <${job.url}|Zosmf>`,
                    },
                ],
            },
            {
                'type': 'divider',
            });

            messages.push({
                type: IMessageType.SLACK_BLOCK,
                message: blockObject,
            });
            return messages;
        } catch (error) {
            // ZWECC001E: Internal server error: {{error}}
            logger.error(Util.getErrorMessage('ZWECC001E', { error: 'Zos job view create exception', ns: 'ChatMessage' }));
            logger.error(logger.getErrorStack(new Error(error.name), error));

            return messages = [{
                type: IMessageType.PLAIN_TEXT,
                message: i18next.t('common.error.internal', { ns: 'ZosMessage' }),
            }];
        } finally {
            // Print end log
            logger.end(this.getDetail);
        }
    }

    // Get job status with Icon
    getJobStatusIcon(statusValue: string): string {
        let status: string = statusValue;
        if ('ACTIVE' === statusValue.toUpperCase()) {
            status = `:beginner: ${statusValue}`;
        } else if ('INPUT' === statusValue.toUpperCase()) {
            status = `:inbox_tray: ${statusValue}`;
        } else if ('OUTPUT' === statusValue.toUpperCase()) {
            status = `:outbox_tray: ${statusValue}`;
        }
        return status;
    }
}

