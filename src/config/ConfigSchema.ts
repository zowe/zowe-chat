/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*
*/

// Lifted from zowe/imperative ConfigSchema.ts

import * as lodash from "lodash";
import { IConfigBlockDefinition } from "./doc/IConfigBlockDefinition";
import { IConfigProperty } from "./doc/IConfigProperty";
import { IConfigSchema } from "./doc/IConfigSchema";
import { IExplanationMap } from "./doc/IExplanationMap";
import { JsonSchema } from "./doc/JsonSchema";

export class ConfigSchema {
    /**
     * JSON schema URI stored in $schema property of the schema
     * @readonly
     * @memberof ConfigSchema
     */
    private static readonly JSON_SCHEMA = "https://json-schema.org/draft/2020-12/schema";

    /**
     * Version number stored in $version property of the schema
     * @readonly
     * @memberof ConfigSchema
     */
    private static readonly SCHEMA_VERSION = "1.0";

    /**
     * Pretty explanation of the schema objects
     * @readonly
     * @memberof ConfigSchema
     */
    private static readonly explainSchemaSummary: IExplanationMap = {
        $schema: "URL",
        $version: "Version",
        properties: {
            defaults: "Default Definitions",
            explainedParentKey: "Properties",
            ignoredKeys: null
        },
        explainedParentKey: "Schema",
        ignoredKeys: null
    };

    /**
     * Transform an Zowe ChatBot profile schema to a JSON schema. Removes any
     * non-JSON-schema properties and translates anything useful.
     * @param schema The base Zowe Chatbot config schema
     * @returns JSON schema for profile properties
     */
    private static generateSchema(schema: IConfigSchema): any {

        let fullSchema: any = {}

        for (let configBlock of schema.sections) {
            const properties: { [key: string]: any } = {};
            for (const [k, v] of Object.entries(configBlock.properties || {})) {
                properties[k] = { type: v.type };
                const cmdProp = v as IConfigProperty;
                if (cmdProp.default != null) {
                    properties[k].default = cmdProp.default;

                    /* properties[k].description = cmdProp.optionDefinition.description;
                     if (cmdProp.optionDefinition.defaultValue != null) {
                     }
                     if (cmdProp.optionDefinition.allowableValues != null) {
                         properties[k].enum = cmdProp.optionDefinition.allowableValues.values;
                     }*/
                }

            }

            const propertiesSchema: any = {
                type: configBlock.type,
                title: configBlock.title,
                description: configBlock.description,
                properties
            };

            fullSchema[configBlock.name] = propertiesSchema;
            /*    if (schema.required) {
                    propertiesSchema.required = schema.required;
                }*/
        }


        return { properties: fullSchema };

    }

    /**
     * Dynamically builds the config schema for this application.
     * @param profiles The extensions supported by this CLI
     * @returns JSON schema for all supported profile types
     */
    public static buildSchema(baseSchemas: IConfigSchema): JsonSchema {
        const andEntries: any[] = [];
        const defaultProperties: { [key: string]: any } = {};
        baseSchemas.sections.forEach((section: { type: string, schema: IConfigBlockDefinition }) => {
            andEntries.push({
                if: {
                    properties: {
                        type: { const: profile.type }
                    }
                },
                then: {
                    properties: this.generateSchema(profile.schema)
                }
            });
            defaultProperties[profile.type] = {
                description: `Default ${profile.type} profile`,
                type: "string"
            };
        });
        return {
            $schema: ConfigSchema.JSON_SCHEMA,
            $version: ConfigSchema.SCHEMA_VERSION,
            type: "object",
            description: "Zowe ChatBot Configuration",
            properties: {
                sections: {
                    type: "object",
                    description: "Mapping of profile names to profile configurations",
                    patternProperties: {
                        "^\\S*$": {
                            type: "object",
                            description: "Profile configuration object",
                            properties: {
                                type: {
                                    description: "Profile type",
                                    type: "string",
                                    enum: Object.keys(defaultProperties)
                                },
                                properties: {
                                    description: "Profile properties object",
                                    type: "object"
                                },
                                profiles: {
                                    description: "Optional subprofile configurations",
                                    type: "object",
                                    $ref: "#/properties/profiles"
                                },
                                secure: {
                                    description: "Secure property names",
                                    type: "array",
                                    items: { type: "string" },
                                    uniqueItems: true
                                }
                            },
                            allOf: [
                                {
                                    if: {
                                        properties: { type: false }
                                    },
                                    then: {
                                        properties: {
                                            properties: { title: "Missing profile type" }
                                        }
                                    }
                                },
                                ...andEntries
                            ]
                        }
                    }
                },
                defaults: {
                    type: "object",
                    description: "Mapping of profile types to default profile names",
                    properties: defaultProperties
                },
                autoStore: {
                    type: "boolean",
                    description: "If true, values you enter when prompted are stored for future use"
                },
                // plugins: {
                //     description: "CLI plug-in names to load from node_modules (experimental)",
                //     type: "array",
                //     items: { type: "string" },
                //     uniqueItems: true
                // }
            }
        };
    }

    /**
     * Loads Imperative profile schema objects from a schema JSON file.
     * @param schema The schema JSON for config
     */
    public static loadSchema(schema: JsonSchema): IConfigSchema {
        const patternName = Object.keys(schema.properties.profiles.patternProperties)[0];
        const profileSchemas: IConfigSchema = [];
        for (const obj of schema.properties.profiles.patternProperties[patternName].allOf) {
            if (obj.if.properties.type) {
                profileSchemas.push({
                    type: obj.if.properties.type.const,
                    schema: this.parseSchema(obj.then.properties)
                });
            }
        }
        return profileSchemas;
    }

    /**
     * Find the type of a property based on schema info.
     * @param path Path to JSON property in config JSON
     * @param config Team config properties
     * @param schema Config schema definition. Defaults to profile schemas defined in Imperative config.
     */
    public static findPropertyType(path: string, config: IConfig, schema?: IConfigSchema): string | undefined {
        if (!path.includes(".properties.")) {
            return;
        }

        const pathSegments = path.split(".");
        const propertyName = pathSegments.pop();
        const profilePath = pathSegments.slice(0, -1).join(".");
        const profileType: string = lodash.get(config, `${profilePath}.type`);
        if (profileType == null) {
            return;
        }

        const profileSchemas = schema ? this.loadSchema(schema) : ImperativeConfig.instance.loadedConfig.profiles;
        const profileSchema = profileSchemas.find(p => p.type === profileType)?.schema;
        if (profileSchema?.properties[propertyName] == null) {
            return;
        }

        // TODO How to handle profile property with multiple types
        const propertyType = profileSchema.properties[propertyName].type;
        return Array.isArray(propertyType) ? propertyType[0] : propertyType;
    }
}
