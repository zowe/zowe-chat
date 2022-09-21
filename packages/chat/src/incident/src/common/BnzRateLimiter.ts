/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import {IRateLimiterOptions, RateLimiterMemory} from 'rate-limiter-flexible';

import logger = require('../utils/logger');
import {IRateLimitType} from '../types/BnzCommonInterface';
import bnzConfig = require('./BnzConfig');

class BnzRateLimiter {
    private static instance: BnzRateLimiter;

    private requestLimiterOption: IRateLimiterOptions;
    private loginIpLimiterOption: IRateLimiterOptions;
    private loginUserLimiterOption: IRateLimiterOptions;

    private requestRateLimiter: RateLimiterMemory;
    private loginIpRateLimiter: RateLimiterMemory;
    private loginUserRateLimiter: RateLimiterMemory;

    private constructor() {
        if (BnzRateLimiter.instance === undefined) {
            // Get configuration
            const config = bnzConfig.getConfig();

            // Set request limiter option
            //   Block for 1 minute if same IP consecutively submit 10 requests during 1 second
            this.requestLimiterOption = {
                keyPrefix: IRateLimitType.REQUEST,
                points: config.rateLimit.request.point, // 10, // 10 requests
                duration: config.rateLimit.request.duration, // 1, // in second
                blockDuration: config.rateLimit.request.blockDuration, // 60, // in second
            };
            logger.debug(`requestLimiterOption: ${JSON.stringify(this.requestLimiterOption, null, 2)}`);

            // Set login limiter option
            // Block for 1 day if same IP consecutively fail to login during 1 hour for 100 times
            this.loginIpLimiterOption = {
                keyPrefix: IRateLimitType.LOGIN_IP,
                points: config.rateLimit.login.ip.point, // 100,
                duration: config.rateLimit.login.ip.duration, // 60 * 60, // in second
                blockDuration: config.rateLimit.login.ip.blockDuration, // 60 * 60 * 24, // in second
            };
            logger.debug(`loginIpLimiterOption: ${JSON.stringify(this.loginIpLimiterOption, null, 2)}`);

            // Block for 5 minutes if same user and IP consecutively fail to login during 1 minute for 5 times
            this.loginUserLimiterOption = {
                keyPrefix: IRateLimitType.LOGIN_USER,
                points: config.rateLimit.login.user.point, // 5
                duration: config.rateLimit.login.user.duration, // 60, // in second
                blockDuration: config.rateLimit.login.user.blockDuration, // 60 * 5, // in second
            };
            logger.debug(`loginUserLimiterOption: ${JSON.stringify(this.loginUserLimiterOption, null, 2)}`);

            // Create request rate limiter
            this.requestRateLimiter = new RateLimiterMemory(this.requestLimiterOption);

            // Create login IP rate limiter
            this.loginIpRateLimiter = new RateLimiterMemory(this.loginIpLimiterOption);

            // Create login user rate limiter
            this.loginUserRateLimiter = new RateLimiterMemory(this.loginUserLimiterOption);

            BnzRateLimiter.instance = this;
        }

        // Bind this pointer
        this.limitAccessRate = this.limitAccessRate.bind(this);
        this.resetAccessRate = this.resetAccessRate.bind(this);

        return BnzRateLimiter.instance;
    }

    // Get the singleton instance
    static getInstance(): BnzRateLimiter {
        if (BnzRateLimiter.instance === undefined) {
            BnzRateLimiter.instance = new BnzRateLimiter();
        }

        return BnzRateLimiter.instance;
    }

    // Get rate limiter
    getRateLimiter(limitType: string): RateLimiterMemory {
        logger.info(`Rate limiter type: ${limitType}`);

        if (limitType === IRateLimitType.REQUEST) {
            return this.requestRateLimiter;
        } else if (limitType === IRateLimitType.LOGIN_IP) {
            return this.loginIpRateLimiter;
        } else if (limitType === IRateLimitType.LOGIN_USER) {
            return this.loginUserRateLimiter;
        } else {
            logger.error(`Wrong limiter type: ${limitType}`);
            return null;
        }
    }

    // Limit service access rate
    async limitAccessRate(limitType: string, key: string): Promise<number> {
        // Print start log
        logger.start(this.limitAccessRate, this);

        let retryAfterTime = 0;

        try {
            // Get limiter
            const limiter = this.getRateLimiter(limitType);
            if (limiter === null) {
                return retryAfterTime;
            }
            logger.debug(`points: ${limiter.points}`);

            // Limit service access rate
            const limitRate = await limiter.get(key);
            if (limitRate === null) {
                logger.debug(`consumedPoints: 0`);
                // Count in the current login
                await limiter.consume(key);

                return retryAfterTime;
            } else {
                logger.debug(`consumedPoints: ${limitRate.consumedPoints}    remainingPoints: ${limitRate.remainingPoints}`);
                // if (limitRate.consumedPoints > limiter.points) {
                if (limitRate.remainingPoints <= 0) {
                    retryAfterTime = Math.round(limitRate.msBeforeNext / 1000);
                    if (retryAfterTime <= 0) {
                        retryAfterTime = 1;
                    }

                    logger.warn(`Service access rate limit reaches! Please retry after ${retryAfterTime} seconds!`);
                    return retryAfterTime;
                } else {
                    // Count in the current login
                    await limiter.consume(key);

                    return retryAfterTime;
                }
            }
        } catch (e) {
            logger.error(logger.getErrorStack(new Error(`Failed to limit service access rate! key = ${key}`), e));

            return retryAfterTime;
        } finally {
            // Print end log
            logger.end(this.limitAccessRate, this);
        }
    }

    // Reset access rate
    async resetAccessRate(limitType: string, key: string): Promise<void> {
        // Print start log
        logger.start(this.resetAccessRate, this);

        try {
            // Get limiter
            const limiter = this.getRateLimiter(limitType);

            // Reset limiter by key
            if (limiter !== null) {
                await limiter.delete(key);
            }
        } catch (e) {
            logger.error(logger.getErrorStack(new Error(`Failed to reset rate limiter! key = ${key}`), e));
        } finally {
            // Print end log
            logger.end(this.resetAccessRate, this);
        }
    }

    // Reward access rate
    async rewardAccessRate(limitType: string, key: string, point: number = 1): Promise<void> {
        // Print start log
        logger.start(this.rewardAccessRate, this);

        try {
            // Get limiter
            const limiter = this.getRateLimiter(limitType);

            // Reward limiter x points by key
            if (limiter !== null) {
                await limiter.reward(key, point);
            }
        } catch (e) {
            logger.error(logger.getErrorStack(new Error(`Failed to reset rate limiter! key = ${key}`), e));
        } finally {
            // Print end log
            logger.end(this.rewardAccessRate, this);
        }
    }
}

const bnzRateLimiter = BnzRateLimiter.getInstance();
// Object.freeze(bnzRateLimiter);

export = bnzRateLimiter;
