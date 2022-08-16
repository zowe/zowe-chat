/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import {IExecutor} from '../types';

class ChatView {
    // Get header message
    getHeaderMessage(recordLength: number, executor: IExecutor, adjectives: Record<string, string>,
            objectName: string, Identifier: string, forDetailView: boolean = false): string {
        // Get limit
        const limit: string = adjectives['limit'];

        // Get text message
        let message: string = '';
        if (recordLength === 0) {
            message = `@${executor.name}. I haven't found any ${objectName} that match the filter.`;
        } else if (recordLength === 1 && forDetailView === true) {
            message = `@${executor.name}. Here is the the basic information of ${Identifier}:`;
        } else {
            if (recordLength < Number(limit).valueOf()) {
                message = `@${executor.name}. I have found ${recordLength} ${objectName}s that match the filter:`;
            } else {
                // TODO: Think about what message should be when  too many jobs are searched.
                message = `@${executor.name}. I have found ${recordLength} ${objectName}s that match the filter:`;
            }
        }

        return message;
    }
}

export = ChatView;
