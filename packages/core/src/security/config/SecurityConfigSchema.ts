import { IConfigBlockDefinition } from "../../config/doc/IConfigBlockDefinition";
import { AuthenticationStrategy, LoginStrategy } from "./SecurityConfig";

export const SecurityConfigSchema: IConfigBlockDefinition = {

    key: "chatbot-security",
    title: "Default Security Provider Configuration",
    description: "Out-of-the-box security configuration options for Zowe ChatBot",
    type: "object",
    properties: {
        userStorage: {
            type: "string",
            description: "The path where ChatBot will store a list of authenticated users and their Chat Client IDs",
            default: "./data/users.json"
        },
        encryptionKey: {
            type: "string",
            description: "The key used to encrypt secure information, using symmetric key encryption. Leave blank to generate a key.",
            default: ""
        },
        loginStrategy: {
            type: "string",
            description: "Initial login requirements for users who wish to use Zowe ChatBot",
            options: [
                {
                    description: "Requires all users to login to the Zowe ChatBot framework and map their mainframe account to a Chat Application account",
                    value: LoginStrategy.RequireLogin.toString(),
                },
                {
                    description: "All users are automatically mapped to a Chat Service account",
                    value: LoginStrategy.AutoLogin.toString(),
                }
            ],
            default: LoginStrategy.RequireLogin.toString(),
            onChange: (oldValue: string, newValue: string) => {
                // TODO: ES2017 removes the need for this cast to string. Review tslint/compiler target
                if (Object.values<string>(LoginStrategy).includes(newValue)) {
                    return true;
                } else {
                    return false;
                }
            }
        },
        authenticationStrategy: {
            type: "string",
            description: "The authentication strategy used for downstream API services such as z/OSMF",
            options: [
                {
                    value: AuthenticationStrategy.Passticket,
                    description: "Generates passtickets per user for use with downstream API services",
                },
                {
                    value: AuthenticationStrategy.Password,
                    description: "Encrypts and stores user passwords for use with downstream API services",
                }
            ],
            default: AuthenticationStrategy.Passticket,
        },
        chatbotUser: {
            type: "string",
            description: "The Chat Service account used for the Chat Bot, depending on configuration.",
            default: "ZWECHAT",
        },
        passticketOptions: {
            type: "object",
            description: "Passticket Configuration Options",
            properties: {
                applId: {
                    type: "string",
                    description: "The application ID for the passticket",
                    default: "ZWECHATP",
                },
                replay_protection: {
                    type: "boolean",
                    description: "Generates a new passticket for every user API request.",
                    default: false,
                },
            }
        },
        passwordOptions: {
            type: "object",
            description: "Password Configuration Options",
            properties: {
                filePath: {
                    type: "string",
                    description: "The path to the file where user passwords are stored",
                    default: "./_config/crypt_p",
                }
            }
        },
    }
}