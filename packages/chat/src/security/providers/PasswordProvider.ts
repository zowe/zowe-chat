/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import { Logger } from "../../utils/Logger";
import { SecurityConfig } from "../config/SecurityConfig";
import { ChatUser } from "../user/ChatUser";
import { ICredentialProvider } from "./ICredentialProvider";

export class PasswordProvider implements ICredentialProvider {


    constructor(config: SecurityConfig, log: Logger) {
        
    }

    getCredential(chatUser: ChatUser): string {
        throw new Error("Method not implemented.");
    }

}