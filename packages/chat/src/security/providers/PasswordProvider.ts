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