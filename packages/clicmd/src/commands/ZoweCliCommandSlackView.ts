/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import { logger, ChatSlackView, IBotOption, IExecutor, IMessage, IMessageType, ISlackBotLimit, Util } from '@zowe/chat';
import i18next from 'i18next';

class ZoweCliCommandSlackView extends ChatSlackView {
  constructor(botOption: IBotOption, botLimit: ISlackBotLimit) {
    super(botOption, botLimit);
  }

  // Get command output view
  getOutput(commandOutput: string, executor: IExecutor): IMessage[] {
    // Print start log
    logger.start(this.getOutput, this);

    let messages: IMessage[] = [];
    try {
      // Truncate the command output if longer than the allowed maximum text length
      if (commandOutput.length > this.botLimit.sectionBlockTextMaxLength) {
        const truncationIndicator = `\n...\n${i18next.t('command.zowe.truncationIndicator', { ns: 'ClicmdMessage' })}`;
        commandOutput = commandOutput.substring(0, this.botLimit.sectionBlockTextMaxLength - truncationIndicator.length - 10); // Must count in ```
        commandOutput = commandOutput + truncationIndicator;
      }

      // Add command output
      messages.push({
        type: IMessageType.SLACK_BLOCK,
        message: {
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: i18next.t('command.zowe.execution', { executorName: executor.name, ns: 'ClicmdMessage' }),
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '```\n' + commandOutput + '\n```',
              },
            },
          ],
          channel: executor.channel.id,
        },

        // message: `@${executor.name}. I have executed the Zowe CLI command for you. Please see the below for the result!\n`
        //     + '```\n' + commandOutput + '\n```',
      });
    } catch (error) {
      // ZWECC001E: Internal server error: {{error}}
      logger.error(Util.getErrorMessage('ZWECC001E', { error: 'Slack view create exception', ns: 'ChatMessage' }));
      logger.error(logger.getErrorStack(new Error(error.name), error));

      messages = [
        {
          type: IMessageType.PLAIN_TEXT,
          message: 'Internal error',
        },
      ];
    } finally {
      // Print end log
      logger.end(this.getOutput);
    }

    return messages;
  }
}

export = ZoweCliCommandSlackView;
