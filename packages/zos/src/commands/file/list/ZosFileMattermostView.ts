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

class ZosFileSlackView extends ChatMattermostView {
    constructor(botOption: IBotOption, botLimit: IMattermostBotLimit) {
        super(botOption, botLimit);
    }

    // Get overview view.
    getOverview(files: Record<string, string| number>[], executor: IExecutor, command: ICommand): IMessage[] {
        // Print start log
        logger.start(this.getOverview, this);

        let messages: IMessage[] = [];

        try {
            // Generate header message
            let headerMessage = '';
            if (files.length === 0) {
                return messages = [{
                    type: IMessageType.PLAIN_TEXT,
                    message: i18next.t('common.data.foundZero',
                            { executor: executor.name, resourceName: i18next.t('command.file.list.status.resourceName',
                                    { ns: 'ZosMessage' }), ns: 'ZosMessage' }),
                }];
            } else {
                // TODO: Think about what message should be when  too many uss-files are searched, if files.length > limit.
                headerMessage = i18next.t('common.data.foundMoreThanOne',
                        { executor: executor.name, resourceName: i18next.t('command.file.list.status.resourceName', { ns: 'ZosMessage' }), ns: 'ZosMessage' });
            }

            const detailOptions = [];
            // Create fields array within attachment.
            const fields = [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let file: Record<string, any>;
            for (file of files) {
                if (file.name === '.' || file.name === '..') { // Ignore current and parent directory.
                    continue;
                }

                fields.push({
                    short: true,
                    value: `${file.mode.startsWith('d') ? ':file_folder:' : ':page_facing_up:'} **${i18next.t('command.file.list.status.name',
                            { ns: 'ZosMessage' })}: **${file.name}`,
                },
                {
                    short: true,
                    value: `**${i18next.t('command.file.list.status.owner', { ns: 'ZosMessage' })}: **${file.user}`,
                },
                {
                    short: true,
                    value: `**${i18next.t('command.file.list.status.mode', { ns: 'ZosMessage' })}: **${file.mode}`,
                },
                {
                    short: true,
                    value: `**${i18next.t('command.file.list.status.size', { ns: 'ZosMessage' })}: **${file.size}`,
                },
                {
                    short: false,
                    value: `*** `,
                });

                let path: string = null;
                if (command.adjective.option['path'] !== undefined) {
                    path = command.adjective.option['path'];
                } else if (command.adjective.option['p'] !== undefined) {
                    path = command.adjective.option['p'];
                }
                // Options for details message menu.
                detailOptions.push({
                    'text': `${file.name}`, //  TODO ICON
                    'value': `@${this.botOption.chatTool.option.botUserName}:zos:file:list:status:${file.name}:path=${path}`,
                });
            }

            // Add action
            const actions = <Record<string, unknown>[]>[];
            const contextData = {
                'pluginId': command.extraData.chatPlugin.package,
                'token': '',
                'id': '',
            };
            super.addMenuAction(actions, i18next.t('command.file.list.status.detailDropDownPlaceholder', { ns: 'ZosMessage' }), contextData, detailOptions);

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
    getDetail(files: Record<string, string| number>[], executor: IExecutor): IMessage[] {
        // Print start log
        logger.start(this.getDetail, this);

        let messages: IMessage[] = [];

        try {
            // Generate header message
            let headerMessage = '';
            if (files.length === 0) {
                return messages = [{
                    type: IMessageType.PLAIN_TEXT,
                    message: i18next.t('common.data.foundZero',
                            { executor: executor.name, resourceName: i18next.t('command.file.list.detail.resourceName',
                                    { ns: 'ZosMessage' }), ns: 'ZosMessage' }),
                }];
            }

            // Get file
            const file: Record<string, string| number> = files[0];
            headerMessage = i18next.t('common.data.foundOne',
                    { executor: executor.name, resourceName: i18next.t('command.file.list.detail.resourceName', { ns: 'ZosMessage' }),
                        ns: 'ZosMessage' });

            // Create fields array within attachment.
            const fields = [];
            fields.push({
                short: false,
                title: `**${i18next.t('command.file.list.detail.details', { ns: 'ZosMessage' })}${file.name}**`,
                value: `*** \n`,
            },
            {
                short: true,
                value: `**${i18next.t('command.file.list.detail.owner', { ns: 'ZosMessage' })}: **${file.user}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.file.list.detail.mode', { ns: 'ZosMessage' })}: **${file.mode}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.file.list.detail.size', { ns: 'ZosMessage' })}: **${file.size}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.file.list.detail.modification', { ns: 'ZosMessage' })}: **${file.mtime}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.file.list.detail.user', { ns: 'ZosMessage' })}: **${file.user}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.file.list.detail.userId', { ns: 'ZosMessage' })}: **${file.uid}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.file.list.detail.group', { ns: 'ZosMessage' })}: **${file.group}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.file.list.detail.groupId', { ns: 'ZosMessage' })}: **${file.gid}`,
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
            logger.end(this.getDetail);
        }
    }

    // Get mounts overview view.
    getMountsOverview(fileSystems: Record<string, string| number>[], executor: IExecutor, command: ICommand): IMessage[] {
        // Print start log
        logger.start(this.getMountsOverview, this);

        let messages: IMessage[] = [];

        try {
            // Generate header message
            let headerMessage = '';
            if (fileSystems.length === 0) {
                return messages = [{
                    type: IMessageType.PLAIN_TEXT,
                    message: i18next.t('common.data.foundZero',
                            { executor: executor.name, resourceName: i18next.t('command.file.list.mounts.resourceName',
                                    { ns: 'ZosMessage' }), ns: 'ZosMessage' }),
                }];
            } else {
                // TODO: Think about what message should be when  too many file systems are searched, if fileSystems.length > limit.
                headerMessage = headerMessage = i18next.t('common.data.foundMoreThanOne',
                        { executor: executor.name, resourceName: i18next.t('command.file.list.mounts.resourceName', { ns: 'ZosMessage' }), ns: 'ZosMessage' });
            }

            const detailOptions = [];
            // Create fields array within attachment.
            const fields = [];
            for (const fileSystem of fileSystems) {
                fields.push({
                    short: true,
                    value: `:page_facing_up: **${i18next.t('command.file.list.mounts.name', { ns: 'ZosMessage' })}: **${fileSystem.name}`,
                },
                {
                    short: true,
                    value: `**${i18next.t('command.file.list.mounts.mountPoint', { ns: 'ZosMessage' })}: **${fileSystem.mountpoint}`,
                },
                {
                    short: true,
                    value: `**${i18next.t('command.file.list.mounts.mode', { ns: 'ZosMessage' })}: **${fileSystem.mode}`,
                },
                {
                    short: false,
                    value: `*** \n`,
                });

                // Options for details message menu.
                detailOptions.push({
                    'text': `${fileSystem.name}`,
                    'value': `@${this.botOption.chatTool.option.botUserName}:zos:file:list:mounts:mp=${fileSystem.mountpoint}`,
                });
            }

            // Add action
            const actions = <Record<string, unknown>[]>[];
            const contextData = {
                'pluginId': command.extraData.chatPlugin.package,
                'token': '',
                'id': '',
            };
            super.addMenuAction(actions, i18next.t('command.file.list.mounts.detailDropDownPlaceholder', { ns: 'ZosMessage' }), contextData, detailOptions);

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
            logger.end(this.getMountsOverview);
        }
    }

    // Get mounts detail view.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getMountsDetail(fileSystems: Record<string, any>[], executor: IExecutor): IMessage[] {
        // Print start log
        logger.start(this.getMountsDetail, this);

        let messages: IMessage[] = [];

        try {
            // Generate header message
            let headerMessage = '';
            if (fileSystems.length === 0) {
                return messages = [{
                    type: IMessageType.PLAIN_TEXT,
                    message: i18next.t('common.data.foundZero',
                            { executor: executor.name, resourceName: i18next.t('command.file.list.mountsDetail.resourceName', { ns: 'ZosMessage' }),
                                ns: 'ZosMessage' }),
                }];
            }

            // Get file system
            const fileSystem: Record<string, string| number> = fileSystems[0];

            headerMessage = headerMessage = i18next.t('common.data.foundOne',
                    { executor: executor.name, resourceName: i18next.t('command.file.list.mountsDetail.resourceName', { ns: 'ZosMessage' }),
                        ns: 'ZosMessage' });


            // Create fields array within attachment.
            const fields = [];
            fields.push({
                short: false,
                title: `**${i18next.t('command.file.list.mountsDetail.details', { ns: 'ZosMessage' })}** ${fileSystem.name}`,
                value: `*** \n`,
            },
            {
                short: true,
                value: `**${i18next.t('command.file.list.mountsDetail.mountPoint', { ns: 'ZosMessage' })}: **${fileSystem.mountpoint}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.file.list.mountsDetail.mode', { ns: 'ZosMessage' })}: **${fileSystem.mode}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.file.list.mountsDetail.type', { ns: 'ZosMessage' })}: **${fileSystem.fstname}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.file.list.mountsDetail.status', { ns: 'ZosMessage' })}: **${fileSystem.status}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.file.list.mountsDetail.blockSize', { ns: 'ZosMessage' })}: **${fileSystem.bsize}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.file.list.mountsDetail.blockAvailable', { ns: 'ZosMessage' })}: **${fileSystem.bavail}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.file.list.mountsDetail.totalBlocks', { ns: 'ZosMessage' })}: **${fileSystem.blocks}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.file.list.mountsDetail.systemName', { ns: 'ZosMessage' })}: **${fileSystem.sysname}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.file.list.mountsDetail.readibc', { ns: 'ZosMessage' })}: **${fileSystem.readibc}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.file.list.mountsDetail.writeibc', { ns: 'ZosMessage' })}: **${fileSystem.writeibc}`,
            },
            {
                short: true,
                value: `**${i18next.t('command.file.list.mountsDetail.diribc', { ns: 'ZosMessage' })}: **${fileSystem.diribc}`,
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
            logger.end(this.getMountsDetail);
        }
    }
}

export = ZosFileSlackView;
