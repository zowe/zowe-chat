/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import { logger, Util } from '@zowe/chat';
import { ChatDispatcher, IBotLimit, IBotOption, ICommand, IExecutor, IMessage, IMessageType } from '@zowe/chat';
import ZosJobHandler from './job/list/ZosJobListHandler';
import ZosDatasetListHandler from './dataset/list/ZosDatasetListHandler';
import ZosFileListHandler from './file/list/ZosFileListHandler';
import ZosHelpListHandler from './help/list/ZosHelpListHandler';
import ZosCommandIssueConsoleHandler from './command/issue/ZosCommandIssueConsoleHandler';
import i18next from 'i18next';

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
                // Default verb is "list".
                if (command.verb === '' || command.verb === 'list') {
                    // Default object is "status".
                    if (command.object === '' || command.object === 'status') {
                        const handler = new ZosJobHandler(this.botOption, this.botLimit);
                        messages = await handler.getJob(command, executor);
                    } else {
                        messages = [{
                            type: IMessageType.PLAIN_TEXT,
                            message: i18next.t('common.error.unknown.object', { object: command.object, ns: 'ZosMessage' }),
                        }];
                    }
                } else {
                    messages = [{
                        type: IMessageType.PLAIN_TEXT,
                        message: i18next.t('common.error.unknown.verb', { verb: command.verb, ns: 'ZosMessage' }),
                    }];
                }
            } else if (command.resource === 'dataset') {
                // Default verb is "list".
                if (command.verb === '' || command.verb === 'list') {
                    // Default object is "status"
                    if (command.object === '' || command.object === 'status') {
                        const handler = new ZosDatasetListHandler(this.botOption, this.botLimit);
                        messages = await handler.getDataset(command, executor);
                    } else if (command.object === 'member') {
                        const handler = new ZosDatasetListHandler(this.botOption, this.botLimit);
                        messages = await handler.getDatasetMember(command, executor);
                    } else {
                        messages= [{
                            type: IMessageType.PLAIN_TEXT,
                            message: i18next.t('common.error.unknown.object', { object: command.object, ns: 'ZosMessage' }),
                        }];
                    }
                } else {
                    messages = [{
                        type: IMessageType.PLAIN_TEXT,
                        message: i18next.t('common.error.unknown.verb', { verb: command.verb, ns: 'ZosMessage' }),
                    }];
                }
            } else if (command.resource === 'file') {
                // Default verb is "list".
                if (command.verb === '' || command.verb === 'list') {
                    // Default object is "status"
                    if (command.object === '' || command.object === 'status') {
                        const handler = new ZosFileListHandler(this.botOption, this.botLimit);
                        messages = await handler.getFile(command, executor);
                    } else if (command.object === 'mounts') {
                        const handler = new ZosFileListHandler(this.botOption, this.botLimit);
                        messages = await handler.getMounts(command, executor);
                    } else {
                        messages= [{
                            type: IMessageType.PLAIN_TEXT,
                            message: i18next.t('common.error.unknown.object', { object: command.object, ns: 'ZosMessage' }),
                        }];
                    }
                } else {
                    messages = [{
                        type: IMessageType.PLAIN_TEXT,
                        message: i18next.t('common.error.unknown.verb', { verb: command.verb, ns: 'ZosMessage' }),
                    }];
                }
            } else if (command.resource === 'command') {
                //Issue command
                if (command.verb === 'issue') {
                    // Issue console command dy default.
                    if (command.object === 'console') {
                        const handler = new ZosCommandIssueConsoleHandler(this.botOption, this.botLimit);
                        messages = await handler.issueConsoleCommand(command, executor);
                    } else {
                        messages= [{
                            type: IMessageType.PLAIN_TEXT,
                            message: i18next.t('common.error.unknown.object', { object: command.object, ns: 'ZosMessage' }),
                        }];
                    }
                } else {
                    messages = [{
                        type: IMessageType.PLAIN_TEXT,
                        message: i18next.t('common.error.unknown.verb', { verb: command.verb, ns: 'ZosMessage' })
                    }];
                }
            } else if (command.resource === 'help') {
                // Default verb is "list".
                if (command.verb === '' || command.verb === 'list') {
                    // Default object is "command"
                    if (command.object === '' || command.object === 'command') {
                        const handler = new ZosHelpListHandler(this.botOption, this.botLimit);
                        messages = await handler.getCommand(command, executor);
                    } else {
                        messages= [{
                            type: IMessageType.PLAIN_TEXT,
                            message: i18next.t('common.error.unknown.object', { object: command.object, ns: 'ZosMessage' }),
                        }];
                    }
                } else {
                    messages = [{
                        type: IMessageType.PLAIN_TEXT,
                        message: i18next.t('common.error.unknown.verb', { verb: command.verb, ns: 'ZosMessage' }),
                    }];
                }
            } else {
                messages = [{
                    type: IMessageType.PLAIN_TEXT,
                    message: i18next.t('common.error.unknown.resource', { resource: command.resource, ns: 'ZosMessage' }),
                }];
            }

            return messages;
        } catch (error) {
            // ZWECC001E: Internal server error: {{error}}
            logger.error(Util.getErrorMessage('ZWECC001E', { error: 'zos scope command dispatch exception', ns: 'ChatMessage' }));
            logger.error(logger.getErrorStack(new Error(error.name), error));
        } finally {
            logger.end(this.dispatch, this);
        }
    }
}

export = ZosCommandDispatcher;
