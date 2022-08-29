/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import {IChatContextData, IMessage} from '../types';
import ChatListener from './ChatListener';

abstract class ChatEventListener extends ChatListener {
    constructor() {
        super();
    }

    // Match inbound message
    abstract matchEvent(chatContextData: IChatContextData): boolean;

    // Process inbound message
    abstract processEvent(chatContextData: IChatContextData): Promise<IMessage[]>;
}

export = ChatEventListener;
