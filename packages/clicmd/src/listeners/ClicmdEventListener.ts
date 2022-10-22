/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import { ChatEventListener, IChatContextData, IMessage, logger, Util } from "@zowe/chat";

class ClicmdEventListener extends ChatEventListener {
    constructor() {
        super();

        this.matchEvent = this.matchEvent.bind(this);
        this.processEvent = this.processEvent.bind(this);
    }

    // Match inbound event
    matchEvent(chatContextData: IChatContextData): boolean { // eslint-disable-line @typescript-eslint/no-unused-vars
        // Print start log
        logger.start(this.matchEvent, this);

        // Match event
        try {
            // TODO:
            logger.debug(`Chat Plugin: ${JSON.stringify(chatContextData.extraData.chatPlugin, null, 4)}`);
            logger.info('Wrong event sent to Zowe CLI command plugin!');

            return false;
        } catch (error) {
            // ZWECC001E: Internal server error: {{error}}
            logger.error(Util.getErrorMessage('ZWECC001E', { error: 'Zowe CLI command event match exception', ns: 'ChatMessage' }));
            logger.error(logger.getErrorStack(new Error(error.name), error));
        } finally {
            // Print end log
            logger.end(this.matchEvent, this);
        }
    }

    // Process inbound event
    async processEvent(chatContextData: IChatContextData): Promise<IMessage[]> { // eslint-disable-line @typescript-eslint/no-unused-vars
        // Print start log
        logger.start(this.processEvent, this);

        // Process event
        const msgs: IMessage[] = [];
        try {
            // TODO:
            return msgs;
        } catch (error) {
            // ZWECC001E: Internal server error: {{error}}
            logger.error(Util.getErrorMessage('ZWECC001E', { error: 'Zowe CLI command event process exception', ns: 'ChatMessage' }));
            logger.error(logger.getErrorStack(new Error(error.name), error));
        } finally {
            // Print end log
            logger.end(this.processEvent, this);
        }
    }
}

export = ClicmdEventListener;
