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
import Config from '../common/Config';

class ChatMattermostView extends ChatView {
    constructor() {
        super();
    }

    // Get message attachments
    getMessageAttachments(pretext: string, fields: Record<string, any>[], actions: Record<string, any>): Record<string, unknown> {
        return { // eslint-disable-line @typescript-eslint/no-explicit-any
            props: {
                attachments: [
                    {
                        pretext: pretext,
                        fields: fields,
                        actions: actions,
                    },
                ],
            },
        };
    }


    // Add message menu action to the payload of actions array.
    addMessageMenuAction(pluginId: string, actionObj: Record<string, unknown>[], options: Record<string, unknown>[], name: string): void {
        const botOption = Config.getInstance().getBotOption();
        // Only add action object when length of options is greater than 0, otherwise will failed to send view.
        if (options.length > 0) {
            actionObj.push({
                'name': name,
                'integration': {
                    'url': `${botOption.messagingApp.option.protocol}://${botOption.messagingApp.option.hostName}:${botOption.messagingApp.option.port}${botOption.messagingApp.option.basePath}`,
                    'context': {
                        'pluginId': pluginId,
                        'action': {
                            'token': '',
                            'id': '',
                        },
                    },
                },
                'type': 'select',
                'options': options,
            });
        }

        return;
    }
}

export = ChatMattermostView;
