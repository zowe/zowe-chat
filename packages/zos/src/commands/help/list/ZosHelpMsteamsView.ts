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

import { logger, IMessage, IMessageType, IExecutor, ChatMsteamsView, IMsteamsBotLimit, IBotOption, ICommand } from '@zowe/chat';

class ZosHelpMsteamsView extends ChatMsteamsView {
  constructor(botOption: IBotOption, botLimit: IMsteamsBotLimit) {
    super(botOption, botLimit);
  }

  // Get overview view.
  getOverview(executor: IExecutor, command: ICommand): IMessage[] {
    // Print start log
    logger.start(this.getOverview, this);

    let messages: IMessage[] = [];
    try {
      // Add header message to messages.
      messages.push({
        type: IMessageType.PLAIN_TEXT,
        message: i18next.t('common.data.foundCommands', {
          executor: executor.name,
          documentUrl:
            `[${i18next.t('command.help.list.command.here', { ns: 'ZosMessage' })}]` +
            `(${super.getDocumentationBaseURL()}/zowe-chat-command-reference/zos/zos-article)`,
          ns: 'ZosMessage',
          interpolation: { escapeValue: false },
        }),
      });

      // Create adaptive card object.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cardObject: Record<string, any> = super.createEmptyAdaptiveCard();

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
          cardObject.body.push({
            type: 'TextBlock',
            text:
              `**[${key}](${super.getDocumentationBaseURL()}/zowe-chat-command-reference/zos/${key}/${key}-article)** ` +
              `${commandHelpObj[key].description}`,
            wrap: true,
          });

          // Create options for command detail dropdown.
          detailOptions.push({
            title: key,
            value: `@${this.botOption.chatTool.option.botUserName}:zos:help:list:command:${key}`,
          });
        }
      }

      // Add show command details action
      const dropdownDataObj = {
        pluginId: command.extraData.chatPlugin.package,
        id: 'showCommandDetails',
        title: i18next.t('command.help.list.command.detailButtonTitle', { ns: 'ZosMessage' }),
        placeholder: i18next.t('command.help.list.command.detailDropDownPlaceholder', { ns: 'ZosMessage' }),
        choices: detailOptions,
        separator: true,
        token: '',
      };

      super.addDropdownAction(cardObject.body, dropdownDataObj);

      messages.push({
        type: IMessageType.MSTEAMS_ADAPTIVE_CARD,
        message: cardObject,
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
        synopsis = synopsis + `- @${this.botOption.chatTool.option.botUserName} ${val} \r`;
      }

      // Get examples
      let examples = '';
      for (const key in commandHelpObj.example) {
        if (Object.prototype.hasOwnProperty.call(commandHelpObj.example, key)) {
          examples =
            examples +
            `- **@${this.botOption.chatTool.option.botUserName} ${key.replace(/\*/g, '\\*')}** ` +
            `${commandHelpObj.example[key]} \r`;
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cardObject: Record<string, any> = super.createEmptyAdaptiveCard();

      // Add TextBlocks
      cardObject.body.push(
        {
          type: 'TextBlock',
          text: `**${commandHelpObj.usage.description}**`,
          wrap: true,
        },
        {
          type: 'TextBlock',
          text: `**${i18next.t('command.help.list.detail.usage', { ns: 'ZosMessage' })}**`,
          wrap: true,
        },
        {
          type: 'TextBlock',
          text: synopsis,
          wrap: true,
        },
        {
          type: 'TextBlock',
          text: `**${i18next.t('command.help.list.detail.examples', { ns: 'ZosMessage' })}**`,
          wrap: true,
        },
        {
          type: 'TextBlock',
          text: examples,
          wrap: true,
        },
      );

      // Add header message to messages.
      messages.push({
        type: IMessageType.PLAIN_TEXT,
        message: i18next.t('common.data.foundCommandDetail', {
          executor: executor.name,
          documentUrl:
            `[${i18next.t('command.help.list.detail.here', { ns: 'ZosMessage' })}]` +
            `(${super.getDocumentationBaseURL()}/zowe-chat-command-reference/zos/${commandResource}/${commandResource}-article)`,
          ns: 'ZosMessage',
          interpolation: { escapeValue: false },
        }),
      });

      messages.push({
        type: IMessageType.MSTEAMS_ADAPTIVE_CARD,
        message: cardObject,
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

export = ZosHelpMsteamsView;
