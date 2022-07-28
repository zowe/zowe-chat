export interface IExplanationMap {
    explainedParentKey: string;              // parent key name in case this is map for nested child JSON object
    ignoredKeys: string;                     // comma separated list of keys whose value will be ignored
    [key: string]: string | IExplanationMap; // all explained keys of JSON object at this level and 'link' to all nested JSON objects
    // which will be explained by their explanation maps
}