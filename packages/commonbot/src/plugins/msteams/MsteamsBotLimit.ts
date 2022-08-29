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

class MsteamsBotLimit extends BotLimit {
    // Constructor
    constructor() {
        super();

        // Set Microsoft Teams limit
        this.limit = {
            // Unit for MaxLength: byte
            // Unit for MaxNumber: item
            'messageMaxLength': 28 * 1024, // https://docs.microsoft.com/en-us/microsoftteams/limits-specifications-teams#chat
            'fileAttachmentMaxNumber': 10,
        };
    }
}

export = MsteamsBotLimit;
