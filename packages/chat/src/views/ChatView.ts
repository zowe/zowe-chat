/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import { IBotOption } from '../types';

export class ChatView {
    protected botOption: IBotOption = null;
    protected messagingEndpointUrl: string = '';

    constructor(botOption: IBotOption) {
        this.botOption = botOption;

        // Set messaging endpoint
        if (botOption.messagingApp !== null && botOption.messagingApp !== undefined) {
            this.messagingEndpointUrl = `${this.botOption.messagingApp.option.protocol}://${this.botOption.messagingApp.option.hostName}`
                + `:${this.botOption.messagingApp.option.port}${this.botOption.messagingApp.option.basePath}`;
        }
    }

    // Get Zowe Chat Documentation Base URL
    getDocumentationBaseURL(): string {
        return 'https://docs.zowe.org/stable/appendix';
    }
}
