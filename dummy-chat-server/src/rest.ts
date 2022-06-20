import express from 'express';

export const router = express.Router();

router.get('/auth', (_, res: express.Response) => {
    res.status(200).json({
        id: 'myid',
        username: 'dummy-user'
    })
});

router.post('/posts', (req: express.Request, res: express.Response) => {
    console.log('POSTED: ' + JSON.stringify(req.body));
    res.status(200);
});
