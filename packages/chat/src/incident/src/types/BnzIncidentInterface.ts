/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

/* eslint-disable no-unused-vars */
export const enum IIncidentLinkCategory {
    IMAGE = 'image',
    WEBPAGE = 'webpage',
}

export const enum IIncidentPriority {
    HIGH = 'high',
    MEDIUM = 'medium',
    LOW = 'low',
}

export const enum IIncidentSeverity {
    FATAL = 'fatal',
    CRITICAL = 'critical',
    MAJOR = 'major',
    MINOR = 'minor',
    LOW = 'low',
}

export const enum IIncidentCategory {
    INCIDENT = 'incident',
    EVENT = 'event',
    ALERT = 'alert',
    FORECAST = 'forecast',
}

export const enum IIncidentReporterProduct {
    IZOA = 'IZOA',
    SAZOS = 'SA z/OS',
    OMEGAMON = 'OMEGAMON',
    NETCOOL = 'Netcool',
    SERVICENOW = 'ServiceNow'
}

export const enum IIncidentStatus {
    NEW = 'new',
    POSTED = 'posted',
    SOLVED = 'solved',
    DELETED = 'deleted',
}

export interface IIncidentLocation {
    domainName?: string,
    sysplexName?: string,
    systemName?: string,
    smfId?: string,
    subsystemName?: string,
    resourceName?: string,
    jobName?: string,
    processId?: string,
    serverName?: string,
}

export interface IIncidentLink {
    name: string,
    url: string,
    category: IIncidentLinkCategory,
    description?: string,
}

export interface IIncidentCustomizedField {
    name: string,
    value: string,
    description?: string,
}

export interface IIncidentReporter {
    product: IIncidentReporterProduct,
    userName?: string,
}

export interface IIncidentDateTime {
    occurred: string,
    reported?: string,
}

export interface IName {
    id: string,
    name: string
}

export interface IIncidentChatToolPosted {
    teams?: IName[],
    channels: IName[],
    persons?: IName[],
}

export interface IIncident {
    id: string,
    summary: string,
    description?: string,
    priority: IIncidentPriority,
    severity: IIncidentSeverity,
    category: IIncidentCategory,
    status: IIncidentStatus,
    dateTime: IIncidentDateTime,
    location: IIncidentLocation,
    reportedBy: IIncidentReporter,
    chatToolPosted: IIncidentChatToolPosted,
    links?: IIncidentLink[],
    customizedFields?: IIncidentCustomizedField[],
}

// Incident View related interface
export interface IIncidentSmuConsoleLink {
    domain: string,
    system: string,
    smfId: string,
    resource: string,
    job: string,
}

export interface IIncidentResource {
    name: string,
    type: string,
    system: string,
}

export interface IIncidentResourceInfo {
    smuConsoleLink: IIncidentSmuConsoleLink,
    resource: IIncidentResource,
}
