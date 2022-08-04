import { ChatPrincipal } from "../user/ChatPrincipal"

export interface ICredentialProvider {

    getCredential(chatUser: ChatPrincipal): string

}