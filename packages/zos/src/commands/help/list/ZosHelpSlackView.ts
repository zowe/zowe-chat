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

class ZosHelpSlackView extends ChatSlackView {
  constructor(botOption: IBotOption, botLimit: ISlackBotLimit) {
    super(botOption, botLimit);
  }

  // Get overview view.
  getOverview(executor: IExecutor, command: ICommand): IMessage[] {
    // Print start log
    logger.start(this.getOverview, this);

    let messages: IMessage[] = [];
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blockObject: Record<string, any> = {
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: i18next.t('common.data.foundCommands', {
                executor: executor.name,
                documentUrl:
                  `<${super.getDocumentationBaseURL()}/zowe-chat-command-reference/zos/zos|` +
                  `${i18next.t('command.help.list.command.here', { ns: 'ZosMessage' })}>`,
                ns: 'ZosMessage',
                interpolation: { escapeValue: false },
              }),
            },
          },
        ],
        channel: executor.channel.id,
      };

      // Get help info object for all commands
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const commandHelpObj: Record<string, any> = i18next.t('command.zos', { returnObjects: true, ns: 'ZosHelp' });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detailOptions = [];
      for (const key in commandHelpObj) {
        if (Object.prototype.hasOwnProperty.call(commandHelpObj, key)) {
          // Skip zos scop description
          if (key === 'description') {
            continue;
          }
          // Add each command resource and command description
          blockObject.blocks.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text:
                `*<${super.getDocumentationBaseURL()}/zowe-chat-command-reference/zos/${key}/${key}|${key}>*  ` +
                `${commandHelpObj[key].description} \n`,
            },
          });

          // Create options for command details select menu
          detailOptions.push(
            super.createSelectMenuOption(key, `@${this.botOption.chatTool.option.botUserName}:zos:help:list:command:${key}`),
          );
        }
      }

      // Create show detail action block object.
      const actionBlock = {
        type: 'actions',
        elements: <Record<string, unknown>[]>[],
      };
      const actionData = {
        pluginId: command.extraData.chatPlugin.package,
        actionId: 'showCommandDetails',
        token: '',
        placeHolder: i18next.t('command.help.list.command.detailDropDownPlaceholder', { ns: 'ZosMessage' }),
      };
      super.addSelectMenuAction(actionBlock, actionData, detailOptions);

      // Add action block object to message blocks.
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

      return (messages = [
        {
          type: IMessageType.PLAIN_TEXT,
          message: i18next.t('common.error.internal', { ns: 'ZosMessage' }),
        },
      ]);
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

      // Get specified command object
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const commandHelpObj: Record<string, any> = i18next.t(`command.zos.${commandResource.toLocaleLowerCase()}`, {
        returnObjects: true,
        ns: 'ZosHelp',
        nsSeparator: ': ',
      });

      // Get synopsis
      let synopsis = '';
      for (const val of commandHelpObj.usage.synopsis) {
        synopsis = synopsis + `@${this.botOption.chatTool.option.botUserName} ${val} \n`;
      }

      // Get examples
      let examples = '';
      for (const key in commandHelpObj.example) {
        if (Object.prototype.hasOwnProperty.call(commandHelpObj.example, key)) {
          examples =
            examples + '`' + `@${this.botOption.chatTool.option.botUserName} ${key}` + '` ' + `${commandHelpObj.example[key]} \n`;
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blockObject: Record<string, any> = {
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: i18next.t('common.data.foundCommandDetail', {
                executor: executor.name,
                documentUrl:
                  `<${super.getDocumentationBaseURL()}/zowe-chat-command-reference/zos/${commandResource}/${commandResource}|` +
                  `${i18next.t('command.help.list.detail.here', { ns: 'ZosMessage' })}>`,
                ns: 'ZosMessage',
                interpolation: { escapeValue: false },
              }),
            },
          },

          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${commandHelpObj.usage.description}*`,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${i18next.t('command.help.list.detail.usage', { ns: 'ZosMessage' })}*`,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: synopsis,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${i18next.t('command.help.list.detail.examples', { ns: 'ZosMessage' })}*`,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: examples,
            },
          },
        ],
        channel: executor.channel.id,
      };

      messages.push({
        type: IMessageType.SLACK_BLOCK,
        message: blockObject,
      });
      return messages;
    } catch (error) {
      logger.error(logger.getErrorStack(new Error(error.name), error));

      return (messages = [
        {
          type: IMessageType.PLAIN_TEXT,
          message: i18next.t('common.error.internal', { ns: 'ZosMessage' }),
        },
      ]);
    } finally {
      // Print end log
      logger.end(this.getDetail);
    }
  }
}

export = ZosHelpSlackView;
