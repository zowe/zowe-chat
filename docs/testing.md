# Testing Guidelines

Zowe Chat uses the [jest](https://jestjs.io/) testing framework. The jest test configuration is centralized in the root `jest.config.ts` file ([see here](../jest.config.ts)).

In general, tests should adhere to same lint rules and conventions as other code within the project.

## Test Locations

There are multiple folders in the project that are used for testing purposes. Folders used for testing will have the syntax of `__folder-name__` making them easier to find.

At the root of the project there are currently 2 main folders:

- The [\_\_tests\_\_](../__tests__) folder contains:
  - Test utilities
  - Resources for tests
  - Results of tests
- The [\_\_mocks\_\_](../__mocks__) folder:
  - Defined by the [jest] framework as a place where entire `node_modules` can be mocked.

The actual test source will be found under each package's `__tests__` directory. Every package must have a single `__tests__` directory as a sibling folder to the package's `src` folder.

## Test Structure

This section covers common guidelines for unit, integration, and system testing.


## Unit Testing

Here are some rules to keep in mind for unit testing:

- For every new TypeScript file that introduces a piece of functionality, create a corresponding unit test.
  - All unit test files should end with `.unit.test.ts` for test filtering purposes. Any unit test that doesn't end in this exact syntax will not be run in the CI/CD environment.
  - A package's `__tests__` folder should have the exact same directory structure as the `src` folder. (example: if you have `src/folder/another-folder`, then you should have `__tests__/folder/another-folder`)
  - With the 2 above things in mind, if there is a class under `src/folder/SomeClass.ts`, the corresponding unit test would be under `__tests__/folder/__unit__/SomeClass.test.ts`.
- Mocking should take place of any IO, network calls, or other calls to an outside component to isolate testing of the class that you're testing. If mocking is not feasible, highly complex, or otherwise time consuming - then those tests should be written as integration or system tests instead.
- Jest snapshots can be used as long as tests are deterministic.
- For abstract classes (where necessary, some abstracts have "base" implementations that will suffice for unit testing), create a `__model__` directory under `__tests__` directory and create a test implementation of the abstract class.

## Integration Tests

The intent of integration tests is to test multi-module functionality without relying on specific system configurations or integrations with third party systems. For Zowe Chat, this eliminates any test which requires a 3rd party Chat Tool or a system backend, unless a subset of the functionality is mocked. Similar to unit tests, if mocking said external integrations is complex or time intensive it is instead recommended to write a system test instead.

### Integration Test Layout
- Place integration tests directly under the `__tests__` directory, as they are frequently scoped inter-module or inter-package. If there is a primary class under test `src/folder/SomeClass.ts`, the corresponding integration test would be under `__tests__/__integration__/SomeClass.test.ts`.

## System Tests

The intent of system tests are to test the software under "real-world" scenarios. Meaning, system tests can/should manipulate the file-system, invoke remote services, etc. as the commands & APIs normally would. 

**TODO** System test guidelines for Zowe Chat

### System Test Layout
- Place system tests directly under the `__tests__` directory, as they are frequently scoped inter-module or inter-package. If there is a primary class under test `src/folder/SomeClass.ts`, the corresponding integration test would be under `__tests__/__system__/SomeClass.test.ts`.
  