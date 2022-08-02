# Zowe Chat Core

Zowe Chat Core component provides basic functionalities for chatting and two abstract listeners (MessageListener and EventListener) for users to create their own plugins to extend capabilities of Zowe Chat as plugins.

## Content
- [Zowe Chat Core](#zowe-chat-core)
  - [Content](#content)
  - [Features](#features)
  - [Environment variables](#environment-variables)
  - [Steps to create one plugin](#steps-to-create-one-plugin)

## Features
* Provide basic functionalities for chatting
  * Configuration
  * Logging
  * Utility 
* Support extendibility via two abstract listeners below 
  * MessageListener
  * EventListener
* Load plugins dynamically from ZOWE_CHAT_PLUGIN_HOME

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
1. Create one NPM project
2. Implement two interfaces IMessageListener and IEventListener
   Note:  There is no need to implement IEventListener interface if you don't have any interactivity component in your bot response.
  * IMessageListener
  ```TypeScript
    class YourMessageListener implements IMessageListener {
        private logger: Logger;

        constructor(logger: Logger) {
            this.logger = logger;

            this.matchMessage = this.matchMessage.bind(this);
            this.processMessage = this.processMessage.bind(this);
        }

        // Match inbound message
        matchMessage(chatContextData: IChatContextData): boolean {
            // Print start log
            this.logger.start(this.matchMessage, this);

            // Match message
            try {
                // TODO: Add your message filter here

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
  * IEventListener
  ```TypeScript
    class YourEventListener implements IEventListener {
        private logger: Logger;

        constructor(logger: Logger) {
            this.logger = logger;

            this.matchEvent = this.matchEvent.bind(this);
            this.processEvent = this.processEvent.bind(this);
        }

        // Process inbound event
        matchEvent(chatContextData: IChatContextData): boolean {
            // Print start log
            this.logger.start(this.matchEvent, this);

            // Match event
            try {
                // TODO: Add your event filter here

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
  3. Add your plugin description to `plugin.yaml`
  ```YAML
    - package: "@zowe/YourPlugin"
      registry: https://registry.npmjs.org/
      version: Your Plugin Version
      priority: Your Plugin Priority
      listeners:
        - YourMessageListener
        - YourEventListener
  ```
