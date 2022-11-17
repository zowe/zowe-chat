/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import { logger, Util, ChatMattermostView, IBotOption, IMessageType, IExecutor, IMessage, IMattermostBotLimit } from '@zowe/chat';
import { IConsoleResponse } from '@zowe/zos-console-for-zowe-sdk';
import i18next from 'i18next';
class ZosCommandIssueMattermostView extends ChatMattermostView {
    constructor(botOption: IBotOption, botLimit: IMattermostBotLimit) {
        super(botOption, botLimit);
    }

    // Get command output view
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getOutput(issueResponse: IConsoleResponse, executor: IExecutor): IMessage[] {
        // Print start log
        logger.start(this.getOutput, this);
        let messages: IMessage[] = [];
        try {
            // Add command output
            let headerMessage = '';
            if ( issueResponse.commandResponse === null
                 || issueResponse.commandResponse === undefined
                 || issueResponse.commandResponse.trim() === '') {
                headerMessage = i18next.t('command.cmd.issue.console.cmdResponseNull', { executorName: executor.name, ns: 'ZosMessage' });
                messages = [{
                    type: IMessageType.PLAIN_TEXT,
                    message: headerMessage,
                }];
            } else {
                headerMessage = i18next.t('command.cmd.issue.console.cmdResponseOutput', { executorName: executor.name, ns: 'ZosMessage' });
                const fields = [];
                fields.push(
                        {
                            short: false,
                            value: '```\n' + issueResponse.commandResponse + '\n```',
                        },
                        {
                            short: false,
                            value: `**${i18next.t('command.cmd.issue.console.cmdResponseUrl', { executorName: executor.name, ns: 'ZosMessage' })}: ** [${issueResponse.lastResponseKey}](${issueResponse.cmdResponseUrl})`,
                        },
                );
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
            }
            return messages;
        } catch (error) {
            // ZWECC001E: Internal server error: {{error}}
            logger.error(Util.getErrorMessage('ZWECC001E', { error: 'Zos console issue handler exception', ns: 'ChatMessage' }));
            logger.error(logger.getErrorStack(new Error(error.name), error));

            return messages = [{
                type: IMessageType.PLAIN_TEXT,
                message: i18next.t('common.error.internal', { ns: 'ZosMessage' }),
            }];
        } finally {
            // Print end log
            logger.end(this.getOutput);
        }
    }
}

export = ZosCommandIssueMattermostView;
