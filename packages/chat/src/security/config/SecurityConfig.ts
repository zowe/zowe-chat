export type SecurityConfig = {
    userStorage: string;
    encryptionKey: string;
    encryptionIv: string;
    loginStrategy: LoginStrategy
    authenticationStrategy: AuthenticationStrategy
    chatbotUser: string
    passticketOptions?: PassticketOptions
    passwordOptions?: PasswordOptions
}

export enum LoginStrategy {
    RequireLogin = "require-login",
    AutoLogin = "auto-login",
}

export enum AuthenticationStrategy {
    Passticket = "passticket",
    Password = "password",
    Token = "token",
}

export type PassticketOptions = {
    applId: string
    replay_protection: boolean
}

export type PasswordOptions = {
    filePath: string
}