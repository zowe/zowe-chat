import * as crypto from "crypto";
import * as fs from "fs-extra";
import { Logger } from "../../utils/Logger";
import { IUserMapping } from "./IUserMapping";

/**
 * Supports mapping of distributed user ids to mainframe user ids backed by an AES-encrypted flat file.
 * 
 */
export class UserFileMapping implements IUserMapping {

    private readonly mEncryptAlgorithm: string = "aes-256-ebc";
    private readonly mEncryptKey: string;
    private readonly mCipher: crypto.Cipher;
    private readonly mLogger: Logger;
    private mMappingFile: string;
    private mUserMap: Map<string, string>;


    constructor(mappingFile: string, encryptionKey: string, logger: Logger) {
        this.mLogger = logger;
        this.mMappingFile = mappingFile
        try {
            fs.ensureFileSync(this.mMappingFile);
        } catch (err) {
            this.mLogger.error(`Error creating mapping file: ${this.mMappingFile}`);
            this.mLogger.debug(`Error details: ${err}`);
            throw Error("Unable to initialize the default mapping service. See Log for details.");
        }
        this.mEncryptKey = encryptionKey
        this.mCipher = crypto.createCipheriv(this.mEncryptAlgorithm, this.mEncryptKey, "");
        let encryptedText = Buffer.from(fs.readFileSync(this.mMappingFile).toString(), 'hex');
        let decipher = crypto.createDecipheriv(this.mEncryptAlgorithm, this.mEncryptKey, "");
        this.mUserMap = JSON.parse(Buffer.concat([decipher.update(encryptedText), decipher.final()]).toString())
    }

    public userExists(distUser: string): boolean {
        return this.mUserMap.has(distUser);
    }

    public getUser(distUser: string): string | undefined {
        return this.mUserMap.get(distUser);
    }

    public mapUser(distUser: string, mfUser: string): boolean {
        this.mUserMap.set(distUser, mfUser);
        fs.writeFileSync(this.mMappingFile, this.mCipher.update(JSON.stringify(this.mUserMap)));
        return true
    }
}