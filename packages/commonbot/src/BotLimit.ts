/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import { IBotLimit, IMattermostBotLimit, IMsteamsBotLimit, ISlackBotLimit } from './types';

class BotLimit {
    protected limit: IBotLimit | IMattermostBotLimit | ISlackBotLimit | IMsteamsBotLimit;

    // Constructor
    constructor() {
        this.limit = null;
    }

    // Get limit
    public getLimit(): IBotLimit | IMattermostBotLimit | ISlackBotLimit | IMsteamsBotLimit {
        return this.limit;
    }

    // Set limit
    // public setLimit(key: string, value: number): void {
    //     this.limit[key] = value;
    // }
}

export = BotLimit;
