/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import { IBotOption, IChatToolType } from '@zowe/commonbot';
import Logger from '@zowe/commonbot/dist/package/utils/Logger';

export class ChatView {
    protected readonly log: Logger;
    protected botOption: IBotOption = null;
    protected readonly botName: string;
    protected messagingEndpointUrl: string = '';

    constructor(botOption: IBotOption) {
        this.botOption = botOption;
        this.log = Logger.getInstance()
        switch (botOption.chatTool) {
            case IChatToolType.MATTERMOST:
                this.botName = botOption.mattermost.botUserName
                break;
            case IChatToolType.MSTEAMS:
                this.botName = botOption.msteams.botUserName
                break;
            case IChatToolType.SLACK:
                this.botName = botOption.slack.botUserName
                break;
        }
        // Set messaging endpoint
        if (botOption.messagingApp !== null && botOption.messagingApp !== undefined) {
            this.messagingEndpointUrl = `${this.botOption.messagingApp.option.protocol}://${this.botOption.messagingApp.option.hostName}`
                + `:${this.botOption.messagingApp.option.port}${this.botOption.messagingApp.option.basePath}`;
        }
    }
}