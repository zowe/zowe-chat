/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import BotLimit from '../../BotLimit';

class MattermostBotLimit extends BotLimit {
    // Constructor
    constructor() {
        super();

        // Set Mattermost limit
        this.limit = {
            // Unit for MaxLength: character
            // Unit for MaxNumber: item
            'messageMaxLength': 16383, // Message supports at most 16383 (multi-byte) characters (65535 bytes)since v5.0.0
            //                            https://developers.mattermost.com/integrate/webhooks/incoming/#tips-and-best-practices
        };
    }
}

export = MattermostBotLimit;
