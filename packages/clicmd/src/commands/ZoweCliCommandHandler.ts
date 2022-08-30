/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import childProcess from 'child_process';
import os from 'os';

import { ChatHandler, ICommand, IExecutor, Logger } from "@zowe/chat";
import { IBotLimit, IBotOption, IChatToolType, IMattermostBotLimit, IMessage, IMessageType, IMsteamsBotLimit, ISlackBotLimit } from '@zowe/commonbot';

import ZoweCliCommandMattermostView from './ZoweCliCommandMattermostView';
import ZoweCliCommandMsteamsView from './ZoweCliCommandMsteamsView';
import ZoweCliCommandSlackView from './ZoweCliCommandSlackView';

const logger = Logger.getInstance();

class ZoweCliCommandHandler extends ChatHandler {
    private view: ZoweCliCommandMattermostView | ZoweCliCommandSlackView | ZoweCliCommandMsteamsView = null;

    constructor(botOption: IBotOption, botLimit: IBotLimit) {
        super(botOption, botLimit);

        // Create view
        if (botOption.chatTool === IChatToolType.MATTERMOST) {
            this.view = new ZoweCliCommandMattermostView(botOption, <IMattermostBotLimit>botLimit);
        } else if (botOption.chatTool === IChatToolType.SLACK) {
            this.view = new ZoweCliCommandSlackView(botOption, <ISlackBotLimit>botLimit);
        } else if (botOption.chatTool === IChatToolType.MSTEAMS) {
            this.view = new ZoweCliCommandMsteamsView(botOption, <IMsteamsBotLimit>botLimit);
        }
    }

    // Execute Zowe CLI command
    public execute(command: ICommand, executor: IExecutor): IMessage[] {
        // Print start log
        logger.start(this.execute, this);

        let msgs: IMessage[] = [];
        try {
            // Execute Zowe CLI command
            let cmdOutput = '';
            try {
                // Get time limit value
                let cmdTimeout = 10000;// Unit: millisecond; Default: 10 seconds
                if (process.env.ZOWE_CLI_EXECUTION_TIME_OUT !== undefined && process.env.ZOWE_CLI_EXECUTION_TIME_OUT.trim() !== '') {
                    cmdTimeout = Number(process.env.ZOWE_CLI_EXECUTION_TIME_OUT);
                }

                // TODO: must run using executors' own profile
                logger.info(`Zowe CLI command to be executed: ${command.extraData.zoweCliCommand}`);
                cmdOutput = childProcess.execSync(command.extraData.zoweCliCommand, {cwd: os.homedir(), timeout: cmdTimeout, windowsHide: true}).toString();
            } catch (error) {
                logger.debug(`status: ${error.status}`);
                logger.debug(`message: ${error.message}`);
                if (error.code === 'ETIMEDOUT') { // Timeout
                    cmdOutput = `${error.code}: The execution of Zowe CLI command "${command}" timed out.`;
                } else {
                    cmdOutput = error.stderr;
                }
                logger.debug(`stdout: ${error.stdout}`);
            }

            // Get view
            msgs = this.view.getOutput(cmdOutput, executor);
        } catch (error) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(error.name), error));

            msgs = [{
                type: IMessageType.PLAIN_TEXT,
                message: 'Internal error',
            }];
        } finally {
            // Print end log
            logger.end(this.execute, this);
        }

        return msgs;
    }
}

export = ZoweCliCommandHandler;
