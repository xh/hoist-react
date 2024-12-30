/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {HoistService, XH} from '@xh/hoist/core';
// @ts-ignore
import jsonFromMarkdown from '@xh/app-changelog.json';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {checkMinVersion} from '@xh/hoist/utils/js';
import {isEmpty, forOwn, includes} from 'lodash';

/**
 * Service to display an application changelog (aka release notes) to end users, if so configured.
 *
 * Changelog entries are maintained in a CHANGELOG.md file within the project root, formatted as
 * per https://keepachangelog.com. Requires hoist-dev-utils v5.7+ to parse the markdown source
 * into JSON and make available via the special `@xh/app-changelog.json` import above.
 *
 * If a changelog is available, the top-level app menu will include an item to view the log in a
 * dialog. If a string pref is defined with key `xhLastReadChangelog`, this service will track the
 * most recent version viewed by the user, and the app will render a "What's new?" button in the
 * top appBar to alert the user. These app-level UI elements are currently desktop-only, can all be
 * independently disabled, and only appear when this service is enabled.
 *
 * Several additional options can be controlled via soft-config - see below.
 *
 * @see XH.showChangelog - public API for displaying the changelog, if enabled and populated.
 * @see whatsNewButton - utility button that conditionally renders when an unread entry exists for
 *      the currently deployed app version. Installed by default in desktop appBar.
 */
export class ChangelogService extends HoistService {
    override xhImpl = true;

    static instance: ChangelogService;

    // JSON AppConfig to soft-configure this service - see this.config for shape.
    readonly SVC_CONFIG_KEY: string = 'xhChangelogConfig';
    // String Preference to track last read log entry + enable unread notifications.
    readonly LAST_READ_PREF_KEY: string = 'xhLastReadChangelog';

    /**
     * The complete changelog object, as produced by the app build or defined
     * in soft-config, or an empty placeholder if neither source is enabled/available.
     */
    changelog: object;

    /**
     * Parsed and cleaned versions, if any, with any versions or
     * nested categories marked for exclusion via config already omitted.
     */
    versions: ChangelogVersion[];

    /**
     * True if an entry exists for the current app version which the user has
     * yet to view (and the required user preference has been created).
     */
    @observable
    currentVersionIsUnread: boolean;

    get enabled(): boolean {
        const {config, versions} = this,
            {enabled, limitToRoles} = config,
            userHasAccess =
                isEmpty(limitToRoles) || limitToRoles.some(it => XH.getUser().hasRole(it));

        return XH.isDesktop && enabled && userHasAccess && !isEmpty(versions);
    }

    get latestAvailableVersion(): string {
        if (!this.enabled) return null;
        return this.versions[0].version;
    }

    get latestNonEmptyVersion(): string {
        if (!this.enabled) return null;
        return this.versions.find(it => !isEmpty(it.categories))?.version;
    }

    constructor() {
        super();
        makeObservable(this);
    }

    override async initAsync() {
        this.changelog = !isEmpty(jsonFromMarkdown?.versions)
            ? jsonFromMarkdown
            : {title: null, versions: []};

        this.versions = this.parseVersions(this.changelog);
        this.updateUnreadStatus();
    }

    markLatestAsRead() {
        const {latestAvailableVersion, LAST_READ_PREF_KEY} = this;

        if (includes(latestAvailableVersion, 'SNAPSHOT')) {
            this.logWarn('Unable to mark changelog as read when latest version is SNAPSHOT.');
            return;
        }

        if (!latestAvailableVersion || !XH.prefService.hasKey(LAST_READ_PREF_KEY)) {
            this.logWarn(
                'Unable to mark changelog as read - latest version or required pref not found.'
            );
            return;
        }

        XH.setPref(LAST_READ_PREF_KEY, latestAvailableVersion);
        this.updateUnreadStatus();
    }

    //------------------------
    // Implementation
    //------------------------
    private get config() {
        return XH.getConf(this.SVC_CONFIG_KEY, {
            enabled: true,
            excludedVersions: [],
            excludedCategories: [],
            limitToRoles: []
        });
    }

    private parseVersions(changelog): ChangelogVersion[] {
        try {
            const versions = [];
            (changelog.versions ?? [])
                .filter(v => this.includeVersion(v.version))
                .forEach(v => {
                    const categories = [];
                    // JSON parsed from markdown sets up categories as object keys.
                    forOwn(v.parsed, (items, title) => {
                        if (this.includeCategory(title)) {
                            categories.push({title, items});
                        }
                    });

                    versions.push({
                        version: v.version,
                        title: v.title,
                        isCurrentVersion: v.version === XH.appVersion,
                        categories
                    });
                });

            return versions;
        } catch (e) {
            this.logError(
                'Error parsing changelog JSON into versions - changelog will not be available',
                e
            );
            return [];
        }
    }

    private includeVersion(versionStr) {
        return versionStr && !this.config.excludedVersions.includes(versionStr);
    }

    private includeCategory(catTitle) {
        // Check against '_' is due to catch-all category created by changelog-parser lib.
        return (
            catTitle !== '_' && !this.config.excludedCategories.find(it => catTitle.includes(it))
        );
    }

    @action
    private updateUnreadStatus() {
        const {enabled, latestNonEmptyVersion} = this,
            lastReadVersion = XH.getPref(this.LAST_READ_PREF_KEY, null);
        this.currentVersionIsUnread =
            enabled &&
            latestNonEmptyVersion &&
            lastReadVersion &&
            !checkMinVersion(lastReadVersion, latestNonEmptyVersion);
    }
}

export interface ChangelogVersion {
    version: string;
    title: string;
    isCurrentVersion: boolean;
    categories: ChangelogCategory[];
}

export interface ChangelogCategory {
    title: string;
    items: string[];
}
