/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import { IActionType, IBotOption, IMsteamsBotLimit } from '../types';
import { ChatView } from './ChatView';

export class ChatMsteamsView extends ChatView {
  protected botLimit: IMsteamsBotLimit;
  constructor(botOption: IBotOption, botLimit: IMsteamsBotLimit) {
    super(botOption);

    this.botLimit = botLimit;
  }

  // Create column set object for text block only
  createColumnSet(column1Text: string, column2Text: string, separator = true): Record<string, unknown> {
    return {
      type: 'ColumnSet',
      columns: [
        {
          type: 'Column',
          width: 'stretch',
          items: [
            {
              type: 'TextBlock',
              text: column1Text,
              wrap: true,
            },
          ],
        },
        {
          type: 'Column',
          width: 'stretch',
          items: [
            {
              type: 'TextBlock',
              text: column2Text,
              wrap: true,
            },
          ],
        },
      ],
      separator: separator,
    };
  }

  // Add column set for dropdown action
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addDropdownAction(adaptiveCardBody: Record<string, unknown>[], actionData: Record<string, any>): void {
    // Only add action object when length of choices is greater than 0, otherwise will failed to send view.
    if (actionData.choices.length > 0) {
      adaptiveCardBody.push({
        type: 'ColumnSet',
        columns: [
          {
            type: 'Column',
            width: 'stretch',
            items: [
              {
                type: 'Input.ChoiceSet',
                id: actionData.id,
                placeholder: actionData.placeholder,
                choices: actionData.choices,
                separator: actionData.separator,
                style: 'compact',
                isMultiSelect: 'false',
              },
            ],
          },
          {
            type: 'Column',
            width: '160px',
            items: [
              {
                type: 'ActionSet',
                actions: [
                  {
                    type: 'Action.Submit',
                    title: actionData.title,
                    data: {
                      pluginId: actionData.pluginId,
                      action: {
                        id: actionData.id,
                        type: IActionType.DROPDOWN_SELECT,
                        token: actionData.token,
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
        separator: actionData.separator,
      });
    }

    return;
  }

  // Add action set for button action
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addButtonAction(adaptiveCardBody: Record<string, unknown>[], actionData: Record<string, any>): Record<string, unknown> {
    if (actionData.command.trim() !== '') {
      // Create action
      const action = {
        type: 'Action.Submit',
        title: actionData.title,
        data: {
          pluginId: actionData.pluginId,
          action: {
            id: actionData.id,
            token: actionData.token,
            type: IActionType.BUTTON_CLICK,
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (<any>action.data)[actionData.id] = actionData.command;

      // Add action
      adaptiveCardBody.push({
        type: 'ActionSet',
        actions: [action],
        separator: actionData.separator,
      });
    }

    return;
  }

  // Get empty adaptive card
  createEmptyAdaptiveCard(): Record<string, unknown> {
    return {
      type: 'AdaptiveCard',
      fallbackText: '',
      msteams: {
        width: 'Full',
      },
      body: [],
      actions: [],
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.4',
    };
  }
}
