import express from "express";
import { IBotOption, IChatContextData, IChatToolType, IMessageType, IProtocol } from "@common/types";
import CommonBot from "@common";

const CommonBotClass = CommonBot.CommonBot; // TODO fix this - ideally ecmastyle import, worst case fix the name

const port = 8080;
const app = express();

app.listen(port, () => console.log(`Running dummy chat bot on port ${port}`));

const botOption: IBotOption = {
    messagingApp: {
        app: app,
        option: {
            protocol: IProtocol.HTTP,
            hostName: 'localhost',
            port: 8081,
            basePath: '/',
            tlsKey: null,
            tlsCert: null
        }
    },
    chatTool: {
        type: IChatToolType.MATTERMOST,
        option: {
            protocol: IProtocol.HTTP,
            hostName: 'localhost',
            port: 8081,
            basePath: '/',
            teamUrl: 'teamurl',
            tlsCertificate: null,
            botUserName: 'dummyBot',
            botAccessToken: 'dummyToken'
        }
    }
};

const bot = new CommonBotClass(botOption);
bot.listen(() => true, processMessage);

async function processMessage(chatContextData: IChatContextData): Promise<void> {
    console.log('Processing message');
    await bot.send(chatContextData, [{ type: IMessageType.PLAIN_TEXT, message: 'bot response!' }]);
}
