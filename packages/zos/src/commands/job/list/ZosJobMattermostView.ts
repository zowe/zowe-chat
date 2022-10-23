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
import { ChatMattermostView, IBotOption, ICommand, IExecutor, IMattermostBotLimit, IMessage, IMessageType } from '@zowe/chat';

export class ZosJobMattermostView extends ChatMattermostView {
    constructor(botOption: IBotOption, botLimit: IMattermostBotLimit) {
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

            // Create fields array within attachment.
            const fields = [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let job: Record<string, any>;
            const detailOptions = [];
            for (job of jobs) {
                fields.push({
                    short: true,
                    value: `:card_index: **${i18next.t('command.job.list.status.name', { ns: 'ZosMessage' })}:** ${job.jobname}`,
                },
                {
                    short: true,
                    value: `**${i18next.t('command.job.list.status.id', { ns: 'ZosMessage' })}:** ${job.jobid}`,
                },
                {
                    short: true,
                    value: `**${i18next.t('command.job.list.status.owner', { ns: 'ZosMessage' })}: ** ${job.owner}`,
                },
                {
                    short: true,
                    value: `**${i18next.t('command.job.list.status.subSystem', { ns: 'ZosMessage' })}: ** ${job.subsystem}`,
                },
                {
                    short: true,
                    value: `**${i18next.t('command.job.list.status.status', { ns: 'ZosMessage' })}: ** ${job.status}`,
                },
                {
                    short: true,
                    value: `**${i18next.t('command.job.list.status.type', { ns: 'ZosMessage' })}: ** ${job.type}`,
                },
                {
                    short: true,
                    value: `**${i18next.t('command.job.list.status.returnCode', { ns: 'ZosMessage' })}: ** ${job.retcode === null ? ' ' : job.retcode}`,
                },
                {
                    short: true,
                    value: `**${i18next.t('command.job.list.status.startedTime', { ns: 'ZosMessage' })}: **`
                            + `${job['exec-started'] === undefined ? ' ' : job['exec-started']}`,
                },
                {
                    short: false,
                    value: `***`,
                });

                // Options for details message menu.
                detailOptions.push({
                    'text': `${job.jobname}(ID: ${job.jobid})`,
                    'value': `@${this.botOption.chatTool.option.botUserName}:zos:job:list:status:${job.jobid}`,
                });
            }

            // Add actions
            const actions = <Record<string, unknown>[]>[];
            const actionData = {
                'pluginId': command.extraData.chatPlugin.package,
                'token': '',
                'id': '',
            };
            super.addMenuAction(actions, i18next.t('command.job.list.status.dropDownPlaceholder', { ns: 'ZosMessage' }), actionData, detailOptions);

            // Create message attachments
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

            // Create fields array within attachment.
            const fields = [];
            fields.push({
                short: false,
                title: `${i18next.t('command.job.list.detail.details', { ns: 'ZosMessage' })}${job.jobname}`,
                value: `*** \n`,
            },
            {
                short: true,
                value: `**${i18next.t('command.job.list.detail.id', { ns: 'ZosMessage' })}: ** ${job.jobid}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.job.list.detail.owner', { ns: 'ZosMessage' })}: ** ${job.owner}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.job.list.detail.subSystem', { ns: 'ZosMessage' })}: ** ${job.subsystem}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.job.list.detail.status', { ns: 'ZosMessage' })}: ** ${job.status}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.job.list.detail.type', { ns: 'ZosMessage' })}: ** ${job.type}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.job.list.detail.returnCode', { ns: 'ZosMessage' })}: ** ${job.retcode === null ? ' ' : job.retcode}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.job.list.detail.class', { ns: 'ZosMessage' })}: ** ${job.class}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.job.list.detail.PhaseName', { ns: 'ZosMessage' })}: ** `
                        + `${job['phase-name'] === undefined ? ' ' : job['phase-name']}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.job.list.detail.Phase', { ns: 'ZosMessage' })}: ** ${job.phase ? ' ' : job.phase}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.job.list.detail.ExecutionSystem', { ns: 'ZosMessage' })}: ** `
                    + `${job['exec-system'] === undefined ? ' ' : job['exec-system']}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.job.list.detail.ExecutionMember', { ns: 'ZosMessage' })}: ** `
                    + `${job['exec-member'] === undefined ? ' ' : job['exec-member']}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.job.list.detail.startedTime', { ns: 'ZosMessage' })}: ** `
                        + `${job['exec-started'] === undefined ? ' ' : job['exec-started']}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.job.list.detail.ExecutionSubmittedTime', { ns: 'ZosMessage' })}: ** `
                    + `${job['exec-submitted'] === undefined ? ' ': job['exec-submitted']}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.job.list.detail.ExecutionEndedTime', { ns: 'ZosMessage' })}: ** `
                    + `${job['exec-ended'] === undefined ? ' ' : job['exec-ended']}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.job.list.detail.reasonNotRunning', { ns: 'ZosMessage' })}: ** `
                    + `${job['reason-not-running'] === undefined ? ' ' : job['reason-not-running']}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.job.list.detail.openJob', { ns: 'ZosMessage' })}: ** [Zosmf](${job.url})`,
            });

            // Create message attachments
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const attachmentObject: Record<string, any> = {
                props: {
                    attachments: [
                        {
                            pretext: i18next.t('common.data.foundOne',
                                    { executor: executor.name, resourceName: i18next.t('command.job.list.detail.resourceName', { ns: 'ZosMessage' }),
                                        ns: 'ZosMessage' }),
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
}
