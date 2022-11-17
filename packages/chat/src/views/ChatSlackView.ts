/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import {IBotOption, ISlackBotLimit} from '../types';
import {ChatView} from './ChatView';

export class ChatSlackView extends ChatView {
    protected botLimit: ISlackBotLimit;

    constructor(botOption: IBotOption, botLimit: ISlackBotLimit) {
        super(botOption);

        this.botLimit = botLimit;
    }

    // Create select menu option
    createSelectMenuOption(text: string, value: string): Record<string, unknown> {
        return {
            text: {
                type: 'plain_text',
                text: text,
            },
            value: value,
        };
    }

    // Add select menu to the elements of action block
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    addSelectMenuAction(actionBlock: Record<string, any>, actionData: Record<string, any>, selectMenuOption: Record<string, unknown>[]): void {
        // Only add action object when length of choices is greater than 0, otherwise will failed to send view.
        if (selectMenuOption.length > 0) {
            actionBlock.elements.push({
                type: 'static_select',
                action_id: `${actionData.pluginId}:${actionData.actionId}:${actionData.token}:user_data`,
                placeholder: {
                    type: 'plain_text',
                    text: actionData.placeHolder,
                },
                options: selectMenuOption,
            });
        }
    }

    // Add button to the elements of action block
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    addButtonAction(actionBlock: Record<string, any>, actionData: Record<string, any>, value: string): void {
        if (value.trim() !== '') {
            actionBlock.elements.push({
                type: 'button',
                action_id: `${actionData.pluginId}:${actionData.actionId}:${actionData.token}:user_data`,
                text: {
                    type: 'plain_text',
                    text: actionData.placeHolder,
                },
                value: value,
            });
        }
    }
}
