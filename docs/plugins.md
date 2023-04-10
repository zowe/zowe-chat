# Developing Plugins for Zowe Chat

This document is a living summary of conventions for developing plug-ins for Zowe Chat. Plug-ins are extended commands and functionalities installed within an existing Zowe Chat server deployment. This project contains a set of core plugins which provide basic commands for interacting with the mainframe and will always be available as part of a Zowe Chat deployment. They can also be viewed as reference material for developing your own Zowe Chat plugins.

- [Peer Dependencies](#peer-dependencies)

## Peer Dependencies

Zowe Chat uses a few core NPM modules which can be reused by plugins without installing their own copy of the modules. These modules are:

- `@zowe/chat`
  - The core zowe chat server runtime. This must be declared as a peer dependency in a plugin project.
- `@zowe/bot`
  - The framework which negotiates sending and processing messages from Chat Applications. This must be declared as a peer dependency.
- `@zowe/imperative`
  - Zowe's Imperative framework, which contains key functions for interacting with Zowe CLI and CLI-related capabilities. Optional peer dependency.
- `i18next`
  - The i18n and l10n library used by Zowe Chat. Optional peer dependency.

If you declare any of these dependencies as a peer dependency, Zowe Chat will take care of dynamically linking you to the proper library at runtime. To see exactly which versions of the libraries are in use, check the [package.jso](../packages/chat/package.json).
