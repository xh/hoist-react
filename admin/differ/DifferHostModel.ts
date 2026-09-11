/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {HoistModel, PlainObject, XH} from '@xh/hoist/core';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {SECONDS} from '@xh/hoist/utils/datetime';
import {trimEnd} from 'lodash';

/**
 * Reachability + authentication status of a remote instance, as determined by
 * {@link DifferHostModel.checkAsync}.
 * @internal
 */
export type DifferHostStatus =
    /** Not yet checked. */
    | 'unknown'
    /** Check in flight. */
    | 'checking'
    /** Could not be reached at all. */
    | 'offline'
    /** Reachable, but this user has no authenticated session on it. */
    | 'unauthenticated'
    /** Reachable and authenticated, but the user lacks the role required to read admin data. */
    | 'unauthorized'
    /** Reachable, authenticated, and authorized - good to diff. */
    | 'ready';

/** Role required to read diffable data from a remote instance - see hoist-core's admin controllers. */
const REQUIRED_ROLE = 'HOIST_ADMIN_READER';

/** Probes are expected to fail routinely - fail fast rather than hanging the popover. */
const PROBE_TIMEOUT = 10 * SECONDS;

/**
 * Tracks a single remote instance available to the admin Differ as a comparison source, along with
 * the status of the most recent check of its availability.
 *
 * Diffing against a remote instance requires both that the instance be up and that the user hold an
 * authenticated session on it with admin rights. Neither is a given - the common gotcha is an
 * expired or never-established session on an instance the user has not visited in this browser.
 * This model probes for both conditions so the UI can report them ahead of an attempted diff.
 *
 * @internal
 */
export class DifferHostModel extends HoistModel {
    override telemetryPrefix = 'xh.client.admin.differ';

    /** Root URL of the instance, with any trailing slash trimmed. */
    readonly url: string;

    @observable
    status: DifferHostStatus = 'unknown';

    /** Username of the apparent user authenticated to this instance, if any. */
    @observable
    username: string = null;

    @observable
    appCode: string = null;

    @observable
    appVersion: string = null;

    /** Failure detail, when `status` is 'offline'. */
    @observable
    errorMessage: string = null;

    @observable.ref
    lastCheckedAt: Date = null;

    /**
     * Base URL for API calls to this instance. Assume default /api/ baseUrl during local dev, since
     * actual baseUrl will be localhost:8080.
     */
    get baseUrl(): string {
        return this.url + (XH.isDevelopmentMode ? '/api/' : XH.baseUrl);
    }

    /** URL sans protocol, for compact display. */
    get displayName(): string {
        return this.url.replace(/^https?:\/\//, '');
    }

    get isReady(): boolean {
        return this.status === 'ready';
    }

    get isChecking(): boolean {
        return this.status === 'checking';
    }

    /** True if reachable, but running an app other than the one served locally. */
    get isAppMismatch(): boolean {
        return !!this.appCode && !!XH.appCode && this.appCode !== XH.appCode;
    }

    /** Short, user-facing summary of the current status. */
    get statusText(): string {
        const {status, username} = this;
        switch (status) {
            case 'checking':
                return 'Checking...';
            case 'ready':
                return `Authenticated as ${username}`;
            case 'unauthenticated':
                return 'Not logged in - visit to authenticate';
            case 'unauthorized':
                return `${username} lacks the ${REQUIRED_ROLE} role here`;
            case 'offline':
                return this.errorMessage ?? 'Unreachable';
            default:
                return 'Not yet checked';
        }
    }

    constructor(url: string) {
        super();
        makeObservable(this);
        this.url = trimEnd(url.trim(), '/');
    }

    /**
     * Probe this instance to determine if it is up and if this user is authenticated to it with
     * the rights required to run a diff.
     *
     * Failed probes are the point of this check, not an exceptional case - they are classified and
     * recorded as observable state rather than thrown or routed to the exception handler.
     */
    async checkAsync() {
        if (this.isChecking) return;
        this.noteChecking();

        await this.runner()
            .span('checkHost')
            .run(async ctx => {
                const {baseUrl} = this,
                    timeout = PROBE_TIMEOUT;

                // 1) Is it up? `xh/version` is whitelisted by hoist-core for pre-auth access, so it
                //    answers for any running instance and tells us what app is actually there.
                let version: PlainObject;
                try {
                    version = await XH.fetchJson({url: `${baseUrl}xh/version`, timeout}, ctx);
                } catch (e) {
                    this.noteOffline(e);
                    return;
                }

                // 2) Are we logged in? `xh/authStatus` is deliberately *not* whitelisted, so a 401
                //    here means the instance is up but holds no session for this user.
                try {
                    const resp = await XH.fetchJson({url: `${baseUrl}xh/authStatus`, timeout}, ctx);
                    this.noteIdentity(version, resp.authenticated ? resp.identity : null);
                } catch (e) {
                    if (e.httpStatus === 401) {
                        this.noteIdentity(version, null);
                    } else {
                        this.noteOffline(e);
                    }
                }
            });
    }

    /** Open this instance in a new tab - with SSO/OAuth, usually all it takes to authenticate. */
    visit() {
        window.open(this.url, '_blank', 'noopener');
    }

    //------------------------
    // Implementation
    //------------------------
    @action
    private noteChecking() {
        this.status = 'checking';
        this.errorMessage = null;
    }

    @action
    private noteOffline(e: Error) {
        this.status = 'offline';
        this.errorMessage = e.message ?? 'Unable to reach instance';
        this.username = this.appCode = this.appVersion = null;
        this.lastCheckedAt = new Date();
    }

    @action
    private noteIdentity(version: PlainObject, identity: PlainObject) {
        // Identity is delivered in one of two shapes, depending on impersonation - see
        // `IdentityService.getClientConfig()` in hoist-core. Authorization is evaluated against the
        // apparent user, matching hoist-core's `HoistInterceptor`.
        const user = identity?.apparentUser ?? identity?.user,
            roles = identity?.apparentUserRoles ?? identity?.roles ?? [];

        this.appCode = version?.appCode ?? null;
        this.appVersion = version?.appVersion ?? null;
        this.username = user?.username ?? null;
        this.errorMessage = null;
        this.status = !user
            ? 'unauthenticated'
            : roles.includes(REQUIRED_ROLE)
              ? 'ready'
              : 'unauthorized';
        this.lastCheckedAt = new Date();
    }
}
