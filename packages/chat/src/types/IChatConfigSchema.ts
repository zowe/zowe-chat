/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/


/**
 * The complete schema for configuration managed through Chat's admin interface.
 */
export interface IChatConfigSchema {

    /**
     * Individual sections, or blocks, within the broader schema. For example, there may be one configuration block per Zowe Chat plugin.
     */
    sections: IConfigBlockDefinition[];
}

/**
 * The JSON Validation schema for your profile type.
 * Use this to describe the expected structure and contents of your profile,
 * as well as provide option definitions for create & update profile commands
 */
export interface IConfigBlockDefinition {

    /**
     * Key to be used as the block's key entry in a configuration map. i.e., "myConfigurationArea"
     */
    key: string;
    /**
     * A short, descriptive title of your configuration
     */
    title: string;
    /**
     * A description of your configuration's behaviors
     */
    description: string;
    /**
     * Specify "object". This is not the type name
     * of the profile, but rather a description of the type of data structure (e.g. string,
     * array). Your profile will be an object with one or more properties.
     */
    type: string;
    /**
     * These are the properties of your profile object. If your profile deals with
     * information about bananas, some properties might be "color", "sweetness",
     * and "origin" of type "string". For each one, you can provide an Imperative
     * option definition (The same format as your normal command option definitions)
     * which will be used for auto-generating profile commands.
     */
    properties: {
        /**
         * General mapping of property name to an IProfileProperty object.
         */
        [key: string]: IConfigProperty,
    };

    /**
     * Any other advanced options available from the JSON schema specification
     * http://json-schema.org/latest/json-schema-validation.html
     */
    [key: string]: any;
}

/**
 * A single field in a profile schema which can be serialized to a profile file
 */
export interface IConfigProperty {
    /**
     * See ICommandProfileProperty.ts for how to include option definitions
     * on your schema for auto-generated commands
     */
    type: string | string[];

    /**
     * A description of your the properties behaviors and intended function
     */
    description: string;
    /**
     *  Default value for the property
     */
    default?: any;

    /**
     *  Configuration options for this property, as opposed to user input.
     */
    options?: IConfigPropertyOption[];

    /**
     *  Callback to execute when the property is set or updated. Returns true if the new value is valid and accepted, false otherwise.
     *  If no callback is provided, the property will be set to the new value.
     */
    onChange?: (oldValue: any, newValue: any) => boolean;

    /**
     * Nested properties e.g. banana.origin.zipcode, banana.origin.country
     */
    properties?: {
        /**
         * General mapping of property name to an IProfileProperty object.
         */
        [key: string]: IConfigProperty,
    };

    /**
     * Indicates if the given property should be securely stored
     */
    // TODO: secure storage of config information with AES?
    // secure?: boolean;
}

/**
 * An option that can be set as a potential value for a given configuration property, as opposed to arbitrary user input
 */
export interface IConfigPropertyOption {

    /**
     * A description of what this value does
     */
    description: string;

    /**
     * The value itself
     */
    value: any;

    /**
     * Sub-properties within this value. It is recommended to avoid using this capability.
     */
    properties?: IConfigProperty;

}
