/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

// Incident controller
import type {Request, Response, NextFunction} from 'express';
import type {IIncident} from '../../../types/BnzIncidentInterface';

import {IIncidentPriority, IIncidentSeverity, IIncidentCategory, IIncidentLinkCategory} from '../../../types/BnzIncidentInterface';
import BnzIssController = require('./BnzIssController');
import bnzPoster = require('../../../chatbot/bot/BnzPoster');
import logger = require('../../../utils/logger');
import BnzUtil = require('../../../utils/BnzUtil');

// Incident controller class
class BnzIncidentController extends BnzIssController {
    // Constructor
    constructor() {
        super();
        // Bind this pointer
        this.postIncident = this.postIncident.bind(this);
    }

    /**
    * @swagger - public
    * paths:
    *   /incident:
    *     post:
    *       tags:
    *         - ISS
    *       summary: Post new incident.
    *       description: Post new incident.
    *       operationId: postIncident
    *       security:
    *         - bearerAuth: []
    *       requestBody:
    *          content:
    *             application/json:
    *               schema:
    *                  $ref: '#/components/schemas/Incident'
    *               examples:
    *                  IZOA:
    *                     summary: IZOA example
    *                     value:
    *                        id: IZOA000001
    *                        description: Db2 external database connections are trending upward
    *                        summary: Db2 for z/OS defines a set of thresholds to service requests
    *                        priority: high
    *                        severity: critical
    *                        category: forecast
    *                        dateTime:
    *                            occurred: 2020-11-06T00:00:00Z
    *                            reported: 2020-11-06T23:59:59Z
    *                        location:
    *                            domainName: <domain name>
    *                            sysplexName: <sysplex name>
    *                            systemName: <system name>
    *                            smfId: <SMF ID>
    *                            subsystemName: <subsystem name>
    *                            resourceName : <resource name>
    *                            jobName : <job name>
    *                            processId: <process id>
    *                            serverName: <server name>
    *                        reportedBy:
    *                            product: IZOA
    *                            userName: Name of the user reported the incident
    *                        chatToolPosted:
    *                            teams: []
    *                            channels:
    *                                - id: <channel id>
    *                                  name: DevOps
    *                            persons: []
    *                        links:
    *                            - name: Evidence Page
    *                              url: https://localhost:5001/
    *                              category: webpage
    *                              description: Evidence page of the problem
    *                        customizedFields:
    *                            - name: RelatedSubsystems
    *                              value: DB2_1
    *                              description: Related sub system
    *                  usage:
    *                     summary: usage example
    *                     value:
    *                        id: Incident ID
    *                        description: Incident description
    *                        summary: Incident summary
    *                        priority: high | medium | low
    *                        severity: fatal | critical | major | minor | low
    *                        category: incident | event | alert | forecast
    *                        dateTime:
    *                            occurred: Incident occurred timestamp in UTC (Coordinated Universal Time) format (https://www.w3.org/TR/NOTE-datetime)
    *                            reported: Incident reported timestamp in UTC (Coordinated Universal Time) format (https://www.w3.org/TR/NOTE-datetime)
    *                        location:
    *                            domainName: Name of the automation or NetView domain where the incident occurred
    *                            sysplexName: Name of the sysplex where the incident occurred
    *                            systemName: Name of the system where the incident occurred
    *                            subsystemName: Name of the subsystem where the incident occurred
    *                            resourceName : Name of the resource where the incident occurred
    *                            jobName : Name of the job where the incident occurred
    *                            processId: Id of the process where the incident occurred
    *                            serverName: Name of the server where the incident occurred
    *                        status: new | posted | solved | deleted
    *                        reportedBy:
    *                            product: Name of the product reported the incident, e.g. IZOA, SA z/OS, OMEGAMON, Netcool, ServiceNow
    *                            userName: Name of the user reported the incident
    *                        chatToolPosted:
    *                            teams:
    *                                - id: Id of the team that the incident is posted to
    *                                  name: Name of the team that the incident is posted to
    *                            channels:
    *                                - id: Id of the channel that the incident is posted to
    *                                  name: Name of the channel that the incident is posted to
    *                            persons:
    *                                - id: Id of the person that the incident is posted to
    *                                  name: Name of person team that the incident is posted to
    *                        links:
    *                            - name: Name of the link to be shown
    *                              url: URL of the link to be shown
    *                              description: Detailed description of the link to be shown
    *                        customizedFields:
    *                            - name: Name of this customized field
    *                              value: Value of this customized field
    *                              description: Description of this customized field
    *       responses:
    *         '202':
    *           description: 'Accepted'
    *         '400':
    *           $ref: '#/components/responses/Bad_Request'
    *         '401':
    *           $ref: '#/components/responses/Unauthorized'
    *         '404':
    *           $ref: '#/components/responses/Not_Found'
    *         '408':
    *           $ref: '#/components/responses/Request_Timeout'
    *         '500':
    *           $ref: '#/components/responses/Internal_Server_Error'
    */
    async postIncident(req: Request, res: Response, next: NextFunction): Promise<void> { // eslint-disable-line @typescript-eslint/no-unused-vars
        // Print start log.
        logger.start(this.postIncident, this);

        try {
            const incident = <IIncident>req.body;
            logger.info(`Received incident: ${JSON.stringify(incident, null, 2)}`);

            // Check all the invalid fields and return the invalid fields in the response status message
            const invalidFields: string[] = [];

            // check field id --- required
            // Need to check the type of this property to make sure trim() can be called, same as the following check.
            if (incident.id === null || typeof(incident.id) !== 'string' || incident.id.trim() === '') {
                invalidFields.push('id');
            }

            // check field summary --- required
            if (incident.summary === null || typeof(incident.summary) !== 'string' || incident.summary.trim() === '') {
                invalidFields.push('summary');
            }

            // check field priority --- enum & required
            const priorities: string[] = [IIncidentPriority.HIGH, IIncidentPriority.MEDIUM, IIncidentPriority.LOW]; // enum values for priority
            if (incident.priority === null || typeof(incident.priority) !== 'string' || incident.priority.trim() === '' ) {
                invalidFields.push('priority');
            } else if (!priorities.includes(incident.priority.toLowerCase())) {
                invalidFields.push('priority');
            } else {
                incident.priority = <IIncidentPriority>incident.priority.toLowerCase();
            }

            // check field severity --- enum & required
            const severities: string[] = [IIncidentSeverity.FATAL, IIncidentSeverity.CRITICAL, IIncidentSeverity.MAJOR,
                IIncidentSeverity.MINOR, IIncidentSeverity.LOW]; // enum values for severity
            if (incident.severity === null || typeof(incident.severity) !== 'string' || incident.severity.trim() === '') {
                invalidFields.push('severity');
            } else if (!severities.includes((incident.severity as IIncidentSeverity).toLowerCase())) {
                invalidFields.push('severity');
            } else {
                incident.severity = <IIncidentSeverity>incident.severity.toLowerCase();
            }

            // check field category --- enum & required
            const categories: string[] = [IIncidentCategory.INCIDENT, IIncidentCategory.EVENT, IIncidentCategory.ALERT,
                IIncidentCategory.FORECAST]; // enum values for category
            if (incident.category === null || typeof(incident.category) !== 'string' || incident.category.trim() === '') {
                invalidFields.push('category');
            } else if (!categories.includes(incident.category.toLowerCase())) {
                invalidFields.push('category');
            } else {
                incident.category = <IIncidentCategory>incident.category.toLowerCase();
            }

            // check field dateTime --- required
            if (incident.dateTime === null || typeof(incident.dateTime) !== 'object') {
                invalidFields.push('dateTime');
            } else {
                // Date time format example: 1994-11-05T13:15:30Z
                const regexp = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{1,3}Z/;
                // check the required field dateTime.occurred time format
                if (incident.dateTime.occurred === undefined || typeof(incident.dateTime.occurred) !== 'string'
                        || !regexp.test(incident.dateTime.occurred)) {
                    invalidFields.push('dateTime.occurred');
                }

                // check the field dateTime.reported time format
                if (incident.dateTime.reported !== undefined && !regexp.test(incident.dateTime.reported)) {
                    invalidFields.push('dateTime.reported');
                }
            }

            // check field location --- required
            // And at least one sub field is not empty.
            if (incident.location === null || typeof(incident.location) !== 'object') {
                invalidFields.push('location');
            } else if ((incident.location.domainName === undefined || typeof(incident.location.domainName) !== 'string'
                    || incident.location.domainName.trim() === '')
                && (incident.location.sysplexName === undefined || typeof(incident.location.sysplexName) !== 'string'
                    || incident.location.sysplexName.trim() === '')
                && (incident.location.systemName === undefined || typeof(incident.location.systemName) !== 'string'
                    || incident.location.systemName.trim() === '')
                && (incident.location.smfId === undefined || typeof(incident.location.smfId) !== 'string'
                    || incident.location.smfId.trim() === '')
                && (incident.location.subsystemName === undefined || typeof(incident.location.subsystemName) !== 'string'
                    || incident.location.subsystemName.trim() === '')
                && (incident.location.resourceName === undefined || typeof(incident.location.resourceName) !== 'string'
                    || incident.location.resourceName.trim() === '')
                && (incident.location.jobName === undefined || typeof(incident.location.jobName) !== 'string'
                    || incident.location.jobName.trim() === '')
                && (incident.location.processId === undefined || typeof(incident.location.processId) !== 'string'
                    || incident.location.processId.trim() === '')
                && (incident.location.serverName === undefined || typeof(incident.location.serverName) !== 'string'
                    || incident.location.serverName.trim() === '')) {
                invalidFields.push('location');
            }

            // check field reportedBy --- required
            // check field reportedBy.product --- required
            if (incident.reportedBy === null || typeof(incident.reportedBy) !== 'object') {
                invalidFields.push('reportedBy');
            } else if (incident.reportedBy.product === undefined || typeof(incident.reportedBy.product) !== 'string'
                            || incident.reportedBy.product.trim() === '') {
                invalidFields.push('reportedBy.product');
            }

            // check field chatToolPosted --- required
            // check field chatToolPosted.channels.name --- required
            if (incident.chatToolPosted === null || typeof(incident.chatToolPosted) !== 'object') {
                invalidFields.push('chatToolPosted');
            } else if (incident.chatToolPosted.channels === undefined || !Array.isArray(incident.chatToolPosted.channels)) {
                invalidFields.push('chatToolPosted.channels');
            } else {
                const channels = incident.chatToolPosted.channels;
                for (const channel in channels) {
                    if (Object.prototype.hasOwnProperty.call(channels, channel)) {
                        if (channels[channel].name === null || typeof(channels[channel].name) !== 'string' || channels[channel].name.trim() === '') {
                            invalidFields.push(`chatToolPosted.channels[${channel}].name`);
                        }
                    }
                }
            }

            // check filed links --- optional
            // check field link.name  --- required
            // check field link.url  --- required
            // check field link.category --- enum & required
            if (incident.links !== null && incident.links !== undefined) {
                if (Array.isArray(incident.links)) {
                    const linkCategories: string[] = [IIncidentLinkCategory.IMAGE, IIncidentLinkCategory.WEBPAGE]; // enum values for link categories
                    const links = incident.links;
                    for (const link in links) {
                        if (Object.prototype.hasOwnProperty.call(links, link)) {
                            // check field link.name  --- required
                            if (links[link].name === undefined || typeof(links[link].name) !== 'string' || links[link].name.trim() === '') {
                                invalidFields.push(`links[${link}].name`);
                            }
                            // check field link.url  --- required
                            if (links[link].url === undefined || typeof(links[link].url) !== 'string' || links[link].url.trim() === '') {
                                invalidFields.push(`links[${link}].url`);
                            }
                            // check field link.category --- enum & required
                            if (links[link].category === undefined || typeof(links[link].category) !== 'string' || links[link].category.trim() === '') {
                                invalidFields.push(`links[${link}].category`);
                            } else if (!linkCategories.includes(links[link].category.toLowerCase())) {
                                invalidFields.push(`links[${link}].category`);
                            } else {
                                links[link].category = <IIncidentLinkCategory>links[link].category.toLowerCase();
                            }
                        }
                    }
                } else {
                    invalidFields.push('links');
                }
            }

            // check filed customizedFields --- optional
            // check field customizedField.name  --- required
            // check field customizedField.value  --- required
            if (incident.customizedFields !== null && incident.links !== undefined) {
                if (Array.isArray(incident.customizedFields)) {
                    const customizedFields = incident.customizedFields;
                    for (const customizedField in incident.customizedFields) {
                        if (Object.prototype.hasOwnProperty.call(customizedFields, customizedField)) {
                            // check field customizedField.name  --- required
                            if (customizedFields[customizedField].name === undefined || typeof(customizedFields[customizedField].name) !== 'string'
                                || customizedFields[customizedField].name.trim() === '') {
                                invalidFields.push(`customizedFields[${customizedField}].name`);
                            }
                            // check field customizedField.value  --- required
                            if (customizedFields[customizedField].value === undefined || typeof(customizedFields[customizedField].value) !== 'string'
                                || customizedFields[customizedField].value.trim() === '') {
                                invalidFields.push(`customizedFields[${customizedField}].value`);
                            }
                        }
                    }
                } else {
                    invalidFields.push('customizedFields');
                }
            }

            // DEPRECATED Property
            // check the enum field status, if it's not defined, will set 'new' as default.
            // const status: string[] = [IIncidentStatus.NEW, IIncidentStatus.POSTED, IIncidentStatus.SOLVED, IIncidentStatus.DELETED]; //enum values for status
            // if (incident.status === null || typeof(incident.status) !== 'string' || incident.status.trim() === '' ) {
            //     incident.status = <IIncidentStatus>'new';
            // } else if (!status.includes(incident.status.toLowerCase())) {
            //     return BnzUtil.setResponseStatus(res, 400, BnzUtil.getMessage('BNZCOM007E', 'status'));
            // } else {
            //     incident.status = <IIncidentStatus>incident.status.toLowerCase();
            // }

            // Return the error message with the invalid fields while the invalidFields is not empty.
            if (invalidFields.length !== 0) {
                logger.debug(`invalidFields: ${invalidFields.join(', ')}`);
                return BnzUtil.setResponseStatus(res, 400, BnzUtil.getMessage('BNZCOM007E', invalidFields.join(', ')));
            }

            // Do not wait the incident to be posted, do the post asynchronous
            bnzPoster.postIncident(incident);

            // Set the status as 202.
            BnzUtil.setResponseStatus(res, 202);
        } catch (e) {
            BnzUtil.setResponseStatus(res, 500, BnzUtil.getMessage('BNZCOM001E')); // // 500: Internal server error

            // Print exception stack
            logger.error(logger.getErrorStack(new Error(res.statusMessage), e));
        } finally {
            res.send();
            // Print end log
            logger.end(this.postIncident, this);
        }
    }
}

