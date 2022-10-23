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
import { ChatMsteamsView, IBotOption, ICommand, IExecutor, IMessage, IMessageType, IMsteamsBotLimit } from '@zowe/chat';

export class ZosJobMsteamsView extends ChatMsteamsView {
    constructor(botOption: IBotOption, botLimit: IMsteamsBotLimit) {
        super(botOption, botLimit);
    }

    // Get overview
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

            // Add header message to messages.
            messages.push({
                type: IMessageType.PLAIN_TEXT,
                message: headerMessage,
            });

            // Create adaptive card object.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cardObject: Record<string, any> = super.createEmptyAdaptiveCard();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let job: Record<string, any>;
            const detailOptions = [];
            for (job of jobs) {
                // Add column set
                cardObject.body.push(super.createColumnSet(
                        `**${i18next.t('command.job.list.status.name', { ns: 'ZosMessage' })}:** ${job.jobname}`,
                        `**${i18next.t('command.job.list.status.id', { ns: 'ZosMessage' })}:** ${job.jobid}`,
                        true));
                cardObject.body.push(super.createColumnSet(
                        `**${i18next.t('command.job.list.status.owner', { ns: 'ZosMessage' })}:** ${job.owner}`,
                        `**${i18next.t('command.job.list.status.subSystem', { ns: 'ZosMessage' })}:** ${job.subsystem}`,
                        false));
                cardObject.body.push(super.createColumnSet(
                        `**${i18next.t('command.job.list.status.status', { ns: 'ZosMessage' })}:** ${job.status}`,
                        `**${i18next.t('command.job.list.status.type', { ns: 'ZosMessage' })}:** ${job.type}`,
                        false));
                cardObject.body.push(super.createColumnSet(
                        `**${i18next.t('command.job.list.status.returnCode', { ns: 'ZosMessage' })}:** ${job.retcode === null ? ' ' : job.retcode}`,
                        `**${i18next.t('command.job.list.status.startedTime', { ns: 'ZosMessage' })}:** `
                            + `${job['exec-started'] === undefined ? ' ' : job['exec-started']}`,
                        false));

                // Create option array for detail dropdown.
                detailOptions.push({
                    'title': `${job.jobname}(ID: ${job.jobid})`,
                    'value': `@${this.botOption.chatTool.option.botUserName}:zos:job:list:status:${job.jobid}`,
                });
            }

            // Add show details action
            const dropdownDataObj = {
                'pluginId': command.extraData.chatPlugin.package,
                'id': 'showJobDetails',
                'title': i18next.t('command.job.list.status.buttonTitle', { ns: 'ZosMessage' }),
                'placeholder': i18next.t('command.job.list.status.dropDownPlaceholder', { ns: 'ZosMessage' }),
                'choices': detailOptions,
                'separator': true,
                'token': '',
            };

            super.addDropdownAction(cardObject.body, dropdownDataObj);

            messages.push({
                type: IMessageType.MSTEAMS_ADAPTIVE_CARD,
                message: cardObject,
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

    // Get detail
    getDetail(jobs: IJob[], executor: IExecutor): IMessage[] {
        // Print start log
        logger.start(this.getDetail, this);

        let messages: IMessage[] = [];

        try {
            // Add header message to messages.
            messages.push({
                type: IMessageType.PLAIN_TEXT,
                message: i18next.t('common.data.foundOne',
                        { executor: executor.name, resourceName: i18next.t('command.job.list.detail.resourceName', { ns: 'ZosMessage' }),
                            ns: 'ZosMessage' }),
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const job: Record<string, any> = jobs[0];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cardObject: Record<string, any> = super.createEmptyAdaptiveCard();

            // Add details Text Block
            cardObject.body.push({
                'type': 'TextBlock',
                'text': `**${i18next.t('command.job.list.detail.details', { ns: 'ZosMessage' })}${job.jobname}**`,
                'wrap': true,
                'separator': false,
            });

            // Add column set
            cardObject.body.push(super.createColumnSet(
                    `**${i18next.t('command.job.list.detail.id', { ns: 'ZosMessage' })}:** ${job.jobid}`,
                    `**${i18next.t('command.job.list.detail.owner', { ns: 'ZosMessage' })}:** ${job.owner}`,
                    true));
            cardObject.body.push(super.createColumnSet(
                    `**${i18next.t('command.job.list.detail.subSystem', { ns: 'ZosMessage' })}:** ${job.subsystem}`,
                    `**${i18next.t('command.job.list.detail.status', { ns: 'ZosMessage' })}:** ${job.status}`,
                    false));
            cardObject.body.push(super.createColumnSet(
                    `**${i18next.t('command.job.list.detail.type', { ns: 'ZosMessage' })}**: ${job.type}`,
                    `**${i18next.t('command.job.list.detail.returnCode', { ns: 'ZosMessage' })}:** ${job.retcode === null ? ' ' : job.retcode}`,
                    false));
            cardObject.body.push(super.createColumnSet(
                    `**${i18next.t('command.job.list.detail.class', { ns: 'ZosMessage' })}**: ${job.class}`,
                    `**${i18next.t('command.job.list.detail.PhaseName', { ns: 'ZosMessage' })}:** ${job['phase-name'] === undefined ? ' ' : job['phase-name']}`,
                    false));
            cardObject.body.push(super.createColumnSet(
                    `**${i18next.t('command.job.list.detail.Phase', { ns: 'ZosMessage' })}**: ${job.phase ? ' ' : job.phase}`,
                    `**${i18next.t('command.job.list.detail.ExecutionSystem', { ns: 'ZosMessage' })}**: `
                        + `${job['exec-system'] === undefined ? ' ' : job['exec-system']}`,
                    false));
            cardObject.body.push(super.createColumnSet(
                    `**${i18next.t('command.job.list.detail.ExecutionMember', { ns: 'ZosMessage' })}**: `
                        + `${job['exec-member'] === undefined ? ' ' : job['exec-member']}`,
                    `**${i18next.t('command.job.list.detail.startedTime', { ns: 'ZosMessage' })}:** `
                        + `${job['exec-started'] === undefined ? ' ' : job['exec-started']}`,

                    false));
            cardObject.body.push(super.createColumnSet(
                    `**${i18next.t('command.job.list.detail.ExecutionSubmittedTime', { ns: 'ZosMessage' })}**: `
                        + `${job['exec-submitted'] === undefined ? ' ': job['exec-submitted']}`,
                    `**${i18next.t('command.job.list.detail.ExecutionEndedTime', { ns: 'ZosMessage' })}:** `
                        + `${job['exec-ended'] === undefined ? ' ' : job['exec-ended']}`,
                    false));
            cardObject.body.push(super.createColumnSet(
                    `**${i18next.t('command.job.list.detail.reasonNotRunning', { ns: 'ZosMessage' })}**: `
                        + `${job['reason-not-running'] === undefined ? ' ' : job['reason-not-running']}`,
                    `**${i18next.t('command.job.list.detail.openJob', { ns: 'ZosMessage' })}:** [Zosmf](${job.url})`,
                    false));
            messages.push({
                type: IMessageType.MSTEAMS_ADAPTIVE_CARD,
                message: cardObject,
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
