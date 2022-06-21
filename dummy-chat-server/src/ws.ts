import * as Websocket from 'ws';
import * as http from 'http';

const dummyData = {
    channel_display_name: 'Town Square',
    channel_name: 'town-square',
    channel_type: 'O',
    mentions: ['ncy4cya8ojbk9m8gw3eefpie7y'],
    post: {
        id: '54cz6j6zejyxpgo9nb1a9m3p4o',
        create_at: 1627025384926,
        update_at: 1627025384926,
        edit_at: 0,
        delete_at: 0,
        is_pinned: false,
        user_id: '45oe76zzr78w3rugc5r3xss8cr',
        channel_id: 'hj7byq55j3yfdr4y5dnizzzx6r',
        root_id: '',
        parent_id: '',
        original_id: '',
        type: '',
        message: 'default message',
        props: {
            disable_group_highlight: true
        },
        hashtags: '',
        pending_post_id: '45oe76zzr78w3rugc5r3xss8cr:1627025384415',
        reply_count: 0,
        last_reply_at: 0,
        participants: '',
        is_following: false,
        metadata: {}
    },
    sender_name: '@carson',
    set_online: true,
    team_id: 'jqwpiqng8tbri8u6w9twy31wiy'
}

export class DummyChatServer {
    private port: number;
    private server: http.Server;
    private webSocketServer: Websocket.Server;

    public constructor(app: Express.Application, port: number) {
        this.port = port;
        this.server = http.createServer(app);
        this.webSocketServer = new Websocket.Server({ server: this.server });

        this.onConnection = this.onConnection.bind(this);
    }

    public listen() {
        this.webSocketServer.on('connection', this.onConnection);
        this.server.listen(this.port, () => console.log(`Running dummy chat server on port ${this.port}`));
    }

    private onConnection(ws: Websocket): void {
        ws.on('message', (message: string) => {
            console.log('received: ' + message);
            this.webSocketServer.clients.forEach(client => {
                client.send(JSON.stringify({ message: 'You sent me : ' + message, event: 'posted', data: getDummyData(message) }));
            });
        });
    }
}

function getDummyData(message: string) {
    const data = { ...dummyData };
    data.post.message = message.toString();
    return data;
}
