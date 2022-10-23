/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import i18next from 'i18next';

import { logger, IMessage, IMessageType, IChatToolType, IExecutor, ChatHandler, IBotOption, IBotLimit, ICommand, ISlackBotLimit,
    IMsteamsBotLimit, IMattermostBotLimit } from '@zowe/chat';

import ZosHelpSlackView from './ZosHelpSlackView';
import ZosHelpMattermostView from './ZosHelpMattermostView';
import ZosHelpMsteamsView from './ZosHelpMsteamsView';

class ZosHelpListHandler extends ChatHandler {
    private view: ZosHelpSlackView | ZosHelpMattermostView | ZosHelpMsteamsView = null;

    constructor(botOption: IBotOption, botLimit: IBotLimit) {
        super(botOption, botLimit);

        if (botOption.chatTool.type === IChatToolType.SLACK) {
            this.view = new ZosHelpSlackView(botOption, <ISlackBotLimit> botLimit);
        } else if (botOption.chatTool.type === IChatToolType.MATTERMOST) {
            this.view = new ZosHelpMattermostView(botOption, <IMattermostBotLimit> botLimit);
        } else if (botOption.chatTool.type === IChatToolType.MSTEAMS) {
            this.view = new ZosHelpMsteamsView(botOption, <IMsteamsBotLimit> botLimit);
        }
    }

    // Get command view for command 'zos help list command'
    getCommand(command: ICommand, executor: IExecutor): IMessage[] {
        // Print start log
        logger.start(this.getCommand, this);

        let messages: IMessage[] = [];
        try {
            // Get positional argument - command resource
            const positionalArgument = command.adjective.arguments;
            let resource: string = null;
            if (positionalArgument.length > 0) {
                resource = positionalArgument[0];
            }
            logger.debug(`id: ${resource}`);


            if (resource !== null) { // If command resource is specified in positional argument and is a valid command resource, show detail view.
                const commands = ['job', 'dataset', 'file', 'help'];

                if (!commands.includes(resource.toLocaleLowerCase())) {
                    const headerMessage = i18next.t('common.error.unknown.resource', { ns: 'ZosMessage' });
                    return messages = [{
                        type: IMessageType.PLAIN_TEXT,
                        message: headerMessage,
                    }];
                } else {
                    messages = this.view.getDetail(executor, command);
                }
            } else {
                messages = this.view.getOverview(executor, command);
            }
            return messages;
        } catch (error) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(error.name), error));

            return messages = [{
                type: IMessageType.PLAIN_TEXT,
                message: i18next.t('common.error.internal', { ns: 'ZosMessage' }),
            }];
        } finally {
            // Print end log
            logger.end(this.getCommand, this);
        }
    }
}

export = ZosHelpListHandler;
