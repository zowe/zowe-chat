/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import {IActionType} from '@zowe/commonbot';
import ChatView = require('./ChatView');

class ChatMsteamsView extends ChatView {
    constructor() {
        super();
    }


    // Get column set object for text block only
    getColumnSet(column1Str: string, column2Str: string, separator: boolean = true): Record<string, unknown> {
        return {
            'type': 'ColumnSet',
            'columns': [
                {
                    'type': 'Column',
                    'width': 'stretch',
                    'items': [
                        {
                            'type': 'TextBlock',
                            'text': column1Str,
                            'wrap': true,
                        },
                    ],
                },
                {
                    'type': 'Column',
                    'width': 'stretch',
                    'items': [
                        {
                            'type': 'TextBlock',
                            'text': column2Str,
                            'wrap': true,
                        },
                    ],
                },
            ],
            'separator': separator,
        };
    }

    // Add column set for dropdown action
    addDropdownActionObject(cardBody: Record<string, unknown>[], actionDataObj: Record<string, any>): void {
        // Only add action object when length of choices is greater than 0, otherwise will failed to send view.
        if (actionDataObj.choices.length > 0) {
            cardBody.push({
                'type': 'ColumnSet',
                'columns': [
                    {
                        'type': 'Column',
                        'width': 'stretch',
                        'items': [
                            {
                                'type': 'Input.ChoiceSet',
                                'id': actionDataObj.id,
                                'placeholder': actionDataObj.placeholder,
                                'choices': actionDataObj.choices,
                                'separator': actionDataObj.separator,
                                'style': 'compact',
                                'isMultiSelect': 'false',
                            },
                        ],
                    },
                    {
                        'type': 'Column',
                        'width': '160px',
                        'items': [
                            {
                                'type': 'ActionSet',
                                'actions': [
                                    {
                                        'type': 'Action.Submit',
                                        'title': actionDataObj.title,
                                        'data': {
                                            'controlId': actionDataObj.id,
                                            'token': '',
                                            'pluginId': actionDataObj.pluginId,
                                            'action': {
                                                'id': actionDataObj.id,
                                                'type': IActionType.DROPDOWN_SELECT,
                                            },
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                ],
                'separator': actionDataObj.separator,
            });
        }

        return;
    }

    // Get adaptive card object
    getAdaptiveCardObject(): Record<string, unknown> {
        return {
            'type': 'AdaptiveCard',
            'fallbackText': '',
            'msteams': {
                'width': 'Full',
            },
            'body': [],
            'actions': [],
            '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json',
            'version': '1.4',
        };
    }
}

export = ChatMsteamsView;
