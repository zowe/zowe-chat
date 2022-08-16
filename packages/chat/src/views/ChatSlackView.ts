/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import ChatView = require('./ChatView');

class ChatSlackView extends ChatView {
    constructor() {
        super();
    }

    // Get select menu option object
    getSelectMenuOptionObject(displayText: string, value: string): Record<string, unknown> {
        return {
            'text': {
                'type': 'plain_text',
                'text': displayText,
            },
            'value': value,
        };
    }

    // Add select menu to the elements of action block
    addSelectMenuActionElements(pluginId: string, actionBlock: Record<string, any>, selectMenuOptions: Record<string, unknown>[], placeHolder: string): void {
        // Only add action object when length of choices is greater than 0, otherwise will failed to send view.
        if (selectMenuOptions.length > 0) {
            actionBlock.elements.push({
                'type': 'static_select',
                'action_id': `${pluginId}:dropdown.select:${placeHolder}`,
                'placeholder': {
                    'type': 'plain_text',
                    'text': placeHolder,
                },
                'options': selectMenuOptions,
            });
        }
    }

    // Get message attachments
    getMessageAttachmentsObject(text: string, channelId: string): Record<string, unknown> {
        return {
            'text': text,
            'attachments': [
                {
                    'color': '#f2c744',
                    'blocks': [
                    ],
                },
            ],
            'channel': channelId,
        };
    }
}

export = ChatSlackView;
