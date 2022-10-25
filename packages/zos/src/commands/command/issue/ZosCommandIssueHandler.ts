/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import { IIssueParms,
    IssueCommand,
    IConsoleResponse
} from "@zowe/zos-console-for-zowe-sdk";
import i18next from 'i18next';
import {ISession, Session, SessConstants} from '@zowe/imperative';
import {logger, IMessage, IMessageType, IChatToolType,
    IExecutor, config, ChatHandler, IBotOption, IBotLimit,
    ICommand, Util, IMsteamsBotLimit, ChatPrincipal,
    IMattermostBotLimit, ISlackBotLimit} from '@zowe/chat';
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
            let sysplex: string = null;
            if (options['sysplex-system'] !== undefined) {
                sysplex = options['sysplex-system'];
            } else if (options['ss'] !== undefined) {
                sysplex = options['ss'];
            }
            logger.debug(`sysplex system: ${sysplex}`);

            // Match the optional option -- solicited keyword
            // let solKey: string = null;
            // if (options['solicited-keyword'] !== undefined) {
            //     solKey = options['solicited-keyword'];
            // } else if (options['sk'] !== undefined) {
            //     solKey = options['sk'];
            // }
            // logger.debug(`solicited keyword: ${solKey}`);
            
            // Get the command string 
            let cmdString: string = null;
            cmdString = command.adjective.arguments[0];
            logger.debug(`Command string: ${cmdString}`);
    
            // Check if command string is invalid.
            if (cmdString === null || 
                cmdString === undefined ||
                ('' + cmdString).trim() === ''
                ) {
                return messages = [{
                    type: IMessageType.PLAIN_TEXT,
                    message: i18next.t('common.error.missing.argument', { argumentName: 'cmdString', ns: 'ZosMessage' }),
                }];
            }
            
            //handle the command string inside the quotes or doube quotes
            //since zowe cli sdk issue command accept the command string without delimiters
            if((cmdString.charAt(0) == '"' && 
                cmdString.charAt(cmdString.length - 1) == '"') || 
                (cmdString.charAt(0) == "'" && 
                cmdString.charAt(cmdString.length - 1) == "'"))
                {
                    cmdString = cmdString.substring(1,cmdString.length - 1);
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
                command: cmdString,
                consoleName: consoleName,  
                solicitedKeyword: "",
                sysplexSystem: sysplex,
                async: "N"
            };
            let issueResponse: IConsoleResponse;
            issueResponse = await IssueCommand.issue(session, parms);
            if(issueResponse.success === true){
                messages = this.view.getOutput(issueResponse, executor);
            }
        } catch (error) {
            // ZWECC001E: Internal server error: {{error}}
            logger.error(Util.getErrorMessage('ZWECC001E', { error: 'Zos console issue handler exception', ns: 'ChatMessage' }));
            logger.error(logger.getErrorStack(new Error(error.name), error));

            return messages = [{
                type: IMessageType.PLAIN_TEXT,
                message: i18next.t('common.error.internal', { ns: 'ZosMessage' }),
            }];
        } finally {
            // Print end log
            logger.end(this.issueConsoleCommand, this);
        }
        return messages;
    }
}
export = ZosCommandIssueHandler;
