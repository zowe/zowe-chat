import { DummyChat } from "./rest";
import { DummyChatServer } from "./ws";

const port = 8081;

const server: DummyChatServer = DummyChat.get(port);
server.listen();

process.stdin.on('data', function(chunk) {
    server.input(chunk.toString());
});
