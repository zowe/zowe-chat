import express, { Router } from 'express';
import bodyParser from 'body-parser';
import { DummyChatServer } from './ws';

export class DummyChat {
    private app: express.Application;
    private server: DummyChatServer;

    public static get(port: number): DummyChatServer {
        const chat = new DummyChat(port);
        return chat.server;
    }

    private constructor(port: number) {
        this.app = express();
        this.server = new DummyChatServer(this.app, port);

        this.app.use(bodyParser.json());

        this.initializeRoutes = this.initializeRoutes.bind(this);
        this.app.use('/', this.initializeRoutes());
    }

    private initializeRoutes(): express.Router {
        const router = express.Router();

        router.get('/auth', (_, res: express.Response) => {
            res.status(200).json({
                id: 'myid',
                username: 'dummy-user'
            })
        });

        router.get('/users/:id', (req: express.Request, res: express.Response) => {
            res.status(200).json({
                id: req.params.id,
                username: 'username',
                email: 'fake@gmail.com'
            });
        });

        router.get('/channels/:id', (req: express.Request, res: express.Response) => {
            res.status(200).json({
                id: req.params.id,
                name: 'channelname',
                chattingType: 'O'
            });
        });

        router.get('/teams/:id/channels/name/:name', (req: express.Request, res: express.Response) => {
            res.status(200).json({
                id: req.params.id,
                name: 'channelname',
                chattingType: 'O'
            });
        });

        router.post('/posts', (req: express.Request, res: express.Response) => {
            this.server.input(JSON.stringify(req.body));
            res.status(200);
        });

        return router;
    }
}
