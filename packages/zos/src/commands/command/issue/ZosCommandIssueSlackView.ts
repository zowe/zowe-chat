/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import { logger, Util, ChatSlackView, IBotOption, IExecutor, IMessage, IMessageType, ISlackBotLimit } from '@zowe/chat';
import { IConsoleResponse } from '@zowe/zos-console-for-zowe-sdk';
import i18next from 'i18next';
class ZosCommandIssueSlackView extends ChatSlackView {
    constructor(botOption: IBotOption, botLimit: ISlackBotLimit) {
        super(botOption, botLimit);
    }

    // Get command output view
    getOutput(issueResponse: IConsoleResponse, executor: IExecutor): IMessage[] {
        // Print start log
        logger.start(this.getOutput, this);
        let commandOutput = issueResponse.commandResponse;
        let messages: IMessage[] = [];
        try {
            if (commandOutput === null
                || commandOutput === undefined
                || commandOutput.trim() == '') {
                messages = [{
                    type: IMessageType.PLAIN_TEXT,
                    message: {
                        'blocks': [{
                            'type': 'section',
                            'text': {
                                'type': 'mrkdwn',
                                'text': i18next.t('command.cmd.issue.console.cmdResponseNull', { executorName: executor.name, ns: 'ZosMessage' }),
                            },
                        }],
                    },
                }];
            } else {
                // Truncate the command output if longer than the allowed maximum text length
                if (commandOutput.length > this.botLimit.sectionBlockTextMaxLength) {
                    const truncationIndicator = `\n...\n${i18next.t('zowe.truncationIndicator', { ns: 'ZosMessage' })}`;
                    commandOutput = commandOutput.substring(0, this.botLimit.sectionBlockTextMaxLength - truncationIndicator.length - 10); // Must count in ```
                    commandOutput = commandOutput + truncationIndicator;
                }

                // Add command output
                messages = [{
                    type: IMessageType.SLACK_BLOCK,
                    message: {
                        'blocks': [{
                            'type': 'section',
                            'text': {
                                'type': 'mrkdwn',
                                'text': i18next.t('command.cmd.issue.console.cmdResponseOutput', { executorName: executor.name, ns: 'ZosMessage' }),
                            },
                        },
                        {
                            'type': 'section',
                            'text': {
                                'type': 'mrkdwn',
                                'text': '```\n' + commandOutput + '\n```',
                            },
                        },
                        {
                            'type': 'section',
                            'text':
                            {
                                'type': 'mrkdwn',
                                'text': `*${i18next.t('command.cmd.issue.console.cmdResponseUrl', { executorName: executor.name, ns: 'ZosMessage' })}:* <${issueResponse.cmdResponseUrl}|${issueResponse.lastResponseKey}>`,
                            },

                        }],
                        'channel': executor.channel.id,
                    },
                    // message: `@${executor.name}. I have executed the Zowe CLI command for you. Please see the below for the result!\n`
                    //     + '```\n' + commandOutput + '\n```',
                }];
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
export = ZosCommandIssueSlackView;
