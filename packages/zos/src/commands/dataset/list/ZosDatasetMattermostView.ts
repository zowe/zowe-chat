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

import { logger, IMessage, IMessageType, ChatMattermostView, IExecutor, IBotOption, IMattermostBotLimit, ICommand } from '@zowe/chat';

class ZosDatasetMattermostView extends ChatMattermostView {
    constructor(botOption: IBotOption, botLimit: IMattermostBotLimit) {
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

            // Create fields array within attachment.
            const fields = [];
            const detailOptions = [];
            const memberOptions = [];
            for (const dataset of datasets) {
                let isPartitioned: boolean = false;
                if (dataset.dsorg
                    && (dataset.dsorg === 'PO'
                        || dataset.dsorg === 'POU'
                        || dataset.dsorg === 'PO-E')) {
                    isPartitioned = true;
                }
                fields.push({
                    short: true,
                    value: `${ isPartitioned === true ? ':card_index_dividers:' : ':page_with_curl:'} **${i18next.t('command.dataset.list.status.name', { ns: 'ZosMessage' })}:** ${dataset.dsname}`,
                },
                {
                    short: true,
                    value: `**${i18next.t('command.dataset.list.status.organization', { ns: 'ZosMessage' })}:** ${dataset.dsorg ? dataset.dsorg : ''}`,
                },
                {
                    short: true,
                    value: `**${i18next.t('command.dataset.list.status.type', { ns: 'ZosMessage' })}:** ${dataset.dsntp ? dataset.dsntp : ''}`,
                },
                {
                    short: true,
                    value: `**${i18next.t('command.dataset.list.status.logicalRecordLength', { ns: 'ZosMessage' })}:** ${dataset.lrecl ? dataset.lrecl : ''}`,
                },
                {
                    short: false,
                    value: `***`,
                });

                // Options for details message menu.
                detailOptions.push({
                    'text': `${dataset.dsname}`,
                    'value': `@${this.botOption.chatTool.option.botUserName}:zos:dataset:list:status:${dataset.dsname}`,
                });

                if (isPartitioned === true) {
                    memberOptions.push({
                        'text': `${dataset.dsname}`,
                        'value': `@${this.botOption.chatTool.option.botUserName}:zos:dataset:list:member::dn=${dataset.dsname}`,
                    });
                }
            }

            // Add action
            const actions = <Record<string, unknown>[]>[];
            const contextData = {
                'pluginId': command.extraData.chatPlugin.package,
                'token': '',
                'id': '',
            };
            super.addMenuAction(actions, i18next.t('command.dataset.list.status.detailDropDownPlaceholder', { ns: 'ZosMessage' }),
                    contextData, detailOptions);
            super.addMenuAction(actions, i18next.t('command.dataset.list.status.memberDropDownPlaceholder', { ns: 'ZosMessage' }),
                    contextData, memberOptions);

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

            // Get dataset
            const dataset: Record<string, unknown> = datasets[0];

            // Create fields array within attachment.
            const fields = [];
            fields.push({
                short: false,
                title: `${i18next.t('command.dataset.list.detail.details', { ns: 'ZosMessage' })}${dataset.dsname}`,
                value: `*** \n`,
            },
            {
                short: true,
                value: `**${i18next.t('command.dataset.list.detail.organization', { ns: 'ZosMessage' })}:** ${dataset.dsorg ? dataset.dsorg : ''}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.dataset.list.detail.type', { ns: 'ZosMessage' })}:** ${dataset.dsntp ? dataset.dsntp : ''}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.dataset.list.detail.logicalRecordLength', { ns: 'ZosMessage' })}: ** ${dataset.lrecl ? dataset.lrecl : ''}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.dataset.list.detail.spaceUnits', { ns: 'ZosMessage' })}: ** ${dataset.spacu ? dataset.spacu : ''}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.dataset.list.detail.usedExtents', { ns: 'ZosMessage' })}: ** ${dataset.extx ? dataset.extx : ''}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.dataset.list.detail.size', { ns: 'ZosMessage' })}: ** ${dataset.sizex ? dataset.sizex : ''}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.dataset.list.detail.recordFormat', { ns: 'ZosMessage' })}: ** ${dataset.recfm ? dataset.recfm : ''}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.dataset.list.detail.multiVolume', { ns: 'ZosMessage' })}: ** ${dataset.mvol ? dataset.mvol : ''}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.dataset.list.detail.volumeSerial', { ns: 'ZosMessage' })}: ** ${dataset.vol ? dataset.vol : ''}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.dataset.list.detail.deviceType', { ns: 'ZosMessage' })}: ** ${dataset.dev ? dataset.dev : ''}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.dataset.list.detail.catalogName', { ns: 'ZosMessage' })}: ** ${dataset.catnm}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.dataset.list.detail.creationDate', { ns: 'ZosMessage' })}: ** ${dataset.cdate ? dataset.cdate : ''}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.dataset.list.detail.lastReferenceDate', { ns: 'ZosMessage' })}: ** ${dataset.rdate ? dataset.rdate : ''}`,
            });


            // If this is a PDS dataset, add show member button.
            const actions = <Record<string, unknown>[]>[];
            if (dataset.dsorg
                && (dataset.dsorg === 'PO'
                    || dataset.dsorg === 'POU'
                    || dataset.dsorg === 'PO-E')) {
                const actionData = {
                    'pluginId': command.extraData.chatPlugin.package,
                    'id': 'showDatasetMember',
                    'token': '',
                    'placeHolder': i18next.t('command.dataset.list.detail.memberButtonTitle', { ns: 'ZosMessage' }),
                    'command': `@${this.botOption.chatTool.option.botUserName}:zos:dataset:list:member:dn=${dataset.dsname}`,
                };

                super.addButtonAction(actions, actionData);
            }

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
                // TODO: Think about what message should be when too many dataset members are searched, if members.length > limit.
                headerMessage = i18next.t('common.data.foundMoreThanOne',
                        { executor: executor.name, resourceName: i18next.t('command.dataset.list.member.resourceName',
                                { ns: 'ZosMessage' }), ns: 'ZosMessage' });
            }


