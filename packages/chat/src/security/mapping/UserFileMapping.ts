/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import * as crypto from "crypto";
import * as fs from "fs-extra";
import { Logger } from "../../utils/Logger";
import { IUserMapping } from "./IUserMapping";

/**
 * Supports mapping of distributed user ids to mainframe user ids backed by an AES-encrypted flat file.
 * 
 */
export class UserFileMapping implements IUserMapping {

    private readonly encryptAlgorithm: string = "aes-256-cbc"
    private readonly encryptIv: Buffer;
    private readonly encryptKey: Buffer;
    private readonly log: Logger;
    private readonly mappingFile: string;
    // TODO: Convert to Map<string, string>? Set function wasn't working.
    private readonly userMap: any;


    constructor(mappingFile: string, encryptionKey: Buffer, encryptionIv: Buffer, logger: Logger) {
        this.log = logger;
        this.encryptIv = encryptionIv;
        this.encryptKey = encryptionKey;
        this.mappingFile = mappingFile
        try {
            fs.ensureFileSync(this.mappingFile);
        } catch (err) {
            this.log.error(`Error creating mapping file: ${this.mappingFile}`);
            this.log.debug(`Error details: ${err}`);
            throw Error("Unable to initialize the default mapping service. See Log for details.");
        }
        let encryptedText = Buffer.from(fs.readFileSync(this.mappingFile).toString(), 'hex');
        let decipher = crypto.createDecipheriv(this.encryptAlgorithm, this.encryptKey, this.encryptIv);
        this.userMap = {}
        if (encryptedText == undefined || encryptedText.length == 0) {
            this.writeMappingFile()
        } else {
            const jsonFormat: Object = JSON.parse(Buffer.concat([decipher.update(encryptedText), decipher.final()]).toString())
            for (let [key, value] of Object.entries(jsonFormat)) {
                this.userMap[key] = value
            }
        }
        this.log.info("User mapping service initialized");
        this.log.debug(`Map content: ${JSON.stringify(this.userMap)}`);
    }

    public removeUser(distUser: string): boolean {
        delete this.userMap[distUser]
        this.writeMappingFile()
        return true
    }

    public userExists(distUser: string): boolean {
        return Object.keys(this.userMap).includes(distUser);
    }

    public getUser(distUser: string): string | undefined {
        return this.userMap[distUser];
    }

    public mapUser(distUser: string, mfUser: string): boolean {
        console.log(`Mapping ${distUser} to ${mfUser}`)
        let output = this.userMap[distUser] = mfUser;
        console.log(JSON.stringify(output))
        this.writeMappingFile();
        return true
    }

    private writeMappingFile(): void {
        this.log.debug("Writing to user mapping file")
        let cipher = crypto.createCipheriv(this.encryptAlgorithm, this.encryptKey, this.encryptIv);
        let encryptedOut = Buffer.concat([cipher.update(JSON.stringify(this.userMap)), cipher.final()])
        fs.writeFileSync(this.mappingFile, encryptedOut.toString('hex'), { flag: 'w' });
    }
}