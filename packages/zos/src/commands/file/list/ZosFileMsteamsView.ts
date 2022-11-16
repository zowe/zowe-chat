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
import { logger, IMessage, IMessageType, IExecutor, ChatMsteamsView, IBotOption, IMsteamsBotLimit, ICommand } from '@zowe/chat';

class ZosFileMsteamsView extends ChatMsteamsView {
    constructor(botOption: IBotOption, botLimit: IMsteamsBotLimit) {
        super(botOption, botLimit);
    }

    // Get overview
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
                // TODO: Think about what message should be when  too many files are searched, if files.length > limit.
                headerMessage = headerMessage = i18next.t('common.data.foundMoreThanOne',
                        { executor: executor.name, resourceName: i18next.t('command.file.list.status.resourceName', { ns: 'ZosMessage' }), ns: 'ZosMessage' });
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
            let file: Record<string, any>;
            const detailOptions = [];
            for (file of files) {
                if (file.name === '.' || file.name === '..') { // Ignore current and parent directory.
                    continue;
                }

                // Add column set
                cardObject.body.push(super.createColumnSet(
                        `${file.mode.startsWith('d') ? String.fromCodePoint(0x1F4C1) : String.fromCodePoint(0x1F4C4)} **`
                            + `${i18next.t('command.file.list.status.name', { ns: 'ZosMessage' })}:** ${file.name}`,
                        `**${i18next.t('command.file.list.status.owner', { ns: 'ZosMessage' })}:** ${file.user}`,
                        true));
                cardObject.body.push(super.createColumnSet(
                        `**${i18next.t('command.file.list.status.mode', { ns: 'ZosMessage' })}:** ${file.mode}`,
                        `**${i18next.t('command.file.list.status.size', { ns: 'ZosMessage' })}:** ${file.size}`,
                        false));

                // Create option array for detail dropdown.
                let path: string = null;
                if (command.adjective.option['path'] !== undefined) {
                    path = command.adjective.option['path'];
                } else if (command.adjective.option['p'] !== undefined) {
                    path = command.adjective.option['p'];
                }
                detailOptions.push({
                    'title': `${file.name}`,
                    'value': `@${this.botOption.chatTool.option.botUserName}:zos:file:list:status:${file.name}:path=${path}`,
                });
            }

