export class ChatPrincipal {

    private readonly mMainframeUser: string;
    private readonly mDistributedUser: string;

    constructor(originalUser: string, mappedUser: string) {
        this.mDistributedUser = originalUser
        this.mMainframeUser = mappedUser
    }

    public getDistributedPrincipal(): string {
        return this.mDistributedUser
    }

    public getMainframeUser(): string {
        return this.mMainframeUser
    }
}