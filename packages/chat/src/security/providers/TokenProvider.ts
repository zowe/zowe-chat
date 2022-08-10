import { Logger } from "../../utils/Logger";
import { SecurityConfig } from "../config/SecurityConfig";
import { ChatPrincipal } from "../user/ChatPrincipal";
import { ICredentialProvider } from "./ICredentialProvider";

export class TokenProvider implements ICredentialProvider {

    constructor(config: SecurityConfig, log: Logger) {
        throw new Error("Method not implemented.");
    }
    getCredential(chatUser: ChatPrincipal): string {
        throw new Error("Method not implemented.");
    }
}