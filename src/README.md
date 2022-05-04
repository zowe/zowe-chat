# Common Bot Framework

The Common Bot Framework is a NPM library, which provides uniform interfaces for your products to enable chat functionality. The library supports three major chat platforms: Microsoft Teams, Slack and Mattermost.

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
* Logger
* Messaging App
* Bot APIs
  * listen(matcher, handler)
  * route(basePath, handler)
  * send(message)
* Chat context data
  * Context data for chatting, including message, bot, user / channel / team / tenant information
  * Context data specific for different chat platforms
## Environment variables
* COMMONBOT_LOG_FILE

  Specifies the log file of your Common Bot Framework. The default value is $ZCHATOPS_HOME/node_modules/commonbot/logs/common-bot.log.
* COMMONBOT_LOG_LEVEL

  Specifies the level of logs. The value can be error, warn, info, verbose, debug, or silly. The default value is info.
* COMMONBOT_LOG_MAX_SIZE

  Specifies the maximum size of the file after which the log will rotate. The value can be a number of bytes without any unit or a number with the suffix k, m, or g as units for KB, MB, or GB separately. The default value is null, which means that the file size is unlimited except the operating system limit.

* COMMONBOT_LOG_MAX_FILES
  Specifies the maximum file number of logs to keep. The default value is null, which means all the log files will be kept and no logs will be removed.
