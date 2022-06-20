import * as Websocket from 'ws';
import * as http from 'http';

const dummyData = {
    channel_display_name: 'Town Square',
    channel_name: 'town-square',
    channel_type: 'O',
    mentions: '["ncy4cya8ojbk9m8gw3eefpie7y"]',
    post: {
        id: "54cz6j6zejyxpgo9nb1a9m3p4o",
        create_at: 1627025384926,
        update_at: 1627025384926,
        edit_at: 0,
        delete_at: 0,
        is_pinned: false,
        user_id: "45oe76zzr78w3rugc5r3xss8cr",
        channel_id: "hj7byq55j3yfdr4y5dnizzzx6r",
        root_id: "",
        parent_id: "",
        original_id: "",
        message: "@blz  ad list",
        type: "",
        props: {
            disable_group_highlight: true
        },
        hashtags: "",
        pending_post_id: "45oe76zzr78w3rugc5r3xss8cr:1627025384415",
        reply_count: 0,
        last_reply_at: 0,
        participants: '',
        is_following: false,
        metadata: {}
    },
    sender_name: '@nancy',
    set_online: true,
    team_id: 'jqwpiqng8tbri8u6w9twy31wiy'
}

export class DummyChatServer {
    private constructor() { }

    public static get(app: Express.Application): http.Server {
        const server = http.createServer(app);
        const websocketServer = new Websocket.Server({ server });

        websocketServer.on('connection', this.onConnection);

        return server;
    }

    private static onConnection(ws: Websocket): void {
        ws.on('message', (message: string) => {
            console.log('received: ' + message);
            ws.send(JSON.stringify({ message: 'You sent me : ' + message, event: 'posted', data: dummyData }));
        });

        ws.send('hello from local dummy server');
    }
}
