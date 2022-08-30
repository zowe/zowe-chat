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
    //TODO: secure storage of config information with AES?
    // secure?: boolean;
}

export interface IConfigPropertyOption {

    description: string;

    value: any;

    // Nested properties specific to configuration options.
    properties?: IConfigProperty

}