# Common Bot Framework

The Common Bot Framework is a NPM library that provides a set of uniform interface for developers to create chat bots and chat with them for different chat platforms including Mattermost, Slack and Microsoft Teams so as to to enable chat functionality for your products.

## Content
  - [Features](#features)
  - [Interfaces](#interfaces)
  - [Environment variables](#environment-variables)
  - [Supported Message Types](#supported-message-types)
  - [Create chat bot](#create-chat-bot)
  - [Create message listeners](#create-message-listeners)
  - [Create routers](#create-routers)

## Features
* Support the latest version of 3 chat platforms
  * Microsoft Teams
  * Slack
  * Mattermost
* Support to chat with bot in 3 different places
  * in a channel via @mention bot
  * in a thread  via @mention bot
  * 1 on 1 directly
* Support to interact with bot via interactive components
  * Dropdown box
  * Button
  * Show popup dialog to collect sensitive input: operator account and password
* Support to create multiple bots in user applications

## Interfaces
* Messaging App
* Bot APIs
  * listen(matcher, handler)
  * route(basePath, handler)
  * send(chatContextData, message)
* Chat context data
  * Context data for chatting, including message, bot, user / channel / team / tenant information
  * Context data specific for different chat platforms

## Environment variables
* COMMONBOT_LOG_FILE

  Specifies the log file of your Common Bot Framework. The default value is $ZCHATOPS_HOME/node_modules/commonbot/log/common-bot.log.
* COMMONBOT_LOG_LEVEL

  Specifies the level of logs. The value can be error, warn, info, verbose, debug, or silly. The default value is info.
* COMMONBOT_LOG_MAX_SIZE

  Specifies the maximum size of the file after which the log will rotate. The value can be a number of bytes without any unit or a number with the suffix k, m, or g as units for KB, MB, or GB separately. The default value is null, which means that the file size is unlimited except the operating system limit.

* COMMONBOT_LOG_MAX_FILES
  Specifies the maximum file number of logs to keep. The default value is null, which means all the log files will be kept and no logs will be removed.
​
## Supported Message Types
Except pure plain text and markdown format, most of chat platforms provide their own type of messages to support richer functions like interactive components (buttons, dropdown, etc). The Common Bot Framework supports 7 message types as below:
* **PLAIN_TEXT**: _**Any**_ Pure plain text and markdown format message. Please be noted that the supported elements syntax for markdown usually is different for different chat platforms.
* **MATTERMOST_ATTACHMENT**: _**Mattermost only**_ Interactive message including buttons etc. [Learn More ...](https://developers.mattermost.com/integrate/admin-guide/admin-message-attachments/)
* **MATTERMOST_DIALOG_OPENING**: _ **Mattermost only**_ Open a dialog
* **SLACK_BLOCK**: _**Slack only**_ Message including multiple interactive elements including buttons etc. [Learn More ...](https://api.slack.com/reference/block-kit/blocks)
* **SLACK_VIEW**: _**Slack only**_ Open a dialog
* **SLACK_VIEW_UPDATE**:  _**Slack only**_ Close a dialog
* **MSTEAMS_ADAPTIVE_CARD**: _**Teams only**_ Message including multiple interactive component including buttons etc. [Learn More ...](https://docs.microsoft.com/en-us/adaptive-cards/)
​
​
## Create chat bot
Before you can leverage Common Bot Framework to create one chat bot, you must create one required chat platform app and configure your chat platform and write down the values for all required properties. [Learn more ...](https://www.ibm.com/docs/en/z-chatops/1.1.2?topic=software-configuring-your-chat-platform)
* Mattermost
``` TypeScript
// Create messaging app
const app = express(); // Your Express.JS app
​
// Set chat bot option
const botOption: IBotOption = {
    'messagingApp': {
        'option': {
            'protocol': IProtocol.HTTPS,
            'hostName': '<Your host name>',
            'port': <Your port number>,
            'basePath': '<Your base path>',
            'tlsKey': fs.readFileSync('<The absolute file path of your TLS key>', 'utf8'),
            'tlsCert': fs.readFileSync('<The absolute file path of your TLS certificate>', 'utf8'),
        },
        'app': app,
    },
    'chatTool': {
        'type': IChatToolType.MATTERMOST,
        'option': {
            'protocol': IProtocol.HTTPS,
            'hostName': '<Your host name>',
            'port': 443,
            'basePath': '/api/v4',
            'tlsCertificate': fs.readFileSync('<The absolute file path of your Mattermost server TLS certificate>', 'utf8'),
            'teamUrl': '<Your team URL>',
            'botUserName': '<Your bot user name>',
            'botAccessToken': '<Your bot access token>',
        },
    },
};
​
// Create bot
const bot = new CommonBot(botOption);
```
​
* Slack
``` TypeScript
// Create messaging app
const app = null; // Your Express.JS app, not set here due to socket mode will be used
​
// Set chat bot option
const botOption: IBotOption = {
    'messagingApp': null,
    'chatTool': {
        'type': IChatToolType.SLACK,
        'option': {
            'botUserName': '<Your bot user name>',
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
​
// Create bot
const bot = new CommonBot(option);
```
* Microsoft Teams
``` TypeScript
// Create messaging app
const app = express(); // Your Express.JS app
​
// Set chat bot option
const botOption: IBotOption = {
    'messagingApp':  {
        'option': {
            'protocol': IProtocol.HTTPS,
            'hostName': '<Your host name>',
            'port': <Your port number>,
            'basePath': '<Your base path>',
            'tlsKey': fs.readFileSync('<The absolute file path of your TLS key>', 'utf8'),
            'tlsCert': fs.readFileSync('<The absolute file path of your TLS certificate>', 'utf8'),
        },
        'app': app,
    },
    'chatTool': {
        'type': IChatToolType.MSTEAMS,
        'option': {
            'botId': '<Your bot Id>',
            'botPassword': '<Your bot password>',
            'botUserName': '<Your bot user name>',
        },
    },
};
​
// Create bot
const bot = new CommonBot(option);
```
## Create message listeners
The bot created by you usually can receive all @mention messages for the bot. You must create listeners to match and process the message that you are interested in.
``` TypeScript
// Callback function used to match message
function matchMessage(message: string): boolean {
    // Print end log
    console.log(`MattermostChatbot : matchMessage  start ===>`);
​
    // print incoming message
    console.info(`Incoming message: ${message}`);
    this.message = message;
​
    // Match the bot name
    let matched = false;
    if (this.message.indexOf(`@${this.botName}`) !== -1) {
        matched = true; //
    } else {
        console.info(`The message is not for @${this.botName}`);
    }
​
    // print end log
    console.log(`MattermostChatbot : matchMessage    end <===`);
​
    return matched;
}
​
// Callback function used to process matched message
async function processMessage(chatContextData: IChatContextData): Promise<void> {
    // print start log
    console.log(`MattermostChatbot : processMessage  start ===>`);
​
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
​
    console.log(`MattermostChatbot : processMessage    end <===`);
}
​
// Register message listener
bot.listen(matchMessage, processMessage);
```
​
## Create routers
Note: This part must be enhanced to support extendability
If some interactive components are included in your bot response, the bot will receive corresponding events when users click interactive components. You must create one callback function to process it and register the function as a router.
​
``` TypeScript
// Callback function used to process users' click events
async function processRoute(chatContextData: IChatContextData): Promise<void> {
    // Print start log
    console.log(`SlackChatbot : processRoute  start ===>`);
​
    let botResponse: IMessage[] = [];
    let payload: Record<string, any> = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
        // Get payload
        payload = chatContextData.chatToolContext.body;
        console.debug(`payload: ${JSON.stringify(payload, null, 2)}`);
​
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
​
        if (payload.type === 'view_submission') {
            const privateMetadata = JSON.parse(payload.view.private_metadata);
            console.debug(`privateMetadata: ${JSON.stringify(privateMetadata)}`);
​
            if (chatContextData.channel.id === '') {
                chatContextData.channel.id = ( privateMetadata.channelId ? privateMetadata.channelId : '' );
            }
​
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
​
        botResponse = [{
            type: IMessageType.SLACK_BLOCK,
            message: err.name,
        }];
    } finally {
        // Send response to chat tool
        try {
            console.info(`Command output: ${JSON.stringify(botResponse)}`);
            for (const msg of botResponse) {
                await chatContext.send([msg]);
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
​
// Register event handler
bot.route('/bnz/api/v1', processRoute);
```