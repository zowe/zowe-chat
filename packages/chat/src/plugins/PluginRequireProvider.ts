/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import Module = require('module');
import path = require('path');
import { EnvironmentVariable } from '../settings/EnvironmentVariable';
import * as PluginErrors from './PluginErrors';

/**
 * This class will allow Zowe Chat to intercept require calls by plugins so that it can
 * provide them with the runtime instance of shared libraries.
 *
 * @example <caption>Proper Use of the Module Loader</caption>
 * // Ideally this is the first thing that gets called by your application; however,
 * // the module loader can be created and destroyed at any point by your application.
 *
 * // Initializing the loader
 * PluginRequireProvider.createPluginHooks(["module-a", "module-b"]);
 *
 * // Now in all places of the application, module-a and module-b will be loaded
 * // from the package location of process.mainModule (I.E the Host Package).
 *
 * // So this will always be the Host Package's "module-a" regardless of where it was
 * // called from.
 * require("module-a");
 *
 * // But this will act as normal
 * require("module-c");
 *
 * // It is not necessary to cleanup the module loader before exiting. You
 * // may remove hooks as part of your application code if it makes sense within the
 * // context of your application.
 *
 * // Calling this
 * PluginRequireProvider.destroyPluginHooks();
 *
 * // Will now cause this to act as normal regardless of how it would have been
 * // injected before.
 * require("module-b");
 *
 */
export class PluginRequireProvider {
  /**
   * Create hooks for the specified modules to be injected at runtime.
   *
   * @param modules An array of modules to inject from the host application.
   *
   * @throws {PluginRequireAlreadyCreatedError} when hooks have already been added.
   */
  public static createPluginHooks(modules: string[]) {
    if (PluginRequireProvider.mInstance != null) {
      throw new PluginErrors.PluginRequireAlreadyCreatedError();
    }

    this.mInstance = new PluginRequireProvider(modules);
  }

  /**
   * Restore the default node require hook.
   *
   * @throws {PluginRequireNotCreatedError} when hooks haven't been added.
   */
  public static destroyPluginHooks() {
    if (PluginRequireProvider.mInstance == null) {
      throw new PluginErrors.PluginRequireNotCreatedError();
    }

    // Set everything back to normal
    Module.prototype.require = PluginRequireProvider.mInstance.origRequire;
    PluginRequireProvider.mInstance = undefined;
  }

  /**
   * Reference to the static singleton instance.
   */
  private static mInstance: PluginRequireProvider;

  /**
   * This regular expression is used by the module loader to
   * escape any valid characters that might be present in provided
   * modules.
   */
  private static sanitizeExpression(module: string) {
    /*
     * This replaces special characters that might be present in a regular expression and an
     * npm package name.
     *
     * @see https://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
     */
    return module.replace(/\./g, '\\$&');
  }

  /**
   * Reference to the original require function.
   */
  private origRequire: typeof Module.prototype.require;

  /**
   * Reference to the regular expression used to match modules.
   *
   * This property was added to make testing easier.
   */
  private readonly regex: RegExp;

  /**
   * Construct the class and create hooks into require.
   * @param modules The modules that should be injected from the runtime instance
   */
  private constructor(private readonly modules: string[]) {
    const hostPackageName = '@zowe/chat';
    const hostPackageRoot = EnvironmentVariable.ZOWE_CHAT_HOME + path.sep + 'zoweChat';

    // We must remember to escape periods from modules for regular expression
    // purposes.
    const internalModules: string[] = [];

    for (const module of this.modules) {
      internalModules.push(PluginRequireProvider.sanitizeExpression(module));
    }

    /*
     * Check that the element (or module that we inject) is present at position 0.
     * It was designed this way to support submodule imports.
     *
     * Example:
     * If modules = ["@zowe/chat"]
     *    request = "@zowe/chat/lib/errors"
     */
    // This regular expression will match /(@zowe\/chat)/.*/
    /*
     * The ?: check after the group in the regular expression is to explicitly
     * require that a submodule import has to match. This is to account for the
     * case where one of the packages to be injected is some-test-module and
     * we are requiring some-test-module-from-npm. Without the slash, that
     * module is incorrectly matched and injected.
     */
    const regex = (this.regex = new RegExp(`^(${internalModules.join('|')})(?:\\/.*)?$`, 'gm'));
    const origRequire = (this.origRequire = Module.prototype.require);

    // Must be a function (no () => {} allowed), so it can be used as a constructor.
    Module.prototype.require = function PluginModuleLoader(...args: any[]) {
      // Check to see if the module should be injected
      const request: string = args[0];
      const doesUseOverrides = request.match(regex);

      if (doesUseOverrides) {
        // Next we need to check if this is the root module. If so, then
        // we need to remap the import.
        if (request.startsWith(hostPackageName)) {
          if (request === hostPackageName) {
            args[0] = '.' + path.sep;
          } else {
            args[0] = `${hostPackageRoot}${path.sep}${request.substring(hostPackageName.length)}`;
          }
        }

        // Inject it from the main module dependencies (@zowe/chat's modules)
        return origRequire.apply(process.mainModule, args);
      } else {
        // Otherwise use the package's dependencies
        return origRequire.apply(this, args);
      }
    } as typeof Module.prototype.require;
  }
}
