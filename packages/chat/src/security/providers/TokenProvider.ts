import { Logger } from "../../utils/Logger";
import { SecurityConfig } from "../config/SecurityConfig";
import { ChatUser } from "../user/ChatUser";
import { ICredentialProvider } from "./ICredentialProvider";

export class TokenProvider implements ICredentialProvider {


    private readonly log: Logger;
    private readonly config: SecurityConfig;

    constructor(config: SecurityConfig, log: Logger) {
        this.config = config;
        this.log = log
    }

    getCredential(chatUser: ChatUser): string {
        throw new Error("Method not implemented.");
    }
}