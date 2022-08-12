/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import { IChatContextData, IMessage } from "@zowe/commonbot";
import { ChatPrincipal } from "../security/user/ChatPrincipal";

export type ChatContext = {
    context: IChatContextData;
    principal?: ChatPrincipal
}

export interface IName {
    id: string;
    name: string;
}

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
    listeners: string[];
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


