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
import Util from '../../utils/Util';

const logger = Logger.getInstance();

class ZosJobMsteamsView extends ChatMsteamsView {
    private boOption: IBotOption;

    constructor(boOption: IBotOption) {
        super();

        this.boOption = boOption;
    }

    // Get overview
    getOverview(jobs: IJob[], executor: IExecutor, adjectives: Record<string, string>): IMessage[] {
        // Print start log
        logger.start(this.getOverview, this);

        let messages: IMessage[] = [];
        try {
            // No job found.
            const headerMessage = super.getHeaderMessage(jobs.length, executor, adjectives, 'job', '');
            if (jobs.length === 0) {
                return messages = [{
                    type: IMessageType.PLAIN_TEXT,
                    message: headerMessage,
                }];
            }

            // Add header message to messages.
            messages.push({
                type: IMessageType.PLAIN_TEXT,
                message: headerMessage,
            });

            // Create adaptive card object.
            const cardObject: Record<string, any> = super.getAdaptiveCardObject();

            let job: Record<string, any>;
            const detailOptions = [];
            for (job of jobs) {
                // Add column set
                cardObject.body.push(super.getColumnSet(
                        `**${job.jobname}** (ID: ${job.jobid})`,
                        '',
                        true));
                cardObject.body.push(super.getColumnSet(
                        `**${i18nJsonData.overview.owner}:** ${job.owner}`,
                        `**${i18nJsonData.overview.subSystem}:** ${job.subsystem}`,
                        false));
                cardObject.body.push(super.getColumnSet(
                        `**${i18nJsonData.overview.status}:** ${job.status}`,
                        `**${i18nJsonData.overview.type}:** ${job.type}`,
                        false));
                cardObject.body.push(super.getColumnSet(
                        `**${i18nJsonData.overview.returnCode}:** ${job.retcode === null ? ' ' : job.retcode}`,
                        `**${i18nJsonData.overview.startedTime}:** ${job['exec-started'] === undefined ? ' ' : job['exec-started']}`,
                        false));

                // Create option array for detail dropdown.
                detailOptions.push({
                    'title': `Details of ${job.jobname}(${job.jobid})`,
                    'value': `@${this.boOption.chatTool.option.botUserName}:zos:job:list:job:id=${job.jobid}`,
                });
            }

            // Add show details action
            const dropdownDataObj = {
                'pluginId': Util.getPackageName(),
                'id': 'showJobDetails',
                'title': i18nJsonData.overview.buttonTitle,
                'placeholder': i18nJsonData.overview.dropDownPlaceholder,
                'choices': detailOptions,
                'separator': true,
            };

            super.addDropdownActionObject(cardObject.body, dropdownDataObj);

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
            const job: Record<string, any> = jobs[0];

            // Add header message to messages
            messages.push({
                type: IMessageType.PLAIN_TEXT,
                message: super.getHeaderMessage(jobs.length, executor, adjectives, 'job', jobs[0].jobid, true),
            });

            const cardObject: Record<string, any> = super.getAdaptiveCardObject();

            // Add column set
            cardObject.body.push(super.getColumnSet(
                    `**${job.jobname}** (ID: ${job.jobid})`,
                    '',
                    true));
            cardObject.body.push(super.getColumnSet(
                    `**${i18nJsonData.detail.owner}:** ${job.owner}`,
                    `**${i18nJsonData.detail.subSystem}:** ${job.subsystem}`,
                    false));
            cardObject.body.push(super.getColumnSet(
                    `**${i18nJsonData.detail.status}:** ${job.status}`,
                    `**${i18nJsonData.detail.type}**: ${job.type}`,
                    false));
            cardObject.body.push(super.getColumnSet(
                    `**${i18nJsonData.detail.returnCode}:** ${job.retcode === null ? ' ' : job.retcode}`,
                    `**${i18nJsonData.detail.class}**: ${job.class}`,
                    false));
            cardObject.body.push(super.getColumnSet(
                    `**${i18nJsonData.detail.PhaseName}:** ${job['phase-name'] === undefined ? ' ' : job['phase-name']}`,
                    `**${i18nJsonData.detail.Phase}**: ${job.phase}`,
                    false));
            cardObject.body.push(super.getColumnSet(
                    `**${i18nJsonData.detail.ExecutionSystem}**: ${job['exec-system'] === undefined ? ' ' : job['exec-system']}`,
                    `**${i18nJsonData.detail.ExecutionMember}**: ${job['exec-member'] === undefined ? ' ' : job['exec-member']}`,
                    false));
            cardObject.body.push(super.getColumnSet(
                    `**${i18nJsonData.detail.startedTime}:** ${job['exec-started'] === undefined ? ' ' : job['exec-started']}`,
                    `**${i18nJsonData.detail.ExecutionSubmittedTime}**: ${job['exec-submitted'] === undefined ? ' ': job['exec-submitted']}`,
                    false));
            cardObject.body.push(super.getColumnSet(
                    `**${i18nJsonData.detail.ExecutionEndedTime}:** ${job['exec-ended'] === undefined ? ' ' : job['exec-ended']}`,
                    `**${i18nJsonData.detail.reasonNotRunning}**: ${job['reason-not-running'] === undefined ? ' ' : job['reason-not-running']}`,
                    false));
            cardObject.body.push(super.getColumnSet(
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
