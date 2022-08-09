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
    private userMap: Map<string, string>;


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
        if (encryptedText == undefined || encryptedText.length == 0) {
            this.userMap = new Map<string,string>()
            this.writeMappingFile()
        } else {
            this.userMap = JSON.parse(Buffer.concat([decipher.update(encryptedText), decipher.final()]).toString())
        }
        this.log.info("User mapping service initialized");
        this.log.info(`Map content: ${this.userMap}`);
    }

    private writeMappingFile(): void {
        let cipher = crypto.createCipheriv(this.encryptAlgorithm, this.encryptKey, this.encryptIv);
        let encryptedOut = Buffer.concat([cipher.update(JSON.stringify(this.userMap)), cipher.final()])
        fs.writeFileSync(this.mappingFile, encryptedOut.toString('hex'));
    }

    public userExists(distUser: string): boolean {
        return this.userMap.has(distUser);
    }

    public getUser(distUser: string): string | undefined {
        return this.userMap.get(distUser);
    }

    public mapUser(distUser: string, mfUser: string): boolean {
        this.userMap.set(distUser, mfUser);
        this.writeMappingFile();
        return true
    }
}