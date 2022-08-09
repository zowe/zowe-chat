export class ChatPrincipal {

    private readonly mainframeUser: string;
    private readonly distributedUser: string;

    constructor(originalUser: string, mappedUser: string) {
        this.distributedUser = originalUser
        this.mainframeUser = mappedUser
    }

    public getDistributedPrincipal(): string {
        return this.distributedUser
    }

    public getMainframeUser(): string {
        return this.mainframeUser
    }
}