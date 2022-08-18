import React from "react"
import { IAuthContextType } from "./IAuthContextType"

export const AuthContext: React.Context<IAuthContextType> = React.createContext<IAuthContextType>(null!)
export function useAuth() {
    return React.useContext(AuthContext)
}