import { ChatUser } from "./ChatUser";

export class ChatPrincipal {

    private readonly chatUser: ChatUser;
    private readonly mainframeCredential: string;

    constructor(chatUser: ChatUser, mainframeCredential: string) {
        this.chatUser = chatUser
        this.mainframeCredential = mainframeCredential
    }

    public getMainframeCredential(): string {
        return this.mainframeCredential
    }

    public getUser(): ChatUser {
        return this.chatUser
    }
}