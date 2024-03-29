/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import { IActionType, IBotOption, IMattermostBotLimit } from '../types';
import { ChatView } from './ChatView';

export class ChatMattermostView extends ChatView {
  protected botLimit: IMattermostBotLimit;

  constructor(botOption: IBotOption, botLimit: IMattermostBotLimit) {
    super(botOption);
    this.botLimit = botLimit;
  }

  // Add message menu action to the payload of action array.
  addMenuAction(
    actionObj: Record<string, unknown>[],
    name: string,
    contextData: Record<string, unknown>,
    options: Record<string, unknown>[],
  ): void {
    // Only add action object when length of options is greater than 0, otherwise will failed to send view.
    if (options.length > 0) {
      actionObj.push({
        name: name,
        integration: {
          url: this.messagingEndpointUrl,
          context: {
            pluginId: contextData.pluginId,
            action: {
              id: contextData.id,
              type: IActionType.DROPDOWN_SELECT,
              token: contextData.token,
            },
          },
        },
        type: 'select',
        options: options,
      });
    }

    return;
  }

  // Add button action to the payload of action array.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addButtonAction(actions: Record<string, unknown>[], actionData: Record<string, any>): void {
    if (actionData.command.trim() !== '') {
      actions.push({
        name: actionData.placeHolder,
        type: 'button',
        integration: {
          url: this.messagingEndpointUrl,
          context: {
            pluginId: actionData.pluginId,
            action: {
              id: actionData.id,
              type: IActionType.BUTTON_CLICK,
              token: actionData.token,
            },
            command: actionData.command,
          },
        },
      });
    }

    return;
  }
}
