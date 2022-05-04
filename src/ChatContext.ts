/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import type {IChatContextData, IMessage} from './types';

import logger = require('./utils/Logger');

class ChatContext {
    private contextData: IChatContextData;

    // Constructor
    constructor(contextData: IChatContextData) {
        this.contextData = contextData;

        this.send = this.send.bind(this);
    }

    // Get context data
    getContextData(): IChatContextData {
        return this.contextData;
    }

    // Set context data
    setContextData(contextData: IChatContextData): void {
        this.contextData = contextData;
    }

    // Send message to channel
    async send(messages: IMessage[]): Promise<void> {
        // Print start log
        logger.start(this.send, this);

        try {
            await(this.contextData.bot.getMiddleware().send(this.contextData, messages));
        } catch (err) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(err.name), err));
        } finally {
            // Print end log
            logger.end(this.send, this);
        }
    }
}

export = ChatContext;
