interface IAuthenticationProvider {


    authenticate(): boolean

    getCredentials(): ICredentials

    

}