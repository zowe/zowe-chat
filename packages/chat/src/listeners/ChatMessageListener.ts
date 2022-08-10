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

abstract class ChatMessageListener {
    constructor() {
        // TODO
    }

    // Match inbound message
    abstract matchMessage(chatContextData: IChatContextData): boolean;

    // Process inbound message
    abstract processMessage(chatContextData: IChatContextData): Promise<IMessage[]>;
}

export = ChatMessageListener;
