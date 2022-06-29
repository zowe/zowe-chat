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

Get in touch using [Zowe Communication Channels](https://github.com/zowe/community/blob/master/README.md#communication-channels). You can find us in the `#zowe-chat` channel on Slack.

## Understanding Modules

**Modules** are individual folders inside the `zowe-chat` root folder. Refer to the table below for the purposes and documentation of the more important modules.

| Package Folder                           | Purpose                                                                     |
|------------------------------------------|-----------------------------------------------------------------------------|
| common-bot-framework                     | [Common functionality for chat bots and chat services](./README.md)         |

## General Guidelines

## Branch Naming Guidelines

Use the format `{contributor-tag}/{issue-tag}/{description}`, where:

* `{contributor-tag}` is your Github handle. E.g. `CarsonCook`. If you are working on behalf of the Zowe Chat squad, use `squad` instead.
* `{issue-tag}` is `GH` followed by the Github issue number. E.g. `GH1234`. If there is no related Github issue this section can be left out.
* `{description}` is a short description of the reason for the branch. Keep it short and relevant, and use `-` instead of spaces. E.g. `job-view-handler`.

Example as an outside contributor: `CarsonCook/GH1234/job-view-handler`.
Example for a squad contribution: `squad/GH1234/job-view-handler`.

## Code Guidelines

* Indent code with 4 spaces.
* Lint rules are enforced through the [build process](#build-process-guidelines).
* Use the provided [tsconfig.json](./tsconfig.json) file.
* TODO editor config files

 ### File Naming Guidelines

 * Class names should match files names. E.g. class `JobSubmission` would be found in a file `JobSubmission.ts`.
 * Interface names should match file names and should start with the capital letter `I`. E.g. interfacd `IJobSubmissionParms` would be found in `IJobSubmissionParms.ts`.
 * Nested directories should be single lowercase words, named by feature. For example `security`, `message`, `config`.
 * Keep the directory hierarchy shallow.

 ### Testing Guidelines

Zowe Chat uses the jest testing framework. In general test code should adhere to the same linting and conventions as other code in the project.

 * The Zowe Chat squad uses Test-Driven-Development practices.
 * All code in PRs should be covered with unit tests.
 * Add integration tests where needed, particularly in areas that cannot be appropriately covered by unit tests.
 * Use meaningful test names using the `given when then` pattern.
 * Test files should be located in a `__tests__` in the same directory as the corresponding `src` folder. The `__tests__` folder must have the same directory structure as the `src` folder.
 * Mocks should be located in a `__mocks__` folder.
 * Test files should be named in the format `*.test.ts`.
 * Use `describe` blocks for test grouping where possible. This makes tests more organized and readable. The `describe` block description can shorten test names.

## Build Process Guidelines

Zowe Chat uses Gulp for build tasks and linting. The build can be ran via `npm run build`.

## Documentation Guidelines

In the future we will work against the [doc-site repository](https://github.com/zowe/docs-site) to create documentation for Zowe Chat. However, in the meantime while this project is started we will not be using the docs site.

Instead, please ensure you have appropriate documentation in a corresponding `README` file for your contribution. This can include a link to further `md` files with more details.
For squad-internal documentation, please add documentation in an appropriate folder structure within the [docs](./docs) folder.

In addition to external documentation, please appropriately comment your code for future developers who want to understand, use, and enhance your feature.

### JS Documentation

* Use jsdoc annotations such as `@static`, `@memberof`, `@returns`, `@params`, `@class`, `@exports`, `@interface`, `@types`, `@throws`, `@link`.

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

* Every pull request should have an associated issue in the [zowe-chat repository](https://github.com/zowe/zowe-chat/issues) and link to it.
* Pull request reviewers should be assigned to a [committer](https://github.com/orgs/zowe/teams/zowe-chat-committers). You can also request reviews in `#zowe-chat`.
* There must be 2 approving reviewers for a pull request to be merged.
* Use a draft pull request for work in progress that you want to build in CI/CD pipelines.
* Anyone can comment on a pull request to request a delay in merging or to get questions answered.
* Review guidelines for [how to write the perfect pull request](https://github.blog/2015-01-21-how-to-write-the-perfect-pull-request/) and [good commits](https://cbea.ms/git-commit/).
* Pull request titles should be prefixed with one of the [commit message types](#type).
* Once a pull request is approved by 2 reviewers and has passed all checks, the creator of the PR should merge it. If the creator does not have permission to merge
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
* 1: TODO link one pointer issue
* 2: TODO
* 3: TODO
* 5: TODO
* 8: TODO
