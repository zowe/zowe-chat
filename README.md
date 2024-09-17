# Zowe Chat

[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/zowe/zowe-chat/badge)](https://api.securityscorecards.dev/projects/github.com/zowe/zowe-chat)
[![Zowe Chat CI Build](https://github.com/zowe/zowe-chat/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/zowe/zowe-chat/actions/workflows/ci.yml)

Zowe Chat is a chatting application for you to operate z/OS itself including job, dataset, USS file, error code, console command etc. from channels of 3 popular chat tools including Mattermost, Slack, Microsoft Teams. Extendibility also is provided for users to create their own plugins to extend capabilities of Zowe Chat as plugins.

## Content

- [Features](#features)
- [Projects](#projects)
- [Documentation](#documentation)
- [Contribution guidelines](#contribution-guidelines)
- [Steps to build Zowe Chat](#steps-to-build-zowe-chat)
- [Steps to run Zowe Chat server](#steps-to-run-zowe-chat-server)

## Features

- Operate z/OS job
- Operate z/OS dataset
- Operate z/OS USS file
- Query z/OS error code
- Issue z/OS console command
- Extendibility with plugin

## Projects

There are four projects below under Zowe Chat repository.

- [@zowe/chat](https://github.com/zowe/zowe-chat/blob/main/packages/chat/README.md)
- [@zowe/zos](https://github.com/zowe/zowe-chat/blob/main/packages/zos/README.md)
- [@zowe/clicmd](https://github.com/zowe/zowe-chat/blob/main/packages/clicmd/README.md)
- [@zowe/webapp](https://github.com/zowe/zowe-chat/blob/main/packages/webapp/README.md)

## Documentation

For detailed information about how to install, configure, and use Zowe Chat, see [Zowe Chat Documentation](https://TBD/).

## Contribution guidelines

The following information is critical to working with the code, running/writing/maintaining automated tests, developing consistent syntax in your plug-in, and ensuring that your plug-in integrates with Zowe CLI properly:

| For more information about ...                                        | See:                                                                                                   |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| General guidelines that apply to contributing to Zowe Chat            | [Contribution Guidelines](./CONTRIBUTING.md)                                                           |
| Documentation that describes the features of the Common Bot Framework | [About Common Bot Framework](https://github.com/zowe/zowe-chat/blob/main/packages/commonbot/README.md) |

## Steps to build Zowe Chat

- Environment variables

  - NODE_ENV

    Specifies the building environment for your mono-repo

  - RELEASE_TYPE

    Specifies the release type of your building result

  - RELEASE_VERSION

    Specifies the release version of your building result

- Build steps
  - Clone the repo
  - Go to the directory where Zowe Chat repo is cloned
  - Run the command below to build the whole workspaces
    ```sh
    npm run installAll
    npm run buildAll
    ```
    > **Note:** You can also to build single project by specifying the detailed project name. e.g. use the command `npm run build --workspace=@zowe/chat` to build only `chat` project.

## Steps to run Zowe Chat server

- **Prerequisite:** the connection with your chat tool and related bot app are ready
- **Run from local laptop for development**

  > **Note:** Depending on chat tool requirement and your laptop network environment, not all chat clients will work when running the project locally (i.e. MSTeams)

  - Execute `npm run buildAll` to build all projects
  - Execute `npm run startLocal` to set up a local environment in the folder `$PROJECT_ROOT/.build` based on the previous build result
    > **Note:** This will fail on first invocation.
  - Configure your local environment in the `$PROJECT_ROOT/.build/zoweChat/config` folder
  - Re-execute `npm run startLocal` command to start Zowe Chat server locally
    > **Note:** This will not over-write changes to your configuration
  - Launch your chat tool client and chat with your bot

- **Run from your xLinux or zLinux server for production**
  - Execute `npm run packagingAll` to build and package the project
    > **Note:** Your must set the three required environment variables (`NODE_ENV`, `RELEASE_TYPE`, `RELEASE_VERSION`) for packaging first
  - Upload your building result `$PROJECT_ROOT/release/zowe-chat-v<version>-.tar.gz` to your Linux server
  - Logon your Linux server, create one folder and unpack the building result there
  - Set and update required environment variables
    ```sh
     export ZOWE_CHAT_HOME=<your created folder>/zoweChat
     export ZOWE_CHAT_PLUGIN_HOME=<your created folder>/plugins
     export PATH=$PATH:$ZOWE_CHAT_HOME/bin
    ```
  - Update the plugin configuration file `$ZOWE_CHAT_PLUGIN_HOME/plugin.yaml` if necessary
  - Update Zowe Chat, chat tool and z/OSMF server configuration per your environment
    ```sh
    $ZOWE_CHAT_HOME/config/chatServer.yaml
    $ZOWE_CHAT_HOME/config/zosmfServer.yaml
    $ZOWE_CHAT_HOME/config/chatTools/<mattermost | msteams | slack>.yaml
    ```
  - Execute `chatsvr start` to start your Zowe Chat server
    - `chatsvr status` - Check your Zowe Chat server status
    - `chatsvr stop` - Stop your Zowe Chat server
    - `chatsvr restart` - Restart your Zowe Chat server
  - Launch your chat tool client and chat with your bot

<p>Hosting infrastructure for this project is supported by:</p>
<p>
  <a href="https://www.digitalocean.com/?refcode=77a4454d32a1&utm_campaign=Referral_Invite&utm_medium=Referral_Program&utm_source=badge">
    <img src="https://opensource.nyc3.cdn.digitaloceanspaces.com/attribution/assets/SVG/DO_Logo_horizontal_blue.svg" width="201px">
  </a>
</p>
