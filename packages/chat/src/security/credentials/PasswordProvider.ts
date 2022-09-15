/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import crypto from "crypto";
import * as fs from "fs-extra";
import { Logger } from "../../utils/Logger";
import { SecurityConfig } from "../config/SecurityConfig";
import { ChatCredential, CredentialType } from "../user/ChatCredential";
import { ChatUser } from "../user/ChatUser";
import { ICredentialProvider } from "./ICredentialProvider";

export class PasswordProvider implements ICredentialProvider {

    private readonly log: Logger;
    private readonly encryptIv: Buffer;
    private readonly encryptKey: Buffer;
    private readonly encryptAlgorithm: string = "aes-256-cbc"
    private readonly passFile: string
    private readonly passCache: Map<string, string>

    constructor(config: SecurityConfig, cryptIv: Buffer, cryptKey: Buffer, log: Logger) {
        this.log = log;
        this.encryptIv = cryptIv
        this.encryptKey = cryptKey

        this.passFile = config.passwordOptions.filePath
        try {
            fs.ensureFileSync(this.passFile);
        } catch (err) {
            this.log.error(`Error creating password file: ${this.passFile}`);
            this.log.debug(`Error details: ${err}`);
            throw Error("Unable to initialize the password provider. See Log for more details.");
        }
        let encryptedText = Buffer.from(fs.readFileSync(this.passFile).toString(), 'hex');
        let decipher = crypto.createDecipheriv(this.encryptAlgorithm, this.encryptKey, this.encryptIv);
        this.passCache = new Map()
        if (encryptedText == undefined || encryptedText.length == 0) {
            this.writePassFile()
        } else {
            const jsonFormat: Object = JSON.parse(Buffer.concat([decipher.update(encryptedText), decipher.final()]).toString())
            for (let [key, value] of Object.entries(jsonFormat)) {
                this.passCache.set(key, value)
            }
        }
        this.log.info("Password provider initialized");
    }

    private writePassFile(): void {
        this.log.debug("Writing to password file")
        let cipher = crypto.createCipheriv(this.encryptAlgorithm, this.encryptKey, this.encryptIv);
        let encryptedOut = Buffer.concat([cipher.update(JSON.stringify(this.passCache)), cipher.final()])
        fs.writeFileSync(this.passFile, encryptedOut.toString('hex'), { flag: 'w' });
    }

    public async exchangeCredential(chatUser: ChatUser, credential: string): Promise<boolean> {
        this.passCache.set(chatUser.getMainframeUser(), credential)
        this.writePassFile()
        return true
    }

    public getCredential(chatUser: ChatUser): ChatCredential | undefined {
        if (this.passCache.get(chatUser.getMainframeUser()) == undefined) {
            return undefined
        }
        return {
            type: CredentialType.PASSWORD,
            value: this.passCache.get(chatUser.getMainframeUser())
        }
    }

    public logout(chatUser: ChatUser) {
        this.passCache.delete(chatUser.getMainframeUser())
        this.writePassFile()
    }

}