            // Get required option dataset-name
            let datasetName: string = null;
            if (command.adjective.option['dataset-name'] !== undefined) {
                datasetName = command.adjective.option['dataset-name'];
            } else if (command.adjective.option['dn'] !== undefined) {
                datasetName = command.adjective.option['dn'];
            }

            // Create fields array within attachment.
            const fields = [];
            const detailOptions = [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            for (const member of members) {
                fields.push({
                    short: false,
                    value: `:page_with_curl: **${i18next.t('command.dataset.list.member.name', { ns: 'ZosMessage' })}: **${member.member}`,
                },
                {
                    short: false,
                    value: `***`,
                });

                // Options for details message menu.
                if (member.user) {
                    detailOptions.push({
                        'text': `${member.member}`,
                        'value': `@${this.botOption.chatTool.option.botUserName}:zos:dataset:list:member:${member.member}:dn=${datasetName}`,
                    });
                }
            }

            // Add view attribute action
            const actions = <Record<string, unknown>[]>[];
            const contextData = {
                'pluginId': command.extraData.chatPlugin.package,
                'token': '',
                'id': '',
            };
            super.addMenuAction(actions, i18next.t('command.dataset.list.member.attributeDropDownPlaceholder',
                    { ns: 'ZosMessage' }), contextData, detailOptions);

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

            // Get dataset member
            const member = members[0];

            // Create fields array within attachment.
            const fields = [];
            fields.push({
                short: false,
                title: `${i18next.t('command.dataset.list.memberDetail.details', { ns: 'ZosMessage' })}${member.member}`,
                value: `*** \n`,
            },
            {
                short: true,
                value: `**${i18next.t('command.dataset.list.memberDetail.version', { ns: 'ZosMessage' })}: ** ${member.vers ? member.vers : ''}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.dataset.list.memberDetail.modification', { ns: 'ZosMessage' })}: ** ${member.mod ? member.mod : ''}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.dataset.list.memberDetail.creationTime', { ns: 'ZosMessage' })}: ** ${member.ec4datextx ? member.c4date : ''}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.dataset.list.memberDetail.modificationDate', { ns: 'ZosMessage' })}: ** ${member.m4date ? member.m4date : ''}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.dataset.list.memberDetail.currentRecords', { ns: 'ZosMessage' })}: ** ${member.cnorc ? member.cnorc : ''}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.dataset.list.memberDetail.initialRecords', { ns: 'ZosMessage' })}: ** ${member.inorc ? member.inorc : ''}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.dataset.list.memberDetail.changedRecords', { ns: 'ZosMessage' })}: ** `
                        + `${member.mnorc !== undefined ? member.mnorc : ''}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.dataset.list.memberDetail.modificationTime', { ns: 'ZosMessage' })}: ** ${member.mtime ? member.mtime : ''}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.dataset.list.memberDetail.user', { ns: 'ZosMessage' })}: ** ${member.mtime ? member.user : ''}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.dataset.list.memberDetail.sclm', { ns: 'ZosMessage' })}: ** ${member.mtime ? member.sclm : ''}`,
            });

            // Create message attachments
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export = ZosDatasetMattermostView;
