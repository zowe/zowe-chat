/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import { BotLimit } from '../../BotLimit';

export class SlackBotLimit extends BotLimit {
    // Constructor
    constructor() {
        super();

        // Set Slack limit
        this.limit = {
            // Unit for MaxLength: character
            // Unit for MaxNumber: item
            'messageMaxLength': 40000, // https://api.slack.com/changelog/2018-04-truncating-really-long-messages
            'blockIdMaxLength': 255,
            'actionBlockElementsMaxNumber': 25, // https://api.slack.com/reference/block-kit/blocks#actions_fields
            'contextBlockElementsMaxNumber': 10, // https://api.slack.com/reference/block-kit/blocks#context_fields
            'headerBlockTextMaxLength': 150, // https://api.slack.com/reference/block-kit/blocks#header_fields
            'imageBlockUrlMaxLength': 3000, // https://api.slack.com/reference/block-kit/blocks#image_fields
            'imageBlockAltTextMaxLength': 2000,
            'imageBlockTitleTextMaxLength': 2000,
            'inputBlockLabelTextMaxLength': 2000, // https://api.slack.com/reference/block-kit/blocks#input_fields
            'inputBlockHintTextMaxLength': 2000,
            'sectionBlockTextMaxLength': 3000, // https://api.slack.com/reference/block-kit/blocks#section_fields
            'sectionBlockFieldsMaxNumber': 10,
            'sectionBlockFieldsTextMaxLength': 2000,
            'videoBlockAuthorNameMaxLength': 50, // https://api.slack.com/reference/block-kit/blocks#video_fields
            'videoBlockTitleTextMaxLength': 200,
        };
    }
}
