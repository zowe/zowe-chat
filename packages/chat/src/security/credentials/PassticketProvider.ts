/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import * as exec from "child_process";
import * as fs from "fs-extra";
import { Logger } from "../../utils/Logger";
import { SecurityConfig } from "../config/SecurityConfig";
import { ChatCredential, CredentialType } from "../user/ChatCredential";
import { ChatUser } from "../user/ChatUser";
import { ICredentialProvider } from "./ICredentialProvider";

export class PassticketProvider implements ICredentialProvider {

    private readonly securityConfig: SecurityConfig;
    private readonly applId: string;
    private readonly log: Logger;

    constructor(configuration: SecurityConfig, log: Logger) {
        this.securityConfig = configuration;
        this.log = log;
        this.applId = this.securityConfig.passticketOptions.applId;

        let binFile = `${__dirname}/bin/genPtkt`;

        // verify the passticket bin exists and has correct permissions
        if (!fs.existsSync(`${binFile}`)) {
            this.log.error("Passticket binary not found");
            throw new Error("Passticket binary not found");
        }

        let attrs: fs.Stats = fs.lstatSync(`${binFile}`);

        if (!attrs.isFile()) {
            this.log.error("Passticket binary is not a file");
            throw new Error("Passticket binary is not a file");
        }
        let attrMode = attrs.mode;
        this.log.info(`Passticket binary mode: ${attrMode}`);
    }

    public async exchangeCredential(chatUser: ChatUser, credential: string): Promise<boolean> {
        return true;
    }

    public getCredential(user: ChatUser): ChatCredential | undefined {
        //TODO: convert to async call
        let stdOut = exec.execSync(`${__dirname}/bin/genPtkt ${this.applId} ${user.getDistributedUser()}`);
        let jsonFormat: PassticketData;
        try {
            jsonFormat = JSON.parse(stdOut.toString());
        } catch (e) {
            this.log.error(`Non-fatal error encountered. Could not generate a passticket for user ${user.getDistributedUser()}`);
            this.log.debug(`Error: ${e}`);
            this.log.debug(`Passticket response: ${stdOut}`);
            return undefined;
        }

        if (!Object.keys(jsonFormat).includes("passticket")) {
            this.log.error(`Non-fatal error. Error generating passticket for user ${user.getDistributedUser()}`);
            this.log.error(`safRc: ${jsonFormat.safRc}, racfRc: ${jsonFormat.racfRc}, racfReason: ${jsonFormat.racfReason}`);
            return undefined;
        }

        return {
            type: CredentialType.PASSTICKET,
            value: jsonFormat.passticket
        };
    }

    public logout(chatUser: ChatUser) {
        //nothing required.
    }
}


type PassticketData = {
    safRc: number,
    racfRc: number,
    racfReason: number,
    passticket?: string;
};