/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import { IChatContextData, IMessage, IPayloadType } from "@zowe/commonbot";
import _ from 'lodash';
import yargs from 'yargs';
import { ICommand } from "../types";
import { Logger } from "../utils/Logger";
import ChatListener = require('./ChatListener');
export abstract class ChatMessageListener extends ChatListener {

    protected readonly log: Logger;

    constructor() {
        super();
        this.log = Logger.getInstance();
    }

    // Match inbound message
    abstract matchMessage(chatContextData: IChatContextData): boolean;

    // Process inbound message
    abstract processMessage(chatContextData: IChatContextData): Promise<IMessage[]>;

    // Parse inbound message
    public parseMessage(chatContextData: IChatContextData): ICommand {
        // Print start log
        this.log.start(this.parseMessage, this);

        // Print inbound message
        this.log.debug(`Message: ${chatContextData.payload.data}`);

        // Initialize command object
        const command: ICommand = {
            'scope': '',
            'resource': '',
            'verb': '',
            'object': '',
            'adjective': {
                'arguments': <string[]>[],
                'option': {},
            },
            'extraData': {},
        };

        try {
            // Parse inbound message
            let botUserName = '';
            if (chatContextData.payload.type === IPayloadType.MESSAGE) {
                // Parse
                // https://github.com/yargs/yargs/blob/HEAD/docs/api.md#help
                // https://github.com/yargs/yargs/blob/HEAD/docs/api.md#version
                // https://github.com/yargs/yargs/blob/main/docs/api.md#exitprocessenable
                const argument = (yargs.help(false).version(false).exitProcess(false)).parseSync(<string>chatContextData.payload.data);

                // Set command segments
                if (argument._.length === 1) {
                    botUserName = <string>argument._[0];
                } else if (argument._.length === 2) {
                    botUserName = <string>argument._[0];
                    command.scope = <string>argument._[1];
                } else if (argument._.length === 3) {
                    botUserName = <string>argument._[0];
                    command.scope = <string>argument._[1];
                    command.resource = <string>argument._[2];
                } else if (argument._.length === 4) {
                    botUserName = <string>argument._[0];
                    command.scope = <string>argument._[1];
                    command.resource = <string>argument._[2];
                    command.verb = <string>argument._[3];
                } else if (argument._.length === 5) {
                    botUserName = <string>argument._[0];
                    command.scope = <string>argument._[1];
                    command.resource = <string>argument._[2];
                    command.verb = <string>argument._[3];
                    command.object = <string>argument._[4];
                } else if (argument._.length > 5) {
                    botUserName = <string>argument._[0];
                    command.scope = <string>argument._[1];
                    command.resource = <string>argument._[2];
                    command.verb = <string>argument._[3];
                    command.object = <string>argument._[4];
                    command.adjective.arguments = <string[]>argument._.slice(5);
                }
                command.adjective.option = <Record<string, string>>_.cloneDeep(argument);
                command.adjective.option['_'] = undefined;
                command.adjective.option['$0'] = undefined;
            }

            // Set extra data
            command.extraData.botUserName = botUserName.substring(1);
            command.extraData.rawMessage = chatContextData.payload.data;

            // Print command
            this.log.debug(`Command: ${JSON.stringify(command, null, 4)}`);
        } catch (error) {
            // Print exception stack
            this.log.error(this.log.getErrorStack(new Error(error.name), error));
            this.log.error(error);
        } finally {
            // Print end log
            this.log.end(this.parseMessage, this);
        }

        return command;
    }
}