            // Add show details action
            const dropdownDataObj = {
                'pluginId': command.extraData.chatPlugin.package,
                'id': 'showFileDetails',
                'title': i18next.t('command.file.list.status.buttonTitle', { ns: 'ZosMessage' }),
                'placeholder': i18next.t('command.file.list.status.detailDropDownPlaceholder', { ns: 'ZosMessage' }),
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

    // Get detail.
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

            // Add header message to messages.
            messages.push({
                type: IMessageType.PLAIN_TEXT,
                message: headerMessage,
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cardObject: Record<string, any> = super.createEmptyAdaptiveCard();

            // Add details Text Block
            cardObject.body.push({
                'type': 'TextBlock',
                'text': `**${i18next.t('command.file.list.detail.details', { ns: 'ZosMessage' })}${file.name}**`,
                'wrap': true,
                'separator': false,
            });
            // Add column set
            cardObject.body.push(super.createColumnSet(
                    `**${i18next.t('command.file.list.detail.owner', { ns: 'ZosMessage' })}:** ${file.user}`,
                    `**${i18next.t('command.file.list.detail.mode', { ns: 'ZosMessage' })}:** ${file.mode}`,
                    true));
            cardObject.body.push(super.createColumnSet(
                    `**${i18next.t('command.file.list.detail.size', { ns: 'ZosMessage' })}:** ${file.size}`,
                    `**${i18next.t('command.file.list.detail.modification', { ns: 'ZosMessage' })}**: ${file.mtime}`,
                    false));
            cardObject.body.push(super.createColumnSet(
                    `**${i18next.t('command.file.list.detail.user', { ns: 'ZosMessage' })}:** ${file.user}`,
                    `**${i18next.t('command.file.list.detail.userId', { ns: 'ZosMessage' })}**: ${file.uid}`,
                    false));
            cardObject.body.push(super.createColumnSet(
                    `**${i18next.t('command.file.list.detail.group', { ns: 'ZosMessage' })}:** ${file.group}`,
                    `**${i18next.t('command.file.list.detail.groupId', { ns: 'ZosMessage' })}**: ${file.gid}`,
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
            logger.end(this.getDetail);
        }
    }

    // Get mounts overview
    getMountsOverview(fileSystems: Record<string, string| number>[], executor: IExecutor, command: ICommand): IMessage[] {
        // Print start log
        logger.start(this.getOverview, this);

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

            // Add header message to messages.
            messages.push({
                type: IMessageType.PLAIN_TEXT,
                message: headerMessage,
            });

            // Create adaptive card object.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cardObject: Record<string, any> = super.createEmptyAdaptiveCard();

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const detailOptions = [];
            for (const fileSystem of fileSystems) {
                // Add column set
                cardObject.body.push(super.createColumnSet(
                        `${String.fromCodePoint(0x1F4C4)} **${i18next.t('command.file.list.mounts.name', { ns: 'ZosMessage' })}:** ${fileSystem.name}`,
                        `**${i18next.t('command.file.list.mounts.mountPoint', { ns: 'ZosMessage' })}:** ${fileSystem.mountpoint}`,
                        true));
                cardObject.body.push(super.createColumnSet(
                        `**${i18next.t('command.file.list.mounts.mode', { ns: 'ZosMessage' })}:** ${fileSystem.mode}`,
                        '',
                        false));

                // Create option array for detail dropdown.
                detailOptions.push({
                    'title': `${fileSystem.name}`,
                    'value': `@${this.botOption.chatTool.option.botUserName}:zos:file:list:mounts:mp=${fileSystem.mountpoint}`,
                });
            }

            // Add show details action
            const dropdownDataObj = {
                'pluginId': command.extraData.chatPlugin.package,
                'id': 'showMountsDetails',
                'title': i18next.t('command.file.list.mounts.buttonTitle', { ns: 'ZosMessage' }),
                'placeholder': i18next.t('command.file.list.mounts.detailDropDownPlaceholder', { ns: 'ZosMessage' }),
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

    // Get detail.
    getMountsDetail(fileSystems: Record<string, string| number>[], executor: IExecutor): IMessage[] {
        // Print start log
        logger.start(this.getDetail, this);

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

            // Add header message to messages.
            messages.push({
                type: IMessageType.PLAIN_TEXT,
                message: headerMessage,
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cardObject: Record<string, any> = super.createEmptyAdaptiveCard();

            // Add details Text Block
            cardObject.body.push({
                'type': 'TextBlock',
                'text': `**${i18next.t('command.file.list.mountsDetail.details', { ns: 'ZosMessage' })}** ${fileSystem.name}`,
                'wrap': true,
                'separator': false,
            });

            // Add column set
            cardObject.body.push(super.createColumnSet(
                    `**${i18next.t('command.file.list.mountsDetail.mountPoint',
                            { ns: 'ZosMessage' })}:** ${fileSystem.mountpoint}`,
                    `**${i18next.t('command.file.list.mountsDetail.mode', { ns: 'ZosMessage' })}:** ${fileSystem.mode}`,
                    true));
            cardObject.body.push(super.createColumnSet(
                    `**${i18next.t('command.file.list.mountsDetail.type', { ns: 'ZosMessage' })}:** ${fileSystem.fstname}`,
                    `**${i18next.t('command.file.list.mountsDetail.status', { ns: 'ZosMessage' })}**: ${fileSystem.status}`,
                    false));
            cardObject.body.push(super.createColumnSet(
                    `**${i18next.t('command.file.list.mountsDetail.blockSize', { ns: 'ZosMessage' })}:** ${fileSystem.bsize}`,
                    `**${i18next.t('command.file.list.mountsDetail.blockAvailable', { ns: 'ZosMessage' })}**: ${fileSystem.bavail}`,
                    false));
            cardObject.body.push(super.createColumnSet(
                    `**${i18next.t('command.file.list.mountsDetail.totalBlocks', { ns: 'ZosMessage' })}:** ${fileSystem.blocks}`,
                    `**${i18next.t('command.file.list.mountsDetail.systemName', { ns: 'ZosMessage' })}**: ${fileSystem.sysname}`,
                    false));
            cardObject.body.push(super.createColumnSet(
                    `**${i18next.t('command.file.list.mountsDetail.readibc', { ns: 'ZosMessage' })}:** ${fileSystem.readibc}`,
                    `**${i18next.t('command.file.list.mountsDetail.writeibc', { ns: 'ZosMessage' })}**: ${fileSystem.writeibc}`,
                    false));
            cardObject.body.push(super.createColumnSet(
                    `**${i18next.t('command.file.list.mountsDetail.diribc', { ns: 'ZosMessage' })}:** ${fileSystem.diribc}`,
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
                message: i18next.t('common.error.internal', { ns: 'ZosMessage' }),
            }];
        } finally {
            // Print end log
            logger.end(this.getDetail);
        }
    }
}

export = ZosFileMsteamsView;
