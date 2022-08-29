# @zowe/chat project

@zowe/chat is the core component of @zowe/zowe-chat project. The component provides basic functionalities for chatting and two abstract listeners (ChatMessageListener and ChatEventListener) for users to create their own plugins to extend capabilities of Zowe Chat as plugins.

## Content
  - [Features](#features)
  - [Environment variables](#environment-variables)
  - [Steps to create one plugin](#steps-to-create-one-plugin)
  - [Steps to run Zowe Chat server](#steps-to-run-zowe-chat-server)

## Features
* Provide basic functionalities for chatting
  * Configuration
  * Logging
  * Utility 
* Support extendibility via following classes
  * ChatMessageListener `<required>`
  * ChatEventListener `<required>`
  * ChatHandler `<optional>`
  * ChatMattermostView `<optional>`
  * ChatSlackView `<optional>`
  * ChatMsteamsView `<optional>`
* Load plugins dynamically from ZOWE_CHAT_PLUGIN_HOME
* Sort plugins per the specified priority

## Environment variables
* ZOWE_CHAT_HOME

  Specifies the home directory where Zowe Chat server is installed

* ZOWE_CHAT_PLUGIN_HOME

  Specifies the home directory where Zowe Chat plugins are installed

* ZOWE_CHAT_LOG_FILE_PATH

  Specifies the log file path of your Zowe Chat server. The default value is `$ZOWE_CHAT_HOMEt/log/zoweChatServer.log`.

* ZOWE_CHAT_LOG_LEVEL

  Specifies the level of logs. The value can be error, warn, info, verbose, debug, or silly. The default value is info.
* ZOWE_CHAT_LOG_MAX_SIZE

  Specifies the maximum size of the file after which the log will rotate. The value can be a number of bytes without any unit or a number with the suffix k, m, or g as units for KB, MB, or GB separately. The default value is null, which means that the file size is unlimited except the operating system limit.

* ZOWE_CHAT_LOG_MAX_FILES

  Specifies the maximum file number of logs to keep. The default value is null, which means all the log files will be kept and no logs will be removed.

## Steps to create one plugin
* Create one NPM project
* Extend and implement two abstract classes `ChatMessageListener` and `ChatEventListener`

    Note:  No need to extend and implement `ChatEventListener` interface if you don't have any interactivity component in your bot response.
  * ChatMessageListener
  ```TypeScript
    class YourMessageListener extends ChatMessageListener {

        constructor() {
            super()

            this.matchMessage = this.matchMessage.bind(this);
            this.processMessage = this.processMessage.bind(this);
        }

        // Match inbound message
        matchMessage(chatContextData: IChatContextData): boolean {
            // Print start log
            this.logger.start(this.matchMessage, this);

            // Match message
            try {
                // TODO: Add your message filter logic here

                return true;
            } catch (error) {
                // Print exception stack
                this.logger.error(this.logger.getErrorStack(new Error(error.name), error));
            } finally {
                // Print end log
                this.logger.end(this.matchMessage, this);
            }
        }

        // Process inbound message
        async processMessage(chatContextData: IChatContextData): Promise<IMessage[]> {
                    // Print start log
            this.logger.start(this.processMessage, this);

            // Process matched message
            try {
                // TODO: Add your business processing logic here

            } catch (error) {
                // Print exception stack
                this.logger.error(this.logger.getErrorStack(new Error(error.name), error));
            } finally {
                // Print end log
                this.logger.end(this.processMessage, this);
            }
        }
    }
  ```
  * ChatEventListener
  ```TypeScript
    class YourEventListener extends ChatEventListener {
        constructor() {
            super();

            this.matchEvent = this.matchEvent.bind(this);
            this.processEvent = this.processEvent.bind(this);
        }

        // Process inbound event
        matchEvent(chatContextData: IChatContextData): boolean {
            // Print start log
            this.logger.start(this.matchEvent, this);

            // Match event
            try {
                // TODO: Add your event filter logic here

                return true;
            } catch (error) {
                // Print exception stack
                this.logger.error(this.logger.getErrorStack(new Error(error.name), error));
            } finally {
                // Print end log
                this.logger.end(this.matchEvent, this);
            }
        }

        // Process inbound event
        async processEvent(chatContextData: IChatContextData): Promise<IMessage[]> {
                // Print start log
                this.logger.start(this.processMessage, this);

                try {
                    // TODO: Add your business processing logic here

                } catch (error) {
                    // Print exception stack
                    this.logger.error(this.logger.getErrorStack(new Error(error.name), error));
                } finally {
                    // Print end log
                    this.logger.end(this.processMessage, this);
                }
        }
    }
  ```
* Add your plugin description to `plugin.yaml`
  ```YAML
    - package: "@zowe/YourPlugin"
      registry: https://registry.npmjs.org/
      version: Your Plugin Version
      priority: Your Plugin Priority
      listeners:
        - YourMessageListener
        - YourEventListener
  ```
* Write your own views to process the event of interactivity components
  * Mattermost
    * Button View
    ```TypeScript
        {
            'type': IMessageType.MATTERMOST_ATTACHMENT,
            'message': {
                ...
                'actions': [
                    {
                        'name': 'Add your comment',
                        'type': 'button',
                        'integration': {
                            'url': 'https://YourMessagingEndpointHostName:portNumber/basePath',
                            'context': {
                                'pluginId': '@zowe/zosJob',
                                'action': {
                                    'id': 'DIALOG_OPEN_showAddCommentDialog', // ID must start with DIALOG_OPEN_ if you want to open a dialog
                                    'type': IActionType.DIALOG_OPEN, // Optional
                                    'token': 'dialog token'
                                },
                                'command': 'Comment',
                            },
                        },
                    },
                ]
                ...
            }
        }
    ```
    * Dialog View
    ```TypeScript
        {
            'type': IMessageType.MATTERMOST_DIALOG_OPEN,
            
            'message': {
                'trigger_id': triggerId,
                'url': 'https://YourMessagingEndpointHostName:portNumber/basePath',
                'dialog': {
                    'callback_id': 'Comment',
                    'title': 'Add Comment Dialog',
                    'icon_url': 'https://mattermost.org/wp-content/uploads/2016/04/icon.png',
                    'elements': [
                        {
                            'display_name': 'Comment',
                            'name': 'comment',
                            'type': 'text',
                            'default': '',
                            'placeholder': 'Your comment',
                        },
                    ],
                    'submit_label': 'Submit',
                    'notify_on_cancel': false,
                    'state': '@zowe/zosJob:closeCommentDialog:dialog token:command to echo', // Value format: PLUGIN_ID:ACTION_ID:ACTION_TOKEN:USER_DATA
                },
            },
        }
    ```
  * Slack
    * Button View
    ```TypeScript
        {
            'type': IMessageType. SLACK_BLOCK,
            'message':  {
                'blocks': [
                    …
                    {
                        'type': 'actions',
                        'elements': [
                            {
                                'type': 'button',
                                // Value format: PLUGIN_ID:ACTION_ID:ACTION_TOKEN:USER_DATA
                                // action ID must start with DIALOG_OPEN_ if you want to open a dialog
                                'action_id': '@zowe/zosJob:DIALOG_OPEN_Log in_76405136:dialog token:other',
                                'text': {
                                    'type': 'plain_text',
                                    'text': 'Add your comment',
                                },
                                'value': 'Comment',
                            },
                        ],
                    },
                ],
                'channel': executor.channel.id,
            }
        }
    ```
    * Dialog View
    ```TypeScript
        {
            'type': IMessageType.SLACK_VIEW,
            'message': {
                'trigger_id': triggerId,
                'view': {
                    'type': 'modal',
                    'callback_id': 'modal-identifier',
                    …
                    'blocks': [
                        {
                            'type': 'input',
                            'block_id': 'block_comment',
                            'label': {
                                'type': 'plain_text',
                                'text': 'Comment',
                            },
                            …
                        },
                    ],
                    'private_metadata': JSON.stringify({
                        'channelId': executor.channel.id,
                        'channelName': executor.channel.name,
                        'pluginId': '@zowe/zosJob',
                        'action': {
                            'id': 'close dialog',
                            'token': 'dialog token'
                        },
                    }),
                },
            },
        }
    ```
  * Microsoft Teams 
    * Button View
    ```TypeScript
        {
            'type': IMessageType.MSTEAMS_ADAPTIVE_CARD,
            'message': {
                …
                'body': [
                    …
                    {
                        'type': 'ActionSet',
                        'actions': [
                            {
                                'type': 'Action.Submit',
                                'title': 'Add your comment',
                                'data': {
                                    'msteams': {
                                        'type': 'task/fetch',   // Required for opening dialog
                                    },
                                    'pluginId': '@zowe/zosJob',
                                    'action': {
                                        'id': 'DIALOG_OPEN_open dialog', // ID must start with DIALOG_OPEN_ if you want to open a dialog
                                        'type': IActionType.DIALOG_OPEN, // Optional
                                        'token': 'dialog token'
                                    },
                                },
                            },
                        ],
                        'separator': true,
                    },
                ],
            }
        }
    ```
    * Dialog View
    ```TypeScript
        {
            'type': IMessageType.MSTEAMS_DIALOG_OPEN,
            'message': {
                …
                'body': [
                    ...
                    {
                        'type': 'ActionSet',
                        'actions': [
                            {
                                'type': 'Action.Submit',
                                'title': 'submit',
                                'data': {
                                    'pluginId': '@zowe/zosJob',
                                    'action': {
                                        'id': 'close dialog',
                                        'token': 'dialog token'
                                    },
                                },
                            },
                        ],
                        'separator': true,
                    },
                ],
            },
        }
    ```
