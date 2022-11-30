/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import { logger, ChatMsteamsView, IBotOption, IExecutor, IMessage, IMessageType, IMsteamsBotLimit, Util } from '@zowe/chat';
import i18next from 'i18next';

class ZoweCliCommandMsteamsView extends ChatMsteamsView {
    constructor(botOption: IBotOption, botLimit: IMsteamsBotLimit) {
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
                type: IMessageType.PLAIN_TEXT,
                message: `${i18next.t('command.zowe.execution', { executorName: executor.name, ns: 'ClicmdMessage' })}\n\n`
                        + `<pre>${commandOutput}</pre>`,
            });
        } catch (error) {
            // ZWECC001E: Internal server error: {{error}}
            logger.error(Util.getErrorMessage('ZWECC001E', { error: 'Teams view create exception', ns: 'ChatMessage' }));
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

export = ZoweCliCommandMsteamsView;
