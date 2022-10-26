/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import i18next from 'i18next';

import { logger, IMessage, IMessageType, ChatMsteamsView, IExecutor, IBotOption, IMsteamsBotLimit, ICommand } from '@zowe/chat';

class ZosDatasetMsteamsView extends ChatMsteamsView {
    constructor(botOption: IBotOption, botLimit: IMsteamsBotLimit) {
        super(botOption, botLimit);
    }

    // Get overview view.
    getOverview(datasets: Record<string, unknown>[], executor: IExecutor, command: ICommand): IMessage[] {
        // Print start log
        logger.start(this.getOverview, this);

        let messages: IMessage[] = [];

        try {
            // Generate header message
            let headerMessage = '';
            if (datasets.length === 0) {
                return messages = [{
                    type: IMessageType.PLAIN_TEXT,
                    message: i18next.t('common.data.foundZero',
                            { executor: executor.name, resourceName: i18next.t('command.dataset.list.status.resourceName', { ns: 'ZosMessage' }),
                                ns: 'ZosMessage' }),
                }];
            } else {
                // TODO: Think about what message should be when  too many datasets are searched, if datasets.length > limit.
                headerMessage = i18next.t('common.data.foundMoreThanOne',
                        { executor: executor.name, resourceName: i18next.t('command.dataset.list.status.resourceName',
                                { ns: 'ZosMessage' }), ns: 'ZosMessage' });
            }

            // Add header message to messages.
            messages.push({
                type: IMessageType.PLAIN_TEXT,
                message: headerMessage,
            });

            // Create adaptive card object.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cardObject: Record<string, any> = super.createEmptyAdaptiveCard();

            const detailOptions = [];
            for (const dataset of datasets) {
                let icon = String.fromCodePoint(0x1F4C3);
                if (dataset.dsorg
                    && (dataset.dsorg === 'PO'
                        || dataset.dsorg === 'POU'
                        || dataset.dsorg === 'PO-E')) {
                    icon = String.fromCodePoint(0x1F5C2);
                }

                // Add column set
                cardObject.body.push(super.createColumnSet(
                        `${icon} **${i18next.t('command.dataset.list.status.name', { ns: 'ZosMessage' })}:** ${dataset.dsname}`,
                        `**${i18next.t('command.dataset.list.status.organization', { ns: 'ZosMessage' })}:** ${dataset.dsorg ? dataset.dsorg : ''}`,
                        true));
                cardObject.body.push(super.createColumnSet(
                        `**${i18next.t('command.dataset.list.status.type', { ns: 'ZosMessage' })}:** ${dataset.dsntp ? dataset.dsntp : ''}`,
                        `**${i18next.t('command.dataset.list.status.logicalRecordLength', { ns: 'ZosMessage' })}:** ${dataset.lrecl ? dataset.lrecl : ''}`,
                        false));

                // Create option array for detail dropdown.
                detailOptions.push({
                    'title': `${dataset.dsname}`,
                    'value': `@${this.botOption.chatTool.option.botUserName}:zos:dataset:list:status:${dataset.dsname}`,
                });
            }

            // Add show details action
            const dropdownDataObj = {
                'pluginId': command.extraData.chatPlugin.package,
                'id': 'showDatasetDetails',
                'title': i18next.t('command.dataset.list.status.buttonTitle', { ns: 'ZosMessage' }),
                'placeholder': i18next.t('command.dataset.list.status.detailDropDownPlaceholder', { ns: 'ZosMessage' }),
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
                message: i18next.t('common.error.internal', { ns: 'ZosMessage' }),
            }];
        } finally {
            // Print end log
            logger.end(this.getOverview);
        }
    }

    // Get detail view.
    getDetail(datasets: Record<string, unknown>[], executor: IExecutor, command: ICommand): IMessage[] {
        // Print start log
        logger.start(this.getDetail, this);

        let messages: IMessage[] = [];

        try {
            // Generate header message
            let headerMessage = '';
            if (datasets.length === 0) {
                return messages = [{
                    type: IMessageType.PLAIN_TEXT,
                    message: i18next.t('common.data.foundZero',
                            { executor: executor.name, resourceName: i18next.t('command.dataset.list.detail.resourceName', { ns: 'ZosMessage' }),
                                ns: 'ZosMessage' }),
                }];
            } else {
                headerMessage = i18next.t('common.data.foundOne',
                        { executor: executor.name, resourceName: i18next.t('command.dataset.list.detail.resourceName', { ns: 'ZosMessage' }),
                            ns: 'ZosMessage' });
            }

            // Add header message to messages.
            messages.push({
                type: IMessageType.PLAIN_TEXT,
                message: headerMessage,
            });

            // Get dataset
            const dataset = datasets[0];

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cardObject: Record<string, any> = super.createEmptyAdaptiveCard();

            // Add details Text Block
            cardObject.body.push({
                'type': 'TextBlock',
                'text': `**${i18next.t('command.dataset.list.detail.details', { ns: 'ZosMessage' })}${dataset.dsname}**`,
                'wrap': true,
                'separator': false,
            });
            // Add column set
            cardObject.body.push(super.createColumnSet(
                    `**${i18next.t('command.dataset.list.detail.organization', { ns: 'ZosMessage' })}:** ${dataset.dsorg ? dataset.dsorg : ''}`,
                    `**${i18next.t('command.dataset.list.detail.type', { ns: 'ZosMessage' })}:** ${dataset.dsntp ? dataset.dsntp : ''}`,
                    true));
            cardObject.body.push(super.createColumnSet(
                    `**${i18next.t('command.dataset.list.detail.logicalRecordLength', { ns: 'ZosMessage' })}:** ${dataset.lrecl ? dataset.lrecl : ''}`,
                    `**${i18next.t('command.dataset.list.detail.spaceUnits', { ns: 'ZosMessage' })}:** ${dataset.spacu ? dataset.spacu : ''}`,
                    false));
            cardObject.body.push(super.createColumnSet(
                    `**${i18next.t('command.dataset.list.detail.usedExtents', { ns: 'ZosMessage' })}:** ${dataset.extx ? dataset.extx : ''}`,
                    `**${i18next.t('command.dataset.list.detail.multiVolume', { ns: 'ZosMessage' })}:** ${dataset.mvol ? dataset.mvol : ''}`,
                    false));
            cardObject.body.push(super.createColumnSet(
                    `**${i18next.t('command.dataset.list.detail.recordFormat', { ns: 'ZosMessage' })}:** ${dataset.recfm ? dataset.recfm : ''}`,
                    `**${i18next.t('command.dataset.list.detail.volumeSerial', { ns: 'ZosMessage' })}:** ${dataset.vol ? dataset.vol : ''}`,
                    false));
            cardObject.body.push(super.createColumnSet(
                    `**${i18next.t('command.dataset.list.detail.deviceType', { ns: 'ZosMessage' })}:** ${dataset.dev ? dataset.dev : ''}`,
                    `**${i18next.t('command.dataset.list.detail.catalogName', { ns: 'ZosMessage' })}:** ${dataset.catnm}`,
                    false));
            cardObject.body.push(super.createColumnSet(
                    `**${i18next.t('command.dataset.list.detail.creationDate', { ns: 'ZosMessage' })}:** ${dataset.cdate ? dataset.cdate : ''}`,
                    `**${i18next.t('command.dataset.list.detail.lastReferenceDate', { ns: 'ZosMessage' })}:** ${dataset.rdate ? dataset.rdate : ''}`,
                    false));

            // If this is a PDS dataset, add show member button.
            if (dataset.dsorg
                && (dataset.dsorg === 'PO'
                    || dataset.dsorg === 'POU'
                    || dataset.dsorg === 'PO-E')) {
                const buttonActionDataObj = {
                    'pluginId': command.extraData.chatPlugin.package,
                    'id': 'showDatasetMember',
                    'title': i18next.t('command.dataset.list.detail.memberButtonTitle', { ns: 'ZosMessage' }),
                    'separator': true,
                    'token': '',
                    'command': `@${this.botOption.chatTool.option.botUserName}:zos:dataset:list:member:dn=${dataset.dsname}`,
                };

                super.addButtonAction(cardObject.body, buttonActionDataObj);
            }

            messages.push({
                type: IMessageType.MSTEAMS_ADAPTIVE_CARD,
                message: cardObject,
            });
            return messages;
        } catch (error) {
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

    // Get dataset member overview view.
    getMemberOverview(members: Record<string, unknown>[], executor: IExecutor, command: ICommand): IMessage[] {
        // Print start log
        logger.start(this.getMemberOverview, this);

        let messages: IMessage[] = [];

        try {
            // Generate header message
            let headerMessage = '';
            if (members.length === 0) {
                return messages = [{
                    type: IMessageType.PLAIN_TEXT,
                    message: i18next.t('common.data.foundZero',
                            { executor: executor.name, resourceName: i18next.t('command.dataset.list.member.resourceName', { ns: 'ZosMessage' }),
                                ns: 'ZosMessage' }),
                }];
            } else {
                // TODO: Think about what message should be when  too many dataset members are searched, if members.length > limit.
                headerMessage = i18next.t('common.data.foundMoreThanOne',
                        { executor: executor.name, resourceName: i18next.t('command.dataset.list.member.resourceName',
                                { ns: 'ZosMessage' }), ns: 'ZosMessage' });
            }

            // Add header message to messages.
            messages.push({
                type: IMessageType.PLAIN_TEXT,
                message: headerMessage,
            });

            // get dataset name
            let datasetName: string = null;
            if (command.adjective.option['dataset-name'] !== undefined) {
                datasetName = command.adjective.option['dataset-name'];
            } else if (command.adjective.option['dn'] !== undefined) {
                datasetName = command.adjective.option['dn'];
            }

            const detailOptions = [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cardObject: Record<string, any> = super.createEmptyAdaptiveCard();
            // Add column set
            for (const member of members) {
                cardObject.body.push(super.createColumnSet(
                        `${String.fromCodePoint(0x1F4C3)} **${i18next.t('command.dataset.list.member.name', { ns: 'ZosMessage' })}:** ${member.member}`,
                        '',
                        true));

                // Options for details dropdown box.
                detailOptions.push({
                    'title': member.member,
                    'value': `@${this.botOption.chatTool.option.botUserName}:zos:dataset:list:member:${member.member}:dn=${datasetName}`,
                });
            }

            // Add view details action
            const dropdownDataObj = {
                'pluginId': command.extraData.chatPlugin.package,
                'id': 'showDatasetMember',
                'title': i18next.t('command.dataset.list.member.detailButtonTitle', { ns: 'ZosMessage' }),
                'placeholder': i18next.t('command.dataset.list.member.attributeDropDownPlaceholder', { ns: 'ZosMessage' }),
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
                message: i18next.t('common.error.internal', { ns: 'ZosMessage' }),
            }];
        } finally {
            // Print end log
            logger.end(this.getMemberOverview);
        }
    }

    // Get dataset member detail view.
    getMemberDetail(members: Record<string, unknown>[], executor: IExecutor): IMessage[] {
        // Print start log
        logger.start(this.getMemberDetail, this);

        let messages: IMessage[] = [];

        try {
            // Generate header message
            let headerMessage = '';
            if (members.length === 0) {
                return messages = [{
                    type: IMessageType.PLAIN_TEXT,
                    message: i18next.t('common.data.foundZero',
                            { executor: executor.name, resourceName: i18next.t('command.dataset.list.memberDetail.resourceName', { ns: 'ZosMessage' }),
                                ns: 'ZosMessage' }),
                }];
            } else {
                headerMessage = i18next.t('common.data.foundOne',
                        { executor: executor.name, resourceName: i18next.t('command.dataset.list.memberDetail.resourceName', { ns: 'ZosMessage' }),
                            ns: 'ZosMessage' });
            }

            // Add header message to messages.
            messages.push({
                type: IMessageType.PLAIN_TEXT,
                message: headerMessage,
            });

            // Get member
            const member = members[0];

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cardObject: Record<string, any> = super.createEmptyAdaptiveCard();

            // Add details Text Block
            cardObject.body.push({
                'type': 'TextBlock',
                'text': `**${i18next.t('command.dataset.list.memberDetail.details', { ns: 'ZosMessage' })}${member.member}**`,
                'wrap': true,
                'separator': false,
            });
            // Add column set
            cardObject.body.push(super.createColumnSet(
                    `**${i18next.t('command.dataset.list.memberDetail.version', { ns: 'ZosMessage' })}:** ${member.vers ? member.vers : ''}`,
                    `**${i18next.t('command.dataset.list.memberDetail.modification', { ns: 'ZosMessage' })}:** ${member.mod ? member.mod : ''}`,
                    true));
            cardObject.body.push(super.createColumnSet(
                    `**${i18next.t('command.dataset.list.memberDetail.creationTime', { ns: 'ZosMessage' })}:** ${member.ec4datextx ? member.ec4datextx : ''}`,
                    `**${i18next.t('command.dataset.list.memberDetail.modificationDate', { ns: 'ZosMessage' })}:** ${member.m4date ? member.m4date : ''}`,
                    false));
            cardObject.body.push(super.createColumnSet(
                    `**${i18next.t('command.dataset.list.memberDetail.currentRecords', { ns: 'ZosMessage' })}:** ${member.cnorc ? member.cnorc : ''}`,
                    `**${i18next.t('command.dataset.list.memberDetail.initialRecords', { ns: 'ZosMessage' })}:** ${member.inorc ? member.inorc : ''}`,
                    false));
            cardObject.body.push(super.createColumnSet(
                    `**${i18next.t('command.dataset.list.memberDetail.changedRecords', { ns: 'ZosMessage' })}:** `
                        + `${member.mnorc !== undefined ? member.mnorc : ''}`,
                    `**${i18next.t('command.dataset.list.memberDetail.modificationTime', { ns: 'ZosMessage' })}:** ${member.mtime ? member.mtime : ''}`,
                    false));
            cardObject.body.push(super.createColumnSet(
                    `**${i18next.t('command.dataset.list.memberDetail.user', { ns: 'ZosMessage' })}:** ${member.user ? member.user : ''}`,
                    `**${i18next.t('command.dataset.list.memberDetail.sclm', { ns: 'ZosMessage' })}:** ${member.sclm ? member.sclm : ''}`,
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
                message: i18next.t('common.error.internal', { ns: 'ZosMessage' }),
            }];
        } finally {
            // Print end log
            logger.end(this.getMemberDetail);
        }
    }
}

export = ZosDatasetMsteamsView;
