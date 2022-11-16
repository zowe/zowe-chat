/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import { IIssueParms, IssueCommand, IConsoleResponse } from '@zowe/zos-console-for-zowe-sdk';
import i18next from 'i18next';
import { ISession, Session, SessConstants } from '@zowe/imperative';
import { logger, IMessage, IMessageType, IChatToolType,
    IExecutor, config, ChatHandler, IBotOption, IBotLimit,
    ICommand, Util, IMsteamsBotLimit, ChatPrincipal,
    IMattermostBotLimit, ISlackBotLimit } from '@zowe/chat';
import ZosCommandIssueMattermostView from './ZosCommandIssueMattermostView';
import ZosCommandIssueMsteamsView from './ZosCommandIssueMsteamsView';
import ZosCommandIssueSlackView from './ZosCommandIssueSlackView';

class ZosCommandIssueHandler extends ChatHandler {
    private view: ZosCommandIssueMattermostView |
                ZosCommandIssueMsteamsView |
                ZosCommandIssueSlackView = null;

    constructor(botOption: IBotOption, botLimit: IBotLimit) {
        super(botOption, botLimit);

        // Create view
        if (botOption.chatTool.type === IChatToolType.MATTERMOST) {
            this.view = new ZosCommandIssueMattermostView(botOption, <IMattermostBotLimit>botLimit);
        } else if (botOption.chatTool.type === IChatToolType.MSTEAMS) {
            this.view = new ZosCommandIssueMsteamsView(botOption, <IMsteamsBotLimit>botLimit);
        } else if (botOption.chatTool.type === IChatToolType.SLACK) {
            this.view = new ZosCommandIssueSlackView(botOption, <ISlackBotLimit>botLimit);
        }
    }

    // Execute console command
    public async issueConsoleCommand(command: ICommand, executor: IExecutor): Promise<IMessage[]> {
        // Print start log
        logger.start(this.issueConsoleCommand, this);
        let messages: IMessage[] = [];
        try {
            const auth: ChatPrincipal = <ChatPrincipal>command.extraData.principal;
            const zosmfConfig = config.getZosmfServerConfig();
            const options = command.adjective.option;

            // Match the optional option - console name
            let consoleName: string = null;
            if (options['console-name'] !== undefined) {
                consoleName = options['console-name'];
            } else if (options['cn'] !== undefined) {
                consoleName = options['cn'];
            }
            logger.debug(`Console Name: ${consoleName}`);

            // Match the optional option -- sysplex system
            let systemName: string = null;
            if (options['system-name'] !== undefined) {
                systemName = options['system-name'];
            } else if (options['sn'] !== undefined) {
                systemName = options['sn'];
            }
            logger.debug(`sysplex system: ${systemName}`);

            // Match the optional option -- solicited keyword
            // let solKey: string = null;
            // if (options['solicited-keyword'] !== undefined) {
            //     solKey = options['solicited-keyword'];
            // } else if (options['sk'] !== undefined) {
            //     solKey = options['sk'];
            // }
            // logger.debug(`solicited keyword: ${solKey}`);

            // Get the command string
            let commandString: string = null;
            commandString = command.adjective.arguments[0];
            logger.debug(`Command string: ${commandString}`);

            // Check if command string is invalid.
            if (commandString === null
                || commandString === undefined
                || ('' + commandString).trim() === ''
            ) {
                return messages = [{
                    type: IMessageType.PLAIN_TEXT,
                    message: i18next.t('common.error.missing.argument', { argumentName: 'commandString', ns: 'ZosMessage' }),
                }];
            }

            // handle the command string inside the quotes or doube quotes
            // since zowe cli sdk issue command accept the command string without delimiters
            if ((commandString.charAt(0) == '"'
                && commandString.charAt(commandString.length - 1) == '"')
                || (commandString.charAt(0) == '\''
                && commandString.charAt(commandString.length - 1) == '\'')) {
                    commandString = commandString.substring(1, commandString.length - 1);
            }
            // session to connect Zosmf REST API.
            let ru: boolean = true;
            if (zosmfConfig?.rejectUnauthorized !== undefined) {
                ru = zosmfConfig.rejectUnauthorized;
            }
            const sessionInfo: ISession = {
                hostname: zosmfConfig.hostName,
                port: Number(zosmfConfig.port + '').valueOf(),
                user: auth.getUser().getMainframeUser(),
                password: auth.getCredentials().value,
                type: SessConstants.AUTH_TYPE_BASIC,
                rejectUnauthorized: ru,
            };
            const session = new Session(sessionInfo);
            const parms: IIssueParms = {
                command: commandString,
                consoleName: consoleName,
                solicitedKeyword: '',
                sysplexSystem: systemName,
                async: 'N',
            };
            const issueResponse: IConsoleResponse = await IssueCommand.issue(session, parms);
            if (issueResponse.success === true) {
                messages = this.view.getOutput(issueResponse, executor);
            }
        } catch (error) {
            // Got RestClientError: z/OSMF REST API Error
            let message = i18next.t('common.error.internal', { ns: 'ZosMessage' });
            if (error.errorCode !== undefined
                && error.mDetails !== undefined
                && error.mDetails.causeErrors !== undefined) {
                message = i18next.t('common.error.restAPI', { ns: 'ZosMessage', message: JSON.parse(error.mDetails.causeErrors).message });
            }

            logger.error(Util.getErrorMessage('ZWECC001E', { error: 'Zos console issue handler exception', ns: 'ChatMessage' }));
            logger.error(logger.getErrorStack(new Error(error.name), error));

            return messages = [{
                type: IMessageType.PLAIN_TEXT,
                message: message,
            }];
        } finally {
            // Print end log
            logger.end(this.issueConsoleCommand, this);
        }
        return messages;
    }
}
export = ZosCommandIssueHandler;
