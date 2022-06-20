import express from 'express';
import bodyParser from 'body-parser';
import { router } from './rest';
import { DummyChatServer } from './ws';


const port = 8081;
const app = express();

app.use(bodyParser.json());
app.use('/', router);

const server = DummyChatServer.get(app);
server.listen(port, () => console.log(`Running dummy chat server on port ${port}`));
