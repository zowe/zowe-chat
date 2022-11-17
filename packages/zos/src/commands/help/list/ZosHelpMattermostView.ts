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

import { logger, IMessage, IMessageType, IExecutor, ChatMattermostView, IMattermostBotLimit, IBotOption, ICommand } from '@zowe/chat';

class ZosHelpMattermostView extends ChatMattermostView {
    constructor(botOption: IBotOption, botLimit: IMattermostBotLimit) {
        super(botOption, botLimit);
    }

    // Get overview view.
    getOverview(executor: IExecutor, command: ICommand): IMessage[] {
        // Print start log
        logger.start(this.getOverview, this);

        let messages: IMessage[] = [];
        try {
            // Get help info object for all commands
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const commandHelpObj: Record<string, any> = i18next.t('command.zos', { returnObjects: true, ns: 'ZosHelp' });

            let helpInfoText = '';
            const detailOptions = [];
            for (const key in commandHelpObj) {
                if (Object.prototype.hasOwnProperty.call(commandHelpObj, key)) {
                    // Skip zos scop description
                    if (key === 'description') {
                        continue;
                    }

                    // Add each command resource and command description
                    helpInfoText = helpInfoText + `**[${key}](${super.getDocumentationBaseURL()}/`
                            + `zowe-chat-command-reference/zos/${key}/${key})**  `
                            + `${commandHelpObj[key].description} \n`;

                    // Create options for command details select menu
                    detailOptions.push({
                        'text': key,
                        'value': `@${this.botOption.chatTool.option.botUserName}:zos:help:list:command:${key}`,
                    });
                }
            }

            // Add show command detail actions
            const actions = <Record<string, unknown>[]>[];
            const actionData = {
                'pluginId': command.extraData.chatPlugin.package,
                'token': '',
                'id': '',
            };
            super.addMenuAction(actions, i18next.t('command.help.list.command.detailDropDownPlaceholder', { ns: 'ZosMessage' }), actionData, detailOptions);

            // Create message attachments
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const attachmentObject: Record<string, any> = {
                props: {
                    attachments: [
                        {
                            pretext: i18next.t('common.data.foundCommands', {
                                executor: executor.name,
                                documentUrl: `[${i18next.t('command.help.list.command.here', { ns: 'ZosMessage' })}]`
                                        + `(${super.getDocumentationBaseURL()}/zowe-chat-command-reference/zos/zos)`,
                                ns: 'ZosMessage',
                                interpolation: { escapeValue: false } }),
                            fields: [
                                {
                                    'short': false,
                                    'value': helpInfoText,
                                },
                            ],
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
    getDetail(executor: IExecutor, command: ICommand): IMessage[] {
        // Print start log
        logger.start(this.getDetail, this);

        let messages: IMessage[] = [];
        try {
            const commandResource = command.adjective.arguments[0];

            // Get the specified command help info object
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const commandHelpObj: Record<string, any> = i18next.t(`command.zos.${commandResource.toLocaleLowerCase()}`,
                    { returnObjects: true, ns: 'ZosHelp', nsSeparator: ': ' });

            // Get synopsis
            let synopsis = '';
            for (const val of commandHelpObj.usage.synopsis) {
                synopsis = synopsis + `@${this.botOption.chatTool.option.botUserName} ${val.replace(/\*/g, '\\*')} \n`;
            }

            // Get examples
            let examples = '';
            for (const key in commandHelpObj.example) {
                if (Object.prototype.hasOwnProperty.call(commandHelpObj.example, key)) {
                    examples = examples + '`' + `@${this.botOption.chatTool.option.botUserName} ${key}`
                            + '` ' + `${commandHelpObj.example[key]} \n`;
                }
            }

            // Create message attachments
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const attachmentObject: Record<string, any> = {
                props: {
                    attachments: [
                        {
                            pretext: i18next.t('common.data.foundCommandDetail', {
                                executor: executor.name,
                                documentUrl: `[${i18next.t('command.help.list.command.here', { ns: 'ZosMessage' })}]`
                                    + `(${super.getDocumentationBaseURL()}/zowe-chat-command-reference/`
                                    + `${command.scope}/${commandResource}/${commandResource})`,
                                ns: 'ZosMessage',
                                interpolation: { escapeValue: false } }),
                            fields: [
                                {
                                    'short': false,
                                    'value': `**${commandHelpObj.usage.description}**`,
                                },
                                {
                                    'short': false,
                                    'value': `**${i18next.t('command.help.list.detail.usage', { ns: 'ZosMessage' })}**`,
                                },
                                {
                                    'short': false,
                                    'value': synopsis,
                                },
                                {
                                    'short': false,
                                    'value': `**${i18next.t('command.help.list.detail.examples', { ns: 'ZosMessage' })}**`,
                                },
                                {
                                    'short': false,
                                    'value': examples,
                                },
                            ],
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
}

export = ZosHelpMattermostView;
