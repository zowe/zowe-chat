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

class ZosFileSlackView extends ChatSlackView {
    constructor(botOption: IBotOption, botLimit: ISlackBotLimit) {
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
                // TODO: Think about what message should be when  too many uss files are searched, if files.length > limit.
                headerMessage = headerMessage = i18next.t('common.data.foundMoreThanOne',
                        { executor: executor.name, resourceName: i18next.t('command.file.list.status.resourceName', { ns: 'ZosMessage' }), ns: 'ZosMessage' });
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
            let file: Record<string, any>;
            for (file of files) {
                if (file.name === '.' || file.name === '..') { // Ignore current and parent directory.
                    continue;
                }

                // Create fields array within section block.
                const fileSection = {
                    'type': 'section',
                    'fields': [
                        {
                            'type': 'mrkdwn',
                            'text': `${file.mode.startsWith('d') ? ':file_folder:' : ':page_facing_up:'} *${i18next.t('command.file.list.status.name',
                                    { ns: 'ZosMessage' })}:* ${file.name}`,
                        },
                        {
                            'type': 'mrkdwn',
                            'text': `*${i18next.t('command.file.list.status.owner', { ns: 'ZosMessage' })}:* ${file.user}`,
                        },
                        {
                            'type': 'mrkdwn',
                            'text': `*${i18next.t('command.file.list.status.mode', { ns: 'ZosMessage' })}:* ${file.mode}`,
                        },
                        {
                            'type': 'mrkdwn',
                            'text': `*${i18next.t('command.file.list.status.size', { ns: 'ZosMessage' })}:* ${file.size}`,
                        },
                    ],
                };

                // Add section block to message blocks.
                blockObject.blocks.push(fileSection);

                // Add divider block
                blockObject.blocks.push(
                        {
                            'type': 'divider',
                        },
                );

                // Create options for list details select menu
                let path: string = null;
                if (command.adjective.option['path'] !== undefined) {
                    path = command.adjective.option['path'];
                } else if (command.adjective.option['p'] !== undefined) {
                    path = command.adjective.option['p'];
                }
                detailOptions.push(super.createSelectMenuOption(`${file.name}`,
                        `@${this.botOption.chatTool.option.botUserName}:zos:file:list:status:${file.name}:path=${path}`));
            }

            // Create action block object.
            const actionBlock = {
                'type': 'actions',
                'elements': <Record<string, unknown>[]>[],
            };
            const actionData = {
                'pluginId': command.extraData.chatPlugin.package,
                'actionId': 'showFileDetails',
                'token': '',
                'placeHolder': i18next.t('command.file.list.status.detailDropDownPlaceholder', { ns: 'ZosMessage' }),
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
            // const isDirectory = (String)(file.mode).startsWith('d') ? true : false;
            headerMessage = i18next.t('common.data.foundOne',
                    { executor: executor.name, resourceName: i18next.t('command.file.list.detail.resourceName', { ns: 'ZosMessage' }),
                        ns: 'ZosMessage' });

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
                    'text': `*${i18next.t('command.file.list.detail.details', { ns: 'ZosMessage' })}${file.name}*`,
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
                        'text': `*${i18next.t('command.file.list.detail.owner', { ns: 'ZosMessage' })}:* ${file.user}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.file.list.detail.mode', { ns: 'ZosMessage' })}:* ${file.mode}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.file.list.detail.size', { ns: 'ZosMessage' })}:* ${file.size}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.file.list.detail.modification', { ns: 'ZosMessage' })}:* ${file.mtime}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.file.list.detail.user', { ns: 'ZosMessage' })}:* ${file.user}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.file.list.detail.userId', { ns: 'ZosMessage' })}:* ${file.uid}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.file.list.detail.group', { ns: 'ZosMessage' })}:* ${file.group}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.file.list.detail.groupId', { ns: 'ZosMessage' })}:* ${file.gid}`,
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
                headerMessage = headerMessage = headerMessage = i18next.t('common.data.foundMoreThanOne',
                        { executor: executor.name, resourceName: i18next.t('command.file.list.mounts.resourceName', { ns: 'ZosMessage' }), ns: 'ZosMessage' });
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
            for (const fileSystem of fileSystems) {
                // Create fields array within section block.
                const mountsSection = {
                    'type': 'section',
                    'fields': [
                        {
                            'type': 'mrkdwn',
                            'text': `:page_facing_up: *${i18next.t('command.file.list.mounts.name', { ns: 'ZosMessage' })}:* ${fileSystem.name}`,
                        },
                        {
                            'type': 'mrkdwn',
                            'text': `*${i18next.t('command.file.list.mounts.mountPoint', { ns: 'ZosMessage' })}:* ${fileSystem.mountpoint}`,
                        },
                        {
                            'type': 'mrkdwn',
                            'text': `*${i18next.t('command.file.list.mounts.mode', { ns: 'ZosMessage' })}:* ${fileSystem.mode}`,
                        },
                    ],
                };

                // Add section block to message blocks.
                blockObject.blocks.push(mountsSection);

                // Add divider block
                blockObject.blocks.push(
                        {
                            'type': 'divider',
                        },
                );

                // Create options for file system details select menu
                detailOptions.push(super.createSelectMenuOption(`${fileSystem.name}`,
                        `@${this.botOption.chatTool.option.botUserName}:zos:file:list:mounts:mp=${fileSystem.mountpoint}`));
            }

            // Create action block object.
            const actionBlock = {
                'type': 'actions',
                'elements': <Record<string, unknown>[]>[],
            };
            const actionData = {
                'pluginId': command.extraData.chatPlugin.package,
                'actionId': 'showMountsDetails',
                'token': '',
                'placeHolder': i18next.t('command.file.list.mounts.detailDropDownPlaceholder', { ns: 'ZosMessage' }),
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
            logger.end(this.getMountsOverview);
        }
    }

    // Get mounts detail view.
    getMountsDetail(fileSystems: Record<string, unknown>[], executor: IExecutor): IMessage[] {
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

            // Get mounts
            const fileSystem = fileSystems[0];
            headerMessage = headerMessage = headerMessage = i18next.t('common.data.foundOne',
                    { executor: executor.name, resourceName: i18next.t('command.file.list.mountsDetail.resourceName', { ns: 'ZosMessage' }),
                        ns: 'ZosMessage' });

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
                    'text': `*${i18next.t('command.file.list.mountsDetail.details', { ns: 'ZosMessage' })}* ${fileSystem.name}`,
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
                        'text': `*${i18next.t('command.file.list.mountsDetail.mountPoint', { ns: 'ZosMessage' })}:* ${fileSystem.mountpoint}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.file.list.mountsDetail.mode', { ns: 'ZosMessage' })}:* ${fileSystem.mode}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.file.list.mountsDetail.type', { ns: 'ZosMessage' })}:* ${fileSystem.fstname}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.file.list.mountsDetail.status', { ns: 'ZosMessage' })}:* ${fileSystem.status}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.file.list.mountsDetail.blockSize', { ns: 'ZosMessage' })}:* ${fileSystem.bsize}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.file.list.mountsDetail.blockAvailable', { ns: 'ZosMessage' })}:* ${fileSystem.bavail}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.file.list.mountsDetail.totalBlocks', { ns: 'ZosMessage' })}:* ${fileSystem.blocks}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.file.list.mountsDetail.systemName', { ns: 'ZosMessage' })}:* ${fileSystem.sysname}`,
                    },
                ],
            },
            {
                'type': 'section',
                'fields': [
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.file.list.mountsDetail.readibc', { ns: 'ZosMessage' })}:* ${fileSystem.readibc}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.file.list.mountsDetail.writeibc', { ns: 'ZosMessage' })}:* ${fileSystem.writeibc}`,
                    },
                    {
                        'type': 'mrkdwn',
                        'text': `*${i18next.t('command.file.list.mountsDetail.diribc', { ns: 'ZosMessage' })}:* ${fileSystem.diribc}`,
                    },
                    {
                        'type': 'plain_text',
                        'text': ' ',
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
            logger.end(this.getMountsDetail);
        }
    }
}

export = ZosFileSlackView;
