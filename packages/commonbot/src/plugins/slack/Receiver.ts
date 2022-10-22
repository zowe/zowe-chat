/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import { ExpressReceiver, ExpressReceiverOptions } from '@slack/bolt';
import { Application } from 'express';
import { Logger } from '../../utils/Logger';

const logger = Logger.getInstance();

export class Receiver extends ExpressReceiver {
    constructor(expressReceiverOptions: ExpressReceiverOptions) {
        super(expressReceiverOptions);
    }

    // Replace the default app and use the router
    setApp(messagingApp: Application): void {
        logger.start(this.setApp, this);
        try {
            this.app = messagingApp;
            this.app.use(this.router);
        } catch (err) {
            // Print exception stack
            logger.error(logger.getErrorStack(new Error(err.name), err));
        } finally {
            // Print end log
            logger.end(this.setApp, this);
        }
    }
}
