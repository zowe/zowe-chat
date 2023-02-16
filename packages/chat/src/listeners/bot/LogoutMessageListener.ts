/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import { IChatContextData, IMessage, IMessageType, IUser } from '@zowe/bot';
import { SecurityManager } from '../../security/SecurityManager';
import { logger } from '../../utils/Logger';
import { Util } from '../../utils/Util';
import { ChatMessageListener } from '../ChatMessageListener';

export class LogoutMessageListener extends ChatMessageListener {
    private readonly security: SecurityManager;

    constructor(securityManager: SecurityManager) {
        super();
        this.security = securityManager;
        this.matchMessage = this.matchMessage.bind(this);
        this.processMessage = this.processMessage.bind(this);
    }

    // Match inbound message
    matchMessage(chatContextData: IChatContextData): boolean {
        // Print start log
        logger.start(this.matchMessage, this);

        // Match message
        try {
            // Print incoming message
            logger.debug(`Chat Plugin: ${JSON.stringify(chatContextData.extraData.chatPlugin, null, 4)}`);
            logger.debug(`Incoming message: ${JSON.stringify(chatContextData.payload.data, null, 4)}`);

            // Parse message
            const command = super.parseMessage(chatContextData);

            // Match scope
            if (command.scope === 'logout') {
                chatContextData.extraData.command = command;
                return true;
            } else {
                // this.log.info('Wrong command sent to Zowe CLI command plugin!');
                return false;
            }
        } catch (error) {
            // ZWECC001E: Internal server error: {{error}}
            logger.error(Util.getErrorMessage('ZWECC001E', { error: 'Logout message match exception', ns: 'ChatMessage' }));
            logger.error(logger.getErrorStack(new Error(error.name), error));
        } finally {
            // Print end log
            logger.end(this.matchMessage, this);
        }
    }

    // Process inbound message
    async processMessage(chatContextData: IChatContextData): Promise<IMessage[]> {
        // Print start log
        logger.start(this.processMessage, this);
        const user: IUser = chatContextData.context.chatting.user;
        // Process message
        let msgs: IMessage[] = [];
        try {
            // Process command
            this.security.logoutUser(this.security.getChatUser(user));

            msgs.push({
                type: IMessageType.PLAIN_TEXT,
                message: `Successfully logged out user ${chatContextData.context.chatting.user.name}`,
            });
        } catch (error) {
            // ZWECC001E: Internal server error: {{error}}
            logger.error(Util.getErrorMessage('ZWECC001E', { error: 'Logout message process exception', ns: 'ChatMessage' }));
            logger.error(logger.getErrorStack(new Error(error.name), error));

            msgs = [{
                type: IMessageType.PLAIN_TEXT,
                message: 'There was an error trying to log out',
            }];
        } finally {
            // Print end log
            logger.end(this.processMessage, this);
        }

        return msgs;
    }
}
