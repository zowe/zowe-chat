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

import {Logger, IMessage, IMessageType, IExecutor, IBotOption, ChatMsteamsView} from '@zowe/chat';

import * as i18nJsonData from '../../i18n/jobDisplay.json';

const logger = Logger.getInstance();

class ZosJobMsteamsView extends ChatMsteamsView {
    private botOption: IBotOption;

    constructor(botOption: IBotOption) {
        super();

        this.botOption = botOption;
    }

    // Get overview
    getOverview(jobs: IJob[], executor: IExecutor, adjectives: Record<string, string>, packageName: string): IMessage[] {
        // Print start log
        logger.start(this.getOverview, this);

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

            // Add header message to messages.
            messages.push({
                type: IMessageType.PLAIN_TEXT,
                message: headerMessage,
            });

            // Create adaptive card object.
            const cardObject: Record<string, any> = super.createEmptyAdaptiveCard();

            let job: Record<string, any>;
            const detailOptions = [];
            for (job of jobs) {
                // Add column set
                cardObject.body.push(super.createColumnSet(
                        `**${job.jobname}** (ID: ${job.jobid})`,
                        '',
                        true));
                cardObject.body.push(super.createColumnSet(
                        `**${i18nJsonData.overview.owner}:** ${job.owner}`,
                        `**${i18nJsonData.overview.subSystem}:** ${job.subsystem}`,
                        false));
                cardObject.body.push(super.createColumnSet(
                        `**${i18nJsonData.overview.status}:** ${job.status}`,
                        `**${i18nJsonData.overview.type}:** ${job.type}`,
                        false));
                cardObject.body.push(super.createColumnSet(
                        `**${i18nJsonData.overview.returnCode}:** ${job.retcode === null ? ' ' : job.retcode}`,
                        `**${i18nJsonData.overview.startedTime}:** ${job['exec-started'] === undefined ? ' ' : job['exec-started']}`,
                        false));

                // Create option array for detail dropdown.
                detailOptions.push({
                    'title': `Details of ${job.jobname}(${job.jobid})`,
                    'value': `@${this.botOption.chatTool.option.botUserName}:zos:job:list:job:id=${job.jobid}`,
                });
            }

            // Add show details action
            const dropdownDataObj = {
                'pluginId': packageName,
                'id': 'showJobDetails',
                'title': i18nJsonData.overview.buttonTitle,
                'placeholder': i18nJsonData.overview.dropDownPlaceholder,
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

    // Get detail.
    getDetail(jobs: IJob[], executor: IExecutor, adjectives: Record<string, string>): IMessage[] {
        // Print start log
        logger.start(this.getDetail, this);

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
            const cardObject: Record<string, any> = super.createEmptyAdaptiveCard();

            // Add column set
            cardObject.body.push(super.createColumnSet(
                    `**${job.jobname}** (ID: ${job.jobid})`,
                    '',
                    true));
            cardObject.body.push(super.createColumnSet(
                    `**${i18nJsonData.detail.owner}:** ${job.owner}`,
                    `**${i18nJsonData.detail.subSystem}:** ${job.subsystem}`,
                    false));
            cardObject.body.push(super.createColumnSet(
                    `**${i18nJsonData.detail.status}:** ${job.status}`,
                    `**${i18nJsonData.detail.type}**: ${job.type}`,
                    false));
            cardObject.body.push(super.createColumnSet(
                    `**${i18nJsonData.detail.returnCode}:** ${job.retcode === null ? ' ' : job.retcode}`,
                    `**${i18nJsonData.detail.class}**: ${job.class}`,
                    false));
            cardObject.body.push(super.createColumnSet(
                    `**${i18nJsonData.detail.PhaseName}:** ${job['phase-name'] === undefined ? ' ' : job['phase-name']}`,
                    `**${i18nJsonData.detail.Phase}**: ${job.phase}`,
                    false));
            cardObject.body.push(super.createColumnSet(
                    `**${i18nJsonData.detail.ExecutionSystem}**: ${job['exec-system'] === undefined ? ' ' : job['exec-system']}`,
                    `**${i18nJsonData.detail.ExecutionMember}**: ${job['exec-member'] === undefined ? ' ' : job['exec-member']}`,
                    false));
            cardObject.body.push(super.createColumnSet(
                    `**${i18nJsonData.detail.startedTime}:** ${job['exec-started'] === undefined ? ' ' : job['exec-started']}`,
                    `**${i18nJsonData.detail.ExecutionSubmittedTime}**: ${job['exec-submitted'] === undefined ? ' ': job['exec-submitted']}`,
                    false));
            cardObject.body.push(super.createColumnSet(
                    `**${i18nJsonData.detail.ExecutionEndedTime}:** ${job['exec-ended'] === undefined ? ' ' : job['exec-ended']}`,
                    `**${i18nJsonData.detail.reasonNotRunning}**: ${job['reason-not-running'] === undefined ? ' ' : job['reason-not-running']}`,
                    false));
            cardObject.body.push(super.createColumnSet(
                    `**${i18nJsonData.detail.openJob}:** [Zosmf](${job.url})`,
                    '',
                    false));

            messages.push({
                type: IMessageType.MSTEAMS_ADAPTIVE_CARD,
                message: cardObject,
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

export = ZosJobMsteamsView;