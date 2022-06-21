import express from 'express';

export const router = express.Router();

router.get('/auth', (_, res: express.Response) => {
    res.status(200).json({
        id: 'myid',
        username: 'dummy-user'
    })
});

router.get('/users/:id', (req: express.Request, res: express.Response)=>{
    res.status(200).json({
        id: req.params.id,
        username: 'username',
        email: 'fake@gmail.com'
    });
});

router.get('/channels/:id', (req: express.Request, res: express.Response)=>{
    res.status(200).json({
        id: req.params.id,
        name: 'channelname',
        chattingType: 'O'
    });
});

router.get('/teams/:id/channels/name/:name', (req: express.Request, res: express.Response)=>{
    res.status(200).json({
        id: req.params.id,
        name: 'channelname',
        chattingType: 'O'
    });
});

router.post('/posts', (req: express.Request, res: express.Response) => {
    console.log('POSTED: ' + JSON.stringify(req.body));
    res.status(200);
});
