import { IConfigBlockDefinition } from "../../config/doc/IConfigBlockDefinition";

export class SecurityConfig implements IConfigBlockDefinition {

    title: string = "Default Security Provider Configuration"
    description: string = "Out-of-the-box security configuration options for Zowe ChatBot"
    type: string = "object" 
    properties: { 
        "authnStrategu": {
            type: "string",
            options: [
                { 
                    description: "Requires all users to login to the Zowe ChatBot framework and map their mainframe account to a Chat Application account",
                    value: "require-login"
                },
                {
                    description: "All users are automatically mapped to a Chat Service account",
                    value: "no-authn"
                }
            ],
            default: "require-login",
        },
        "chatbotUser": {
            type: "string",
            description: "The Chat Service account used for the Chat Bot, depending on configuration.",
            default: "ZWECHAT",
        },
        "passticketApplId": {
            
        }
    };

    
}