# Contribution Guidelines

This document is a living summary of conventions and best practices for development within Zowe Chat Squad.

- [Contact Us](#contact-us)
- [General Guidelines](#general-guidelines)
- [Branch Naming Guidelines](#branch-naming-guidelines)
- [Code Guidelines](#code-guidelines)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Build Process Guidelines](#build-process-guidelines)
- [Documentation Guidelines](#documentation-guidelines)
- [Planning Guidelines](#planning-guidelines)

## Contact Us

Get in touch using [Zowe Chat Site](https://www.zowe.org/#chat-intro). You can find us in the [#zowe-chat](https://openmainframeproject.slack.com/archives/C03NNABMN0J) channel on Slack.

## Understanding Monorepo and project

[Zowe Chat](https://github.com/zowe/zowe-chat/blob/main/README.md) is a chatting application for you to operate z/OS itself including job, dataset, USS file, error code, console command etc. from channels of 3 popular chat tools including Mattermost, Slack, Microsoft Teams. Extendibility also is provided for users to create their own plugins to extend capabilities of Zowe Chat as plugins.

**Modules** are individual folders inside the `zowe-chat/packages` root folder. Refer to the table below for the purposes and documentation of the more important modules.

| Package Folder | Purpose                                                                                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| chat           | [Provide basic functionalities for chatting and extendability](https://github.com/zowe/zowe-chat/blob/main/packages/chat/README.md)                      |
| zos            | [Provide functionalities to manage z/OS job/data set/USS file & issue z/os command](https://github.com/zowe/zowe-chat/blob/main/packages/zos/README.md)) |
| clicmd         | [Provide functionalities to natively execute Zowe CLI commands in chat tool](https://github.com/zowe/zowe-chat/blob/main/packages/clicmd/README.md)      |
| webapp         | [One web UI app to complete authentication challenge for z/OSMF server](https://github.com/zowe/zowe-chat/blob/main/packages/webapp/README.md)           |

## General Guidelines

## Branch Guidelines

- Branch naming:
  Use the format `<description>`
  > `<description>` is a short description of the reason for the branch. Keep it short and relevant, and name in camel case without any space. E.g. `jobViewHandler`.
- Branch size

  - One feature one branch

    > The feature granularity must be kept as small as possible so as to reduce the reviewing effort. Usually your branch only cover change in single project. For example, if one feature need to change both frontend and backend part, it'd better to create two branches for the feature, one for frontend and another for backend; Another example, if you want to implement some features in a Zowe Chat plugin, but need to enhance Zowe Chat core. It'd better to create two branches for the feature, one for the plugin feature and another for Zowe Chat core enhancement.

    > Your must link to an feature issue when you submit your branch

  - One issue one branch
    > You must link to an story or task issue when you submit your branch
  - One bug fixing one branch
    > You must link to an bug issue when you fix a bug

## Code Style Guidelines

- All code styles are defined by ESLint configuration file `.eslintrc.js` under each project. Do not use other policy enforcement tools for code style rules.
- PrettierJS is used as an opinionated code formatter whose formatting rules are defined by the eslint rule set.
- The EditorConfig IDE Extension is used to simplify configuration for some of the formatting rules across IDEs.

All code contributed to Zowe-Chat must pass the linting rules defined by ESLint. To run this locally, issue `npm run lintAll` from the root of the project.

To setup your local development environment, we highly recommend the below plugin installations in VSCode. The plugins help detect code style violations, fix them, and formats code using the same resources we defined as part of the linting process. If you do not use these plugins, you may have to manually edit your code to match the ESLint rule set.

If you are using an IDE other than VSCode, you should look for similar plugins but ymmv. Please submit a list of working IDE plugins if you set up a non-VSCode environment!

- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) configures ESLint in your VSCode workspace. This displays linting intellisense, and can fix some code style errors.
- [Prettier ESLint](https://marketplace.visualstudio.com/items?itemName=rvest.vs-code-prettier-eslint) configures prettier w/ ESLint rules inside VSCode. This should be your default formatter.
- [EditorConfig](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig) to assist VSCode formatting rules.

You should also set the following VSCode settings (in settings.json, workspace or user - your choice)

```
  "editor.defaultFormatter": "rvest.vs-code-prettier-eslint",
  "editor.formatOnPaste": false, // required
  "editor.formatOnType": false, // required
  "editor.formatOnSave": true, // optional
  "editor.formatOnSaveMode": "file", // required to format on save
  "files.autoSave": "onFocusChange" // optional but recommended
```

### File Naming Guidelines

- Class file names should match class names. E.g. class `ZosJobMattermostView` would be found in a file `ZosJobMattermostView.ts`.
- Except `types/index.ts`, interface and type file names should start with the capital letter `I` and placed under `types` folder. The file name should be named by interface and type group or itself. E.g. configuration related interfaces would be found in `types/IConfig.ts`.
- Nested directories should be single lowercase words, named by feature. For example `security`, `message`, `config`.
- Keep the directory hierarchy shallow.

### Class / Interface / Type / Variable Naming Guidelines

- Class and variable name should be noun phrase in singular format and camel case.
- Interface name and type should be noun phrase in singular format and camel case and start with the capital letter `I`.
- Function name should be verb-object phrase or verb in singular format and camel case
- Class names should match files names. E.g. class `ZosJobMattermostView` would be found in a file `ZosJobMattermostView.ts`.

### Environment Variable Naming Guidelines

- Environment variables should be kept at less as possible, do not add new variables if not necessary for business
- Environment variables should be noun phrase in singular format, upper and snake case.

### Testing Guidelines

Zowe Chat uses the `jest` testing framework. In general test code should adhere to the same linting and conventions as other code in the project.

- The Zowe Chat squad uses Test-Driven-Development practices.
- All code in PRs should be covered with unit tests.
- Add integration tests where needed, particularly in areas that cannot be appropriately covered by unit tests.
- Use meaningful test names using the `given when then` pattern.
- Test files should be located in a `__tests__` in the same directory as the corresponding `src` folder. The `__tests__` folder must have the same directory structure as the `src` folder.
- Mocks should be located in a `__mocks__` folder.
- Test files should be named in the format `*.test.ts`.
- Use `describe` blocks for test grouping where possible. This makes tests more organized and readable. The `describe` block description can shorten test names.

## Build Process Guidelines

Zowe Chat uses `Gulp` for build tasks and linting. The build can be ran via `npm run buildAll`.

## Documentation Guidelines

In the future we will work against the [doc-site repository](https://github.com/zowe/docs-site) to create documentation for Zowe Chat. However, in the meantime while this project is started we will not be using the docs site.

Instead, please ensure you have appropriate documentation in a corresponding `README` file for your contribution. This can include a link to further `md` files with more details.
For squad-internal documentation, please add documentation in an appropriate folder structure within the [docs](./docs) folder.

In addition to external documentation, please appropriately comment your code for future developers who want to understand, use, and enhance your feature.

### JS Documentation

- Use jsdoc annotations such as `@static`, `@memberof`, `@returns`, `@params`, `@class`, `@exports`, `@interface`, `@types`, `@throws`, `@link`.

## Commit Guidelines

### Commit Sign Off

**Commits must be signed**. Use the `-s` flag to sign off a commit. For example `git commit -s -m"My feature"`.

The sign-off certifies the author of the commit to allow tracking of who did what.

If you forgot to sign off on a commit you can run: `git rebase --exec 'git commit --amend --no-edit --signoff' -i {commit-hash}`.

If you forgot multiple sign offs you can run: `git rebase --signoff HEAD~X` to sign off the last `X` commits.

You can set up [this DCO sign off tool](https://github.com/coderanger/dco) to automatically sign off commits.

### Commit Messages

Commits going to a master branch should stick to the Conventional Commits specification. This is a lightweight convention on the top of the commit messages.
Template:

```
<type>[optional scope]: <description>

[optional body]

[footer(s)]
```

Basic example:

```
feat(jobs): Introducing Jobs view.

This is a body, which is purely optional. One can use this section if description is not enough to provide insight.
Can also contains notes and hints. Should not be too long.

Signed-off-by: John Doe <john.doe@zowe.org>
```

### Type

- fix: patches a bug in your codebase (this correlates with PATCH in semantic versioning)
- feat: introduces a new feature to the codebase (this correlates with MINOR in semantic versioning)
- docs: affecting the documentation
- refactor: refactoring the code
- chore: cleaning in general, update dependencies

Type or scope appended with `!` has the same meaning as BREAKING CHANGE(explained in footer section). It introduces a breaking API change (correlating with MAJOR in semantic versioning). MUST be used with caution!

### Scope

Optional part of the message. Identifies a part of the codebase altered by this commit.

### Description

A description MUST immediately follow the colon and space after the type/scope prefix. The description is a short summary of the code changes, e.g., `fix: array parsing issue when multiple spaces were contained in string`.

### Body

A commit body is free-form and MAY consist of any number of newline separated paragraphs.

### Footer

- Signed-off-by: every commit needs to be signed by at least one author
- Reviewed-by: (OPTIONAL) is a plus, but not necessary
- Co-authored-by: (OPTIONAL) in case of more contributors engaged
- BREAKING CHANGE: (OPTIONAL) introduces a breaking API change (correlating with MAJOR in semantic versioning). A BREAKING CHANGE can be part of commits of any type. MUST be used with caution!

## Pull Request Guidelines

- Every pull request should have an associated issue in the [zowe-chat repository](https://github.com/zowe/zowe-chat/issues) and link to it.
- Pull request reviewers should be assigned to a [committer](https://github.com/orgs/zowe/teams/zowe-chat-committers). You can also request reviews in `#zowe-chat`.
- There must be 2 approving reviewers for a pull request to be merged.
- Use a draft pull request for work in progress that you want to build in CI/CD pipelines.
- Anyone can comment on a pull request to request a delay in merging or to get questions answered.
- Review guidelines for [how to write the perfect pull request](https://github.blog/2015-01-21-how-to-write-the-perfect-pull-request/) and [good commits](https://cbea.ms/git-commit/).
- Pull request titles should be prefixed with one of the [commit message types](#type).
- Once a pull request is approved by 2 reviewers and has passed all checks, the creator of the PR should merge it. If the creator does not have permission to merge
  to the targeted branch, a [squad committer](https://github.com/orgs/zowe/teams/zowe-chat-committers) can be requested to merge. You can also request a merge in `#zowe-chat`.

### Security Fixes

To provide long-term support (LTS) for versions in maintenance mode, any security fix must be merged to the main branch as a separate commit. This allows the security fix to be cherry-picked to maintenance versions.

## Planning Guidelines

The new issues raised in the GitHub are triaged and sized weekly in the Wednesday Squad meetings. There is an [Open Mainframe Project Zowe calendar](https://lists.openmainframeproject.org/calendar) with the squad meetings.

To get a better understanding on the complexity of different issues, we use a modified Fibonacci sequence (1, 2, 3, 5, 8, 13, 20, 40, 100) as the number of the points to size each issue.  
Here is an baseline to give a sizing for issues:

1. Find a small issue that would take about a half-day to develop and a half-day to test and validate, and call it a ‘one’ point issue.
2. Estimate every other issue relative to that ‘one’ point.
3. For every full-time developer and tester on the team, give the team 8 points in each sprint (adjust for part-timers).
4. For an issue that is larger than 8 points, we can split it into smaller issues.

### Examples of sizes

- 1: TODO link one pointer issue
- 2: TODO
- 3: TODO
- 5: TODO
- 8: TODO
