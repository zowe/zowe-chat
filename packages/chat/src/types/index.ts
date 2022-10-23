/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import { IChatContextData, IMessage, IName } from '@zowe/commonbot';
import { ChatPrincipal } from '../security/user/ChatPrincipal';

export type ChatContext = {
    context: IChatContextData;
    principal?: ChatPrincipal;
};

export interface IExecutor extends IName {
    team: IName;
    channel: IName;
    email: string;
    chattingType: string;
}

export interface IChatPlugin {
    package: string;
    registry: string;
    version: number;
    priority: number;
    listeners?: string[];
    resources?: IResource[];
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IChatListener {

}

export interface IMessageListener extends IChatListener {
    matchMessage(chatContextData: IChatContextData): boolean;
    processMessage(chatContextData: IChatContextData): Promise<IMessage[]>;
}

export interface IEventListener extends IChatListener {
    matchEvent(chatContextData: IChatContextData): boolean;
    processEvent(chatContextData: IChatContextData): Promise<IMessage[]>;
}


/* eslint-disable no-unused-vars */
export const enum IChatListenerType {
    MESSAGE = 'message',
    EVENT = 'event',
}
/* eslint-enable no-unused-vars */

export interface IChatListenerRegistryEntry {
    listenerName: string;
    listenerType: IChatListenerType;
    listenerInstance: IChatListener;
    chatPlugin: IChatPlugin;
}

export interface ICommand {
    scope: string;
    resource: string;
    verb: string;
    object: string;
    adjective: IAdjective;
    extraData?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface IAdjective {
    arguments: string[];
    option: Record<string, string>;
}

export interface IResource {
    loadPath: string;
    namespace: string;
}

export { IBotOption, IChatToolType, IChatContextData, IMattermostOption, ISlackOption, IMsteamsOption, ILogLevel, ILogOption, IProtocol, IHttpEndpoint,
    IMessageHandlerFunction, IMessageMatcherFunction, IRouteHandlerFunction, IMessagingApp, IMessage, IMessageType, IAppOption, IPayloadType,
    IEvent, IActionType, IBotLimit, IMattermostBotLimit, ISlackBotLimit, IMsteamsBotLimit } from '@zowe/commonbot';
