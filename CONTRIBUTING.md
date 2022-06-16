# Contribution Guidelines
This document is a living summary of conventions and best practices for development within Zowe Chat Squad.

  - [Contact Us](#contact-us)
  - [General Guidelines](#general-guidelines)
  - [Branch Naming Guidelines](#branch-naming-guidelines)
  - [File Naming Guidelines](#file-naming-guidelines)
  - [Code Guidelines](#code-guidelines)
  - [Pull Requests](#pull-requests)
  - [Testing Guidelines](#testing-guidelines)
  - [Build Process Guidelines](#build-process-guidelines)
  - [Documentation Guidelines](#documentation-guidelines)
  - [Planning guidelines](#Planning-guidelines)
 
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

## File Naming Guidelines

## Code Guidelines

## Commit Message Guidelines

Commits going to a master branch should stick to the Conventional Commits specification. This is a lightweight convention on the top of the commit messages. 
Template:
```
<type>[optional scope]: <description>

[optional body]

[footer(s)]
```
Basic example:
```
feat(authentication): Introducing x509 as a form of authentication

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
Optional part of the message. Identifies a part of the codebase altered byt this commit. Examples could be: authentication, Discovery service, ...

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
* Pull request reviewers should be assigned to a squad member or requested for review in `#zowe-chat`.
* Use a draft pull request for work in progress that you want to build in CI/CD pipelines.
* Anyone can comment on a pull request to request a delay in merging or to get questions answered.
* Review guidelines for [how to write the perfect pull request](https://github.blog/2015-01-21-how-to-write-the-perfect-pull-request/) and [good commits](https://cbea.ms/git-commit/).

### Security Fixes

To provide long-term support (LTS) for versions in maintenance mode, any security fix must be merged to the main branch as a separate commit. This allows the security fix to be cherry-picked to maintenance versions.

## Testing Guidelines

## Build Process Guidelines

## Documentation Guidelines

## Planning guidelines

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