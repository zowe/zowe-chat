# Common Bot Framework

The Common Bot Framework is a NPM library that provides a set of uniform interface for developers to create chat bots and chat with them for different chat platforms including Mattermost, Slack and Microsoft Teams.

## Content
  - [Supported Chat Platforms](#supported-chat-platforms)
  - [Supported Message Types](#supported-message-types)
  - [Create chat bot](#create-chat-bot)
  - [Create message listeners](#create-message-listeners)
  - [Create routers](#create-routers)

## Supported Chat Platforms
The Common Bot Framework supports 3 chat platforms below at present.
* Mattermost
* Slack
* Microsoft Teams

## Supported Message Types
Except pure plain text and markdown format, most of chat platforms provide their own type of messages to support richer functions like interactive components (buttons, dropdown, etc). The Common Bot Framework supports 7 message types as below:
* **PLAIN_TEXT**: _**Any**_ Pure plain text and markdown format message. Please be noted that the supported elements syntax for markdown usually is different for different chat platforms.
* **MATTERMOST_ATTACHMENT**: _**Mattermost only**_ Interactive message including buttons etc. [Learn More ...](https://developers.mattermost.com/integrate/admin-guide/admin-message-attachments/)
* **MATTERMOST_DIALOG_OPEN**: _**Mattermost only**_ Open a dialog
* **SLACK_BLOCK**: _**Slack only**_ Message including multiple interactive elements including buttons etc. [Learn More ...](https://api.slack.com/reference/block-kit/blocks)
* **SLACK_VIEW_OPEN**: _**Slack only**_ Open a dialog
* **SLACK_VIEW_UPDATE**:  _**Slack only**_ Close a dialog
* **MSTEAMS_ADAPTIVE_CARD**: _**Teams only**_ Message including multiple interactive component including buttons etc. [Learn More ...](https://docs.microsoft.com/en-us/adaptive-cards/)
* **MSTEAMS_DIALOG_OPEN**: _**Teams only**_ Open a dialog

## Create chat bot
Before you can leverage Common Bot Framework to create one chat bot, you must create one required chat platform app and configure your chat platform and write down the values for all required properties. [Learn more ...](https://www.ibm.com/docs/en/z-chatops/1.1.2?topic=software-configuring-your-chat-platform)
* Mattermost
``` TypeScript
// Create messaging app
const app = express(); // Your Express.JS app

// Set chat bot option
const botOption: IBotOption = {
    'messagingApp': app,
    'chatTool': {
        'type': IChatToolType.MATTERMOST,
        'option': {
            'protocol': IProtocol.HTTPS,
            'hostName': '<Your host name>',
            'port': 443,
            'basePath': '/api/v4',
            'tlsCertificate': fs.readFileSync('<Your absolute certificate file path of your Mattermost server>', 'utf8'),
            'teamUrl': 'devops',
            'botUserName': 'zowechat',
            'botAccessToken': '<Your bot access token>',
        },
    },
};

// Create bot
const bot = new CommonBot(botOption);
```

* Slack
``` TypeScript
// Create messaging app
const app = null; // Your Express.JS app, not set here due to socket mode will be used

// Set chat bot option
const botOption: IBotOption = {
    'messagingApp': null,
    'botUserName': 'zowechat',
    'chatTool': {
        'type': IChatToolType.SLACK,
        'option': {
            'signingSecret': '<Your signing secret>',
            'endpoints': '', // Must be set if socketMode is false
            'receiver': undefined, // Must be set if socketMode is false
            'token': '<Your bot user OAuth token>',
            'logLevel': ILogLevel.DEBUG,
            'socketMode': true,
            'appToken': '<Your app level token>', // Must be set if socketMode is true
        },
    },
};

// Create bot
const bot = new CommonBot(botOption);
```
* Microsoft Teams
``` TypeScript
// Create messaging app
const app = express(); // Your Express.JS app

// Set chat bot option
const botOption: IBotOption = {
    'messagingApp': this.app.getApplication(),
    'botUserName': 'zowechat',
    'chatTool': {
        'type': IChatToolType.MSTEAMS,
        'option': {
            'botId': '<Your bot ID>',
            'botPassword': '<Your bot password>',
        },
    },
};

// Create bot
const bot = new CommonBot(botOption);
```
## Create message listeners
The bot created by you usually can receive all @mention messages for the bot. You must create listeners to match and process the message that you are interested in.
``` TypeScript
// Callback function used to match message
function matchMessage(message: string): boolean {
    // Print end log
    console.log(`MattermostChatbot : matchMessage  start ===>`);

    // print incoming message
    console.info(`Incoming message: ${message}`);
    this.message = message;

    // Match the bot name
    let matched = false;
    if (this.message.indexOf(`@${this.botName}`) !== -1) {
        matched = true; //
    } else {
        console.info(`The message is not for @${this.botName}`);
    }

    // print end log
    console.log(`MattermostChatbot : matchMessage    end <===`);

    return matched;
}

// Callback function used to process matched message
async function processMessage(chatContext: IChatContextData): Promise<void> {
    // print start log
    console.log(`MattermostChatbot : processMessage  start ===>`);

    // Create executor
    const executor: IExecutor = {
        id: chatContextData.user.id,
        name: chatContextData.user.name,
        team: chatContextData.team,
        channel: chatContextData.channel,
        email: chatContextData.user.email,
        conversationType: chatContextData.chattingType,
    };

    const messageText = this.message.substring(this.message.indexOf(`@${this.botName}`) + this.botName.length + 2);
    console.info(`messageText: ${messageText}`);

    if (messageText.toLowerCase().indexOf('hello') !== -1 || messageText.toLowerCase().indexOf('hi') !== -1) {
        let commandOutput: IMessage[] = [];
        commandOutput = this.view.getHelloView(executor);

        await this.bot.send(chatContextData, commandOutput);
    }

    console.log(`MattermostChatbot : processMessage    end <===`);
}

// Register message listener
bot.listen(matchMessage, processMessage);
```

## Create routers
Note: This part must be enhanced to support extendability
If some interactive components are included in your bot response, the bot will receive corresponding events when users click interactive components. You must create one callback function to process it and register the function as a router.

``` TypeScript
// Callback function used to process users' click events
async function processRoute(chatContextData: IChatContextData): Promise<void> {
 // Print start log
        console.log(`SlackChatbot : processRoute  start ===>`);

        let botResponse: IMessage[] = [];
        let payload: Record<string, any> = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
        try {
            // Get payload
            payload = chatContextData.chatToolContext.body;
            console.debug(`payload: ${JSON.stringify(payload, null, 2)}`);

            const executor: IExecutor = {
                id: chatContextData.user.id,
                name: chatContextData.user.name,
                email: chatContextData.user.email,
                team: {
                    id: '',
                    name: '',
                },
                channel: {
                    id: chatContextData.channel.id,
                    name: chatContextData.channel.name,
                },
                conversationType: chatContextData.chattingType,
            };

            if (payload.type === 'view_submission') {
                const privateMetadata = JSON.parse(payload.view.private_metadata);
                console.debug(`privateMetadata: ${JSON.stringify(privateMetadata)}`);

                if (chatContextData.channel.id === '') {
                    chatContextData.channel.id = ( privateMetadata.channelId ? privateMetadata.channelId : '' );
                }

                const stateValues = payload.view.state.values;
                const comment = (stateValues[`block_comment`] ? stateValues[`block_comment`][`action_comment`].value : '');
                botResponse = this.view.getDialogSubmit(executor, comment);
                // Handle the view submission
            } else if (payload.actions[0].type === 'static_select') { // Dropdown box
                // Handle drop down
            } else if (payload.actions[0].type === 'button') { // Button
                botResponse = this.view.getDialog(executor, payload);
            } else {
                const errorMessage = `Unsupported Slack interactive component: ${payload.actions[0].type}`;
                console.error(errorMessage);
                botResponse = [{
                    type: IMessageType.SLACK_BLOCK,
                    message: errorMessage,
                }];
                return;
            }
        } catch (err) {
            // Print exception stack
            console.error(`Exception occurred when processing inbound Slack message!`);
            console.error(err.stack);

            botResponse = [{
                type: IMessageType.SLACK_BLOCK,
                message: err.name,
            }];
        } finally {
            // Send response to chat tool
            try {
                console.info(`Command output: ${JSON.stringify(botResponse)}`);
                for (const msg of botResponse) {
                    let replyData: IMessage;
                    if (msg.type === IMessageType.PLAIN_TEXT) {
                        let isThread = false;
                        let threadTs = '';
                        if (payload.container !== undefined && payload.container.thread_ts !== undefined) {
                            isThread = true;
                        }
                        if (isThread) {
                            threadTs = payload.container.thread_ts;
                            console.debug(`Message thread_ts: ${threadTs}`);
                        }
                    } else if (msg.type === IMessageType.SLACK_BLOCK) {
                        let isThread = false;
                        if (payload.container !== undefined && payload.container.thread_ts !== undefined) {
                            isThread = true;
                        }
                        if (isThread) {
                            msg.message.thread_ts = payload.container.thread_ts;
                            console.debug(`Message thread_ts: ${msg.message.thread_ts}`);
                        }

                        msg.message.channel = chatContextData.channel.id;
                        replyData = msg;
                    } else if (msg.type === IMessageType.SLACK_VIEW) {
                        replyData = msg;
                    } else if (msg.type === IMessageType.SLACK_VIEW_UPDATE) {
                        replyData = msg;
                    } else {
                        console.error(`Unsupported message type: ${JSON.stringify(msg, null, 2)}`);
                    }
                    await this.bot.send(chatContextData, [replyData]);
                }
            } catch (err) {
                // Print exception stack
                console.error(`Exception occurred when send message to Slack!`);
                console.error(err.stack);
            } finally {
                // print end log
                console.log(`SlackChatbot : processRoute    end <===`);
            }
        }
    }
}


// Register event handler
bot.route('<Your base path>', processRoute);
```
