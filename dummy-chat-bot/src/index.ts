import express from "express";
import { IBotOption, IChatContextData, IChatToolType, IMessageType, IProtocol } from "@common/types";
import CommonBot from "@common";

const CommonBotClass = CommonBot.CommonBot; // TODO fix this - ideally ecmastyle import, worst case fix the name

const port = 8080;
const app = express();

app.listen(port, () => console.log(`Running dummy chat bot on port ${port}`));

const connectionOptions = {
    protocol: IProtocol.HTTP,
    hostName: 'localhost',
    port: 8081,
    basePath: ''
};

const botOption: IBotOption = {
    messagingApp: {
        app: app,
        option: {
            ...connectionOptions,
            tlsKey: null,
            tlsCert: null
        }
    },
    chatTool: {
        type: IChatToolType.DUMMY,
        option: {
            ...connectionOptions,
            teamUrl: 'teamurl',
            tlsCertificate: null,
            botUserName: 'dummyBot',
            botAccessToken: 'dummyToken'
        }
    }
};

const botProcessedTag = 'bot processed'

const bot = new CommonBotClass(botOption);
bot.listen((message: string) => !message.includes(botProcessedTag), processMessage);

async function processMessage(chatContextData: IChatContextData): Promise<void> {
    await bot.send(chatContextData, [{ type: IMessageType.PLAIN_TEXT, message: botProcessedTag + ': ' + chatContextData.message }]);
}
