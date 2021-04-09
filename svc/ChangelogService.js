/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistService, XH} from '@xh/hoist/core';
import jsonFromMarkdown from '@xh/app-changelog.json';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {checkMinVersion} from '@xh/hoist/utils/js';
import {isEmpty, forOwn} from 'lodash';

/**
 * Service to display an application changelog (aka release notes) to end users, if so configured.
 *
 * Changelog entries are maintained in a CHANGELOG.md file within the project root, formatted as
 * per https://keepachangelog.com. Requires @xh/hoist-dev-utils v5.7+ to parse the markdown source
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

    // Optional JSON AppConfig key to soft-configure this service - see this.config for shape.
    SVC_CONFIG_KEY = 'xhChangelogConfig';
    // Optional string Preference key to track last read log entry + enable unread notifications.
    LAST_READ_PREF_KEY = 'xhLastReadChangelog';

    /**
     * @member {Changelog} - the complete changelog object, as produced by the app build or defined
     *      in soft-config, or an empty placeholder if neither source is enabled/available.
     */
    changelog;

    /**
     * @member {ChangelogVersion[]} - parsed and cleaned versions, if any, with any versions or
     *      nested categories marked for exclusion via config already omitted.
     */
    versions;

    /**
     * @member {boolean} - true if an entry exists for the current app version which the user has
     *      yet to view (and the required user preference has been created).
     */
    @observable currentVersionIsUnread;

    /** @return {boolean} */
    get enabled() {return XH.isDesktop && this.config.enabled && !isEmpty(this.versions)}

    /** @return {?string} */
    get latestAvailableVersion() {
        if (!this.enabled) return null;
        return this.versions[0].version;
    }

    /** @return {?Object} */
    get currentVersionEntry() {
        if (!this.enabled) return null;
        return this.versions.find(it => it.version === XH.appVersion) ?? null;
    }

    constructor() {
        super();
        makeObservable(this);
    }

    async initAsync() {
        this.changelog = !isEmpty(jsonFromMarkdown?.versions) ?
            jsonFromMarkdown:
            {title: null, versions: []};

        this.versions = this.parseVersions(this.changelog);
        this.updateUnreadStatus();
    }

    markLatestAsRead() {
        const {latestAvailableVersion} = this;

        if (!latestAvailableVersion || !this.lastReadPrefExists) {
            console.warn(`Unable to mark changelog as read - latest version or required pref not found.`);
            return;
        }

        XH.setPref(this.LAST_READ_PREF_KEY, latestAvailableVersion);
        this.updateUnreadStatus();
    }


    //------------------------
    // Implementation
    //------------------------
    get config() {
        return XH.getConf(this.SVC_CONFIG_KEY, {
            enabled: true,
            excludedVersions: [],
            excludedCategories: []
        });
    }

    get lastReadPrefExists() {
        return XH.prefService.hasKey(this.LAST_READ_PREF_KEY);
    }

    parseVersions(changelog) {
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
            console.error('Error parsing changelog JSON into versions - changelog will not be available', e);
            return [];
        }
    }

    includeVersion(versionStr) {
        return versionStr && !this.config.excludedVersions.includes(versionStr);
    }

    includeCategory(catTitle) {
        // Check against '_' is due to catch-all category created by changelog-parser lib.
        return catTitle !== '_' && !this.config.excludedCategories.find(it => catTitle.includes(it));
    }

    @action
    updateUnreadStatus() {
        if (!this.enabled || !this.lastReadPrefExists) {
            this.currentVersionIsUnread = false;
        } else {
            const lastReadVersion = XH.getPref(this.LAST_READ_PREF_KEY),
                {currentVersionEntry} = this;
            this.currentVersionIsUnread = (
                currentVersionEntry && !checkMinVersion(lastReadVersion, currentVersionEntry.version)
            );
        }
    }
}

/**
 * @typedef {Object} Changelog
 * @property {ChangelogVersion[]} versions
 */

/**
 * @typedef {Object} ChangelogVersion
 * @property {string} version
 * @property {string} title
 * @property {boolean} isCurrentVersion
 * @property {ChangelogCategory[]} categories
 */

/**
 * @typedef {Object} ChangelogCategory
 * @property {string} title
 * @property {string[]} items
 */

