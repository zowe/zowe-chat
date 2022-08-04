
export interface IUserMapping {

    userExists(distUser: string): boolean

    getUser(distUser: string): string

    mapUser(distUser: string, mfUser: string): boolean

}