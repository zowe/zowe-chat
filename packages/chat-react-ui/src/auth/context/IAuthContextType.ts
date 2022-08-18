export interface IAuthContextType {
    user: any;
    signin: (user: string, password: string, callback: VoidFunction) => void;
    signout: (callback: VoidFunction) => void;
}
