/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import { ChatMattermostView, IBotOption, IExecutor, IMattermostBotLimit, IMessage, IMessageType, logger, Util } from '@zowe/chat';
import i18next from 'i18next';

class ZoweCliCommandMattermostView extends ChatMattermostView {
    constructor(botOption: IBotOption, botLimit: IMattermostBotLimit) {
        super(botOption, botLimit);
    }

    // Get command output view
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getOutput(commandOutput: string, executor: IExecutor): IMessage[] {
        // Print start log
        logger.start(this.getOutput, this);

        let messages: IMessage[] = [];

        try {
            // Add command output
            messages.push({
                type: IMessageType.MATTERMOST_ATTACHMENT,
                message: {
                    props: {
                        attachments: [
                            {
                                pretext: i18next.t('command.zowe.execution', { executorName: executor.name, ns: 'ClicmdMessage' }),
                                fields: [{
                                    short: false,
                                    value: '```\n' + commandOutput + '\n```',
                                }],
                                actions: [],
                            },
                        ],
                    },
                },
            });
        } catch (error) {
            // ZWECC001E: Internal server error: {{error}}
            logger.error(Util.getErrorMessage('ZWECC001E', { error: 'Mattermost view create exception', ns: 'ChatMessage' }));
            logger.error(logger.getErrorStack(new Error(error.name), error));

            messages = [{
                type: IMessageType.PLAIN_TEXT,
                message: 'Internal error',
            }];
        } finally {
            // Print end log
            logger.end(this.getOutput);
        }

        return messages;
    }
}

export = ZoweCliCommandMattermostView;
