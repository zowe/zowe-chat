/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import { ChatDispatcher, ICommand, IExecutor, Logger } from '@zowe/chat';
import { IBotLimit, IBotOption, IMessage, IMessageType } from '@zowe/commonbot';
import ZosJobHandler from './job/list/ZosJobListHandler';
const i18nJsonData = require('../i18n/jobDisplay.json');

const logger = Logger.getInstance();

class ZosCommandDispatcher extends ChatDispatcher {
    constructor(botOption: IBotOption, botLimit: IBotLimit) {
        super(botOption, botLimit);
    }

    // Dispatch all zos commands.
    async dispatch(command: ICommand, executor: IExecutor): Promise<IMessage[]> {
        logger.start(this.dispatch, this);

        let messages: IMessage[] = [];
        try {
            if (command.resource === 'job') {
                // Default verb is list.
                if (command.verb === '' || command.verb === 'list') {
                    // Default object list
                    if (command.object === '' || command.object === 'status') {
                        const handler = new ZosJobHandler(this.botOption, this.botLimit);
                        messages = await handler.getJob(command, executor);
                    } else {
                        messages= [{
                            type: IMessageType.PLAIN_TEXT,
                            message: i18nJsonData.error.unknownObject,
                        }];
                    }
                } else {
                    messages = [{
                        type: IMessageType.PLAIN_TEXT,
                        message: i18nJsonData.error.unknownVerb,
                    }];
                }
            } else if (command.resource === 'dataset' || command.resource === 'ds') {
                //
            } else if (command.resource === 'file') {
                //
            } else {
                messages = [{
                    type: IMessageType.PLAIN_TEXT,
                    message: i18nJsonData.error.unknownResource,
                }];
            }

            return messages;
        } catch (error) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(error.name), error));
        } finally {
            logger.end(this.dispatch, this);
        }
    }
}

export = ZosCommandDispatcher;
