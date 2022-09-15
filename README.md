# Zowe Chat

Zowe Chat is a chatting application for you to operate z/OS itself including job, dataset, USS file, error code, console command etc. from channels of 3 popular chat tools including Mattermost, Slack, Microsoft Teams. Extendibility also is provided for users to create their own plugins to extend capabilities of Zowe Chat as plugins.

## Content
  - [Features](#features)
  - [Projects](#projects)
  - [Documentation](#documentation)
  - [Contribution guidelines](#contribution-guidelines)
  - [Environment variables](#environment-variables)
  - [Steps to build Zowe Chat](#steps-to-build-zowe-chat)
  - [Steps to run Zowe Chat server](#steps-to-run-zowe-chat-server)


## Features
* Operate z/OS job
* Operate z/OS dataset
* Operate z/OS USS file
* Query z/OS error code
* Issue z/OS console command
* Extendibility with plugin
  
## Projects
There four projects below are under Zowe Chat repository.
* @zowe/commonbot
* @zowe/chat
* @zowe/zos
* @zowe/clicmd

## Documentation

For detailed information about how to install, configure, and use Zowe Chat, see [Zowe Chat Documentation](https://TBD/). 

## Contribution guidelines
The following information is critical to working with the code, running/writing/maintaining automated tests, developing consistent syntax in your plug-in, and ensuring that your plug-in integrates with Zowe CLI properly:

| For more information about ... | See: |
| ------------------------------ | ----- |
| General guidelines that apply to contributing to Zowe Chat | [Contribution Guidelines](./CONTRIBUTING.md) |
| Documentation that describes the features of the Common Bot Framework | [About Common Bot Framework](https://github.com/zowe/zowe-chat/blob/main/packages/commonbot/README.md) |

## Steps to build Zowe Chat
### Environment variables
* NODE_ENV

  Specifies the building environment for your mono-repo

* RELEASE_TYPE

  Specifies the release type of your building result

* RELEASE_VERSION

  Specifies the release version of your building result

### Build steps
* Clone the repo
* Go to the directory where Zowe Chat repo is cloned
* Run the command below to build the whole workspaces
  ```Shell
     npm install
     npm run build --workspaces
  ```
  **Note:** You can also to build single project by specifying the detailed project name. e.g. use the command `npm run build --workspace=@zowe/chat` to build only `chat` project.

## Steps to run Zowe Chat server
* **Prerequisite:** the connection with your chat tool and related bot app are ready
* Deploy Zowe Chat core
  * Create one folder for `ZOWE_CHAT_HOME`
  * Upload your build result of `@zowe/commonbot` and `@zowe/chat` packages to `ZOWE_CHAT_HOME`
  * `cd ${ZOWE_CHAT_HOME}`
  * `npm install ${ZOWE_CHAT_HOME}/yourCommonBotLib`
  * Double confirm all configuration under `ZOWE_CHAT_HOME/config` are correct
  * Start Zowe Chat Server using the command `node index.js`
* Deploy Zowe Chat plugins
  * Create one folder for `ZOWE_CHAT_PLUGIN_HOME`
  * Upload your plugin build result of `@zowe/zos` and `@zowe/clicmd` packages to `ZOWE_CHAT_PLUGIN_HOME/@zowe/`
  * Update the plugin configuration file `ZOWE_CHAT_PLUGIN_HOME/plugin.yaml`
  * Link `@zowe/chat` library
    * Go to each directory of Zowe Chat plugin
    * Run the command `npm link ZOWE_CHAT_PLUGIN_HOME` to link `@zowe/chat` library
    * Run the command `npm link ZOWE_CHAT_PLUGIN_HOME/node_modules/i18next` to link `i18next` library
  **Note:** you must restart Zowe Chat server to make sure your changes to plugin work

