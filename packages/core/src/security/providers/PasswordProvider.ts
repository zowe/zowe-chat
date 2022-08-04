import { ChatPrincipal } from "../user/ChatPrincipal";
import { ICredentialProvider } from "./ICredentialProvider";

export class PasswordProvider implements ICredentialProvider {

    constructor() {
        throw new Error("Not implemented");
    }

    getCredential(chatUser: ChatPrincipal): string {
        throw new Error("Method not implemented.");
    }

}