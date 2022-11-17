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

import { logger, IMessage, IMessageType, IExecutor, ChatSlackView, ISlackBotLimit, IBotOption, ICommand } from '@zowe/chat';

class ZosDatasetSlackView extends ChatSlackView {
    constructor(botOption: IBotOption, botLimit: ISlackBotLimit) {
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
            const memberOptions = [];
            for (const dataset of datasets) {
                let isPartitioned: boolean = false;
                if (dataset.dsorg
                    && (dataset.dsorg === 'PO'
                        || dataset.dsorg === 'POU'
                        || dataset.dsorg === 'PO-E')) {
                    isPartitioned = true;
                }
                // Create fields array within section block.
                const datasetSection = {
                    'type': 'section',
                    'fields': [
                        {
                            'type': 'mrkdwn',
                            'text': `${isPartitioned === true ? ':card_index_dividers:' : ':page_with_curl:' } *${i18next.t('command.dataset.list.status.name', { ns: 'ZosMessage' })}:* ${dataset.dsname}`,
                        },
                        {
                            'type': 'mrkdwn',
                            'text': `*${i18next.t('command.dataset.list.status.organization', { ns: 'ZosMessage' })}:* ${dataset.dsorg ? dataset.dsorg : ''}`,
                        },
                        {
                            'type': 'mrkdwn',
                            'text': `*${i18next.t('command.dataset.list.status.type', { ns: 'ZosMessage' })}:* ${dataset.dsntp ? dataset.dsntp : ''}`,
                        },
                        {
                            'type': 'mrkdwn',
                            'text': `*${i18next.t('command.dataset.list.status.logicalRecordLength', { ns: 'ZosMessage' })}:* `
                                    + `${dataset.lrecl ? dataset.lrecl : ''}`,
                        },
                    ],
                };

                // Add section block to message blocks.
                blockObject.blocks.push(datasetSection);

                // Add divider block
                blockObject.blocks.push(
                        {
                            'type': 'divider',
                        },
                );

                // Create options for dataset details select menu
                detailOptions.push(super.createSelectMenuOption(`${dataset.dsname}`,
                        `@${this.botOption.chatTool.option.botUserName}:zos:dataset:list:status:${dataset.dsname}`));

                // Create options for dataset member select menu
                if (isPartitioned === true) {
                    memberOptions.push(super.createSelectMenuOption(`${dataset.dsname}`,
                            `@${this.botOption.chatTool.option.botUserName}:zos:dataset:list:member::dn=${dataset.dsname}`));
                }
            }

            // Create action block object.
            const actionBlock = {
                'type': 'actions',
                'elements': <Record<string, unknown>[]>[],
            };
            let actionData = {
                'pluginId': command.extraData.chatPlugin.package,
                'actionId': 'showDatasetDetails',
                'token': '',
                'placeHolder': i18next.t('command.dataset.list.status.detailDropDownPlaceholder', { ns: 'ZosMessage' }),
            };

            super.addSelectMenuAction(actionBlock, actionData, detailOptions);

            actionData = {
                'pluginId': command.extraData.chatPlugin.package,
                'actionId': 'showDatasetMembers',
                'token': '',
                'placeHolder': i18next.t('command.dataset.list.status.memberDropDownPlaceholder', { ns: 'ZosMessage' }),
            };

            super.addSelectMenuAction(actionBlock, actionData, memberOptions);


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

            // Add fields array to section block.
            blockObject.blocks.push({
                'type': 'section',
                'text': {
                    'type': 'mrkdwn',
                    'text': `*${i18next.t('command.dataset.list.detail.details', { ns: 'ZosMessage' })}${dataset.dsname}*`,
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
                        'text': `*${i18next.t('command.dataset.list.detail.organization', { ns: 'ZosMessage' })}:* ${dataset.dsorg ? dataset.dsorg : ''}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.dataset.list.detail.type', { ns: 'ZosMessage' })}:* ${dataset.dsntp ? dataset.dsntp : ''}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.dataset.list.detail.logicalRecordLength', { ns: 'ZosMessage' })}:* `
                                + `${dataset.lrecl ? dataset.lrecl : ''}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.dataset.list.detail.spaceUnits', { ns: 'ZosMessage' })}:* ${dataset.spacu ? dataset.spacu : ''}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.dataset.list.detail.usedExtents', { ns: 'ZosMessage' })}:* ${dataset.extx ? dataset.extx : ''}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.dataset.list.detail.size', { ns: 'ZosMessage' })}:* ${dataset.sizex ? dataset.sizex : ''}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.dataset.list.detail.recordFormat', { ns: 'ZosMessage' })}:* ${dataset.recfm ? dataset.recfm : ''}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.dataset.list.detail.multiVolume', { ns: 'ZosMessage' })}:* ${dataset.mvol ? dataset.mvol : ''}`,
                    },
                ],
            },
            {
                'type': 'section',
                'fields': [
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.dataset.list.detail.volumeSerial', { ns: 'ZosMessage' })}:* ${dataset.vol ? dataset.vol : ''}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.dataset.list.detail.deviceType', { ns: 'ZosMessage' })}:* ${dataset.dev ? dataset.dev : ''}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.dataset.list.detail.catalogName', { ns: 'ZosMessage' })}:* ${dataset.catnm}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.dataset.list.detail.creationDate', { ns: 'ZosMessage' })}:* ${dataset.cdate ? dataset.cdate : ''}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.dataset.list.detail.lastReferenceDate', { ns: 'ZosMessage' })}:* ${dataset.rdate ? dataset.rdate : ''}`,
                    },
                ],
            },
            {
                'type': 'divider',
            });

            // If this is a PDS dataset, add show member button.
            if (dataset.dsorg
                && (dataset.dsorg === 'PO'
                    || dataset.dsorg === 'POU'
                    || dataset.dsorg === 'PO-E')) {
                // Create action block
                const actionBlock = {
                    'type': 'actions',
                    'elements': <Record<string, unknown>[]>[],
                };

                const actionData = {
                    'pluginId': command.extraData.chatPlugin.package,
                    'actionId': 'showDatasetMember',
                    'token': '',
                    'placeHolder': i18next.t('command.dataset.list.detail.memberButtonTitle', { ns: 'ZosMessage' }),
                };

                super.addButtonAction(
                        actionBlock,
                        actionData,
                        `@${this.botOption.chatTool.option.botUserName}:zos:dataset:list:member:dn=${dataset.dsname}`);

                // Add action block
                if (actionBlock.elements.length > 0) {
                    blockObject.blocks.push(actionBlock);
                }
            }

            messages.push({
                type: IMessageType.SLACK_BLOCK,
                message: blockObject,
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

            // Get required option dataset-name
            let datasetName: string = null;
            if (command.adjective.option['dataset-name'] !== undefined) {
                datasetName = command.adjective.option['dataset-name'];
            } else if (command.adjective.option['dn'] !== undefined) {
                datasetName = command.adjective.option['dn'];
            }

            const detailOptions = [];
            for (const member of members) {
                // Create fields array within section block.
                const memberSection = {
                    'type': 'section',
                    'fields': [
                        {
                            'type': 'mrkdwn',
                            'text': `:page_with_curl: *${i18next.t('command.dataset.list.member.name', { ns: 'ZosMessage' })}:* ${member.member}`,
                        },
                    ],
                };

                // Add section block to message blocks.
                blockObject.blocks.push(memberSection);

                // Add divider block
                blockObject.blocks.push(
                        {
                            'type': 'divider',
                        },
                );

                // Create options for dataset member details select menu
                detailOptions.push(super.createSelectMenuOption(`${member.member}`,
                        `@${this.botOption.chatTool.option.botUserName}:zos:dataset:list:member:${member.member}:dn=${datasetName}`));
            }

            // Create action block object.
            const actionBlock = {
                'type': 'actions',
                'elements': <Record<string, unknown>[]>[],
            };
            const actionData = {
                'pluginId': command.extraData.chatPlugin.package,
                'actionId': 'showDatasetMemberDetails',
                'token': '',
                'placeHolder': i18next.t('command.dataset.list.member.attributeDropDownPlaceholder', { ns: 'ZosMessage' }),
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

    // Get member detail view.
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

            // Add fields array to section block.
            blockObject.blocks.push({
                'type': 'section',
                'text': {
                    'type': 'mrkdwn',
                    'text': `*${i18next.t('command.dataset.list.memberDetail.details', { ns: 'ZosMessage' })}${member.member}*`,
                },
            },
            {
                'type': 'divider',
            });

            blockObject.blocks.push({
                'type': 'section',
                'fields': [
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.dataset.list.memberDetail.user', { ns: 'ZosMessage' })}:* ${member.mtime ? member.user : ''}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.dataset.list.memberDetail.sclm', { ns: 'ZosMessage' })}:* ${member.mtime ? member.sclm : ''}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.dataset.list.memberDetail.version', { ns: 'ZosMessage' })}:* ${member.vers ? member.vers : ''}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.dataset.list.memberDetail.modification', { ns: 'ZosMessage' })}:* ${member.mod ? member.mod : ''}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.dataset.list.memberDetail.creationTime', { ns: 'ZosMessage' })}:* `
                                + `${member.ec4datextx ? member.c4date : ''}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.dataset.list.memberDetail.modificationDate', { ns: 'ZosMessage' })}:* `
                                + `${member.m4date ? member.m4date : ''}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.dataset.list.memberDetail.currentRecords', { ns: 'ZosMessage' })}:* ${member.cnorc ? member.cnorc : ''}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.dataset.list.memberDetail.initialRecords', { ns: 'ZosMessage' })}:* ${member.inorc ? member.inorc : ''}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.dataset.list.memberDetail.changedRecords', { ns: 'ZosMessage' })}:* `
                                + `${member.mnorc !== undefined ? member.mnorc : ''}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.dataset.list.memberDetail.modificationTime', { ns: 'ZosMessage' })}:* `
                            + `${member.mtime ? member.mtime : ''}`,
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

export = ZosDatasetSlackView;
