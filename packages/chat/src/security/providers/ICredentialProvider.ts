import { ChatUser } from "../user/ChatUser";

export interface ICredentialProvider {

    getCredential(chatUser: ChatUser): string

}