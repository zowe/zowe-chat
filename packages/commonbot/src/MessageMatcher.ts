/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import type { IMessageHandlerFunction, IMessageHandlerIndex, IMessageMatcher, IMessageMatcherFunction } from './types';

// import logger = require('./utils/Logger');

class MessageMatcher {
    private matchers: IMessageMatcher[];

    // Constructor
    constructor() {
        this.matchers = [];
    }

    // Add message matcher
    addMatcher(messageMatcher: IMessageMatcherFunction, messageHandler: IMessageHandlerFunction): void {
        // // Print start log
        // logger.start(this.addMatcher, this);

        // Create matcher
        const matcher: IMessageMatcher = {
            matcher: messageMatcher,
            handlers: [],
        };
        matcher.handlers.push(messageHandler);

        // Add matcher
        this.matchers.push(matcher);

        // // Print end log
        // logger.end(this.addMatcher, this);
    }

    // Get message matchers
    getMatchers(): IMessageMatcher[] {
        return this.matchers;
    }

    // Get matcher index
    indexOfMatcher(messageMatcher: IMessageMatcherFunction): number {
        for (let i = 0; i < this.matchers.length; i++) {
            if (this.matchers[i].matcher === messageMatcher) {
                return i;
            }
        }

        return -1;
    }

    // Check whether one matcher exists or not
    hasMatcher(messageMatcher: IMessageMatcherFunction): boolean {
        // // Print start log
        // logger.start(this.hasMatcher, this);

        // Find matcher
        for (let i = 0; i < this.matchers.length; i++) {
            if (this.matchers[i].matcher === messageMatcher) {
                return true;
            }
        }

        // // Print end log
        // logger.end(this.hasMatcher, this);

        return false;
    }

    // Add message handler
    addHandler(messageMatcher: IMessageMatcherFunction, messageHandler: IMessageHandlerFunction): void {
        // Get message handlers
        const handlers = this.getHandlers(messageMatcher);

        // Add handler
        if (handlers === null) {
            // Create matcher
            const matcher: IMessageMatcher = {
                matcher: messageMatcher,
                handlers: [],
            };

            // Add matcher along with handler
            this.matchers.push(matcher);
        } else {
            // Add handler
            handlers.push(messageHandler);
        }
    }

    // Check whether one handler exists or not
    hasHandler(messageHandler: IMessageHandlerFunction): boolean {
        // // Print start log
        // logger.start(this.hasHandler, this);

        // Find handler
        for (let i = 0; i < this.matchers.length; i++) {
            for (let j = 0; j < this.matchers[i].handlers.length; j++) {
                if (this.matchers[i].handlers[j] === messageHandler) {
                    return true;
                }
            }
        }

        // // Print end log
        // logger.end(this.hasHandler, this);

        // Not exist
        return false;
    }

    // Get message handlers
    getHandlers(messageMatcher: IMessageMatcherFunction): IMessageHandlerFunction[] {
        // Find matcher
        for (let i = 0; i < this.matchers.length; i++) {
            if (this.matchers[i].matcher === messageMatcher) {
                return this.matchers[i].handlers;
            }
        }

        // Not found
        return null;
    }

    // Get handler index
    indexOfHandler(messageHandler: IMessageHandlerFunction): IMessageHandlerIndex {
        // Find handler
        for (let i = 0; i < this.matchers.length; i++) {
            for (let j = 0; j < this.matchers[i].handlers.length; j++) {
                if (this.matchers[i].handlers[j] === messageHandler) {
                    return {
                        'matcherIndex': i,
                        'handlerIndex': j,
                    };
                }
            }
        }

        // Not found
        return {
            'matcherIndex': -1,
            'handlerIndex': -1,
        };
    }
}

export = MessageMatcher;
