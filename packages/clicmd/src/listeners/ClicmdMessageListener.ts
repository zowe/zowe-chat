/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import { ChatMessageListener, IChatContextData, IExecutor, IMessage, IMessageType, Logger, ZosmfServerConfig } from "@zowe/chat";
import { ChatPrincipal } from "@zowe/chat/dist/security/user/ChatPrincipal";
import ZoweCliCommandHandler from '../commands/ZoweCliCommandHandler';

const logger = Logger.getInstance();

class ClicmdMessageListener extends ChatMessageListener {
    constructor() {
        super();

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
            if (command.scope === 'zowe') {
                chatContextData.extraData.command = command;
                return true;
            } else {
                // logger.info('Wrong command sent to Zowe CLI command plugin!');
                return false;
            }
        } catch (error) {
            // Print exception stack
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

        // Process message
        let msgs: IMessage[] = [];
        try {
            // Create executor
            const executor: IExecutor = {
                'id': chatContextData.context.chatting.user.id,
                'name': chatContextData.context.chatting.user.name,
                'team': chatContextData.context.chatting.team,
                'channel': chatContextData.context.chatting.channel,
                'email': chatContextData.context.chatting.user.email,
                'chattingType': chatContextData.context.chatting.type,
            };

            let principals = chatContextData.extraData.principal as ChatPrincipal;
            let zosmf: ZosmfServerConfig = <ZosmfServerConfig>chatContextData.extraData.zosmf;


            // Set Zowe CLI command
            const command = chatContextData.extraData.command;
            let zoweCliCmd = command.extraData.rawMessage;
            if (!zoweCliCmd.includes("--host") && !zoweCliCmd.includes("-H")) {
                zoweCliCmd += ` --host ${zosmf.host}`;
            }
            if (!zoweCliCmd.includes("--port") && !zoweCliCmd.includes("-P")) {
                zoweCliCmd += ` --port ${zosmf.port}`;
            }
            if (!zoweCliCmd.includes("--ru") && !zoweCliCmd.includes("--reject-unauthorized")) {
                zoweCliCmd += ` --ru ${zosmf.rejectUnauthorized}`;
            }
            if (!zoweCliCmd.includes("--protocol")) {
                zoweCliCmd += ` --protocol ${zosmf.protocol}`;
            }
            command.extraData.zoweCliCommand = zoweCliCmd.replace(`@${command.extraData.botUserName}`, '').trim() + ` --user ${principals.getUser().getMainframeUser()} --password ${principals.getCredentials().value}`;
            command.extraData.chatPlugin = chatContextData.extraData.chatPlugin;
            // Process command
            const handler = new ZoweCliCommandHandler(chatContextData.context.chatting.bot.getOption(), chatContextData.context.chatting.bot.getLimit());
            msgs = handler.execute(command, executor);
        } catch (error) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(error.name), error));

            msgs = [{
                type: IMessageType.PLAIN_TEXT,
                message: 'Internal error',
            }];
        } finally {
            // Print end log
            logger.end(this.processMessage, this);
        }

        return msgs;
    }
}

export = ClicmdMessageListener;