/**
 * @swagger - public
 * components:
 *   schemas:
 *     Incident:
 *       type: object
 *       properties:
 *           id:
 *             type: string
 *             description: Incident ID
 *           description:
 *             type: string
 *             description: Incident description
 *           summary:
 *             type: string
 *             description: Incident summary
 *           priority:
 *             type: string
 *             enum:
 *               - high
 *               - medium
 *               - low
 *             description: Incident priority
 *           severity:
 *             type: string
 *             enum:
 *               - fatal
 *               - critical
 *               - major
 *               - minor
 *               - low
 *             description: Incident severity
 *           category:
 *             type: string
 *             enum:
 *               - incident
 *               - event
 *               - alert
 *               - forecast
 *             description: Incident category
 *           dateTime:
 *             type: object
 *             properties:
 *               occurred:
 *                 type: date-time
 *                 format: date-time
 *                 description: Incident occurred timestamp in UTC (Coordinated Universal Time) format (https://www.w3.org/TR/NOTE-datetime)
 *                 example: 2020-10-23T23:23:23Z
 *               reported:
 *                 type: string
 *                 format: date-time
 *                 description: Incident reported timestamp in UTC (Coordinated Universal Time) format (https://www.w3.org/TR/NOTE-datetime)
 *                 example: 2020-10-23T23:23:23Z
 *           location:
 *             type: object
 *             properties:
 *               domainName:
 *                 type: string
 *                 description: Name of the automation or NetView domain where the incident occurred
 *               sysplexName:
 *                 type: string
 *                 description: Name of the sysplex where the incident occurred
 *               systemName:
 *                 type: string
 *                 description: Name of the system where the incident occurred
 *               smfId:
 *                 type: string
 *                 description: SMF ID of the system where the incident occurred
 *               subsystemName:
 *                 type: string
 *                 description: Name of the subsystem where the incident occurred
 *               resourceName:
 *                 type: string
 *                 description: Name of the resource where the incident occurred
 *               jobName:
 *                 type: string
 *                 description: Name of the job where the incident occurred
 *               processId:
 *                 type: string
 *                 description: Id of the process where the incident occurred
 *               serverName:
 *                 type: string
 *                 description: Name of the server where the incident occurred
 *           status:
 *             type: string
 *             enum:
 *               - new
 *               - posted
 *               - solved
 *               - deleted
 *             description: Incident status
 *           reportedBy:
 *             type: object
 *             properties:
 *               product:
 *                 type: string
 *                 description: Name of the product reported the incident, e.g. IZOA, SA z/OS, OMEGAMON, Netcool, ServiceNow
 *               userName:
 *                 type: string
 *                 description: Name of the user reported the incident
 *           chatToolPosted:
 *             type: object
 *             properties:
 *               teams:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Id of the team that the incident is posted to
 *                     name:
 *                       type: string
 *                       description: Name of the team that the incident is posted to
 *               channels:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Id of the channel that the incident is posted to
 *                     name:
 *                       type: string
 *                       description: Name of the channel that the incident is posted to
 *               persons:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Id of the person that the incident is posted to
 *                     name:
 *                       type: string
 *                       description: Name of person team that the incident is posted to
 *           links:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                   description: Name of the link to be shown
 *                 url:
 *                   type: string
 *                   description: URL of the link to be shown
 *                 category:
 *                   type: string
 *                   description: Category of the link to be shown
 *                   enum:
 *                     - image
 *                     - webpage
 *                 description:
 *                   type: string
 *                   description: Detailed description of the link to be shown
 *           customizedFields:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                   description: Name of this customized field
 *                 value:
 *                   type: string
 *                   description: Value of this customized field
 *                 description:
 *                   type: string
 *                   description: Description of this customized field
 */

export = BnzIncidentController;
