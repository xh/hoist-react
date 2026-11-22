/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {InitContext} from '@xh/hoist/core';
import {HoistService, XH} from '@xh/hoist/core';
// @ts-ignore
import jsonFromMarkdown from '@xh/app-changelog.json';
import {action, observable} from '@xh/hoist/mobx';
import {checkMinVersion} from '@xh/hoist/utils/js';
import {includes, isArray, isEmpty, map, omit} from 'lodash';

/**
 * Service to display an application changelog (aka release notes) to end users, if so configured.
 *
 * Changelog entries are maintained in a CHANGELOG.md file within the project root, formatted as
 * per https://keepachangelog.com. Requires hoist-dev-utils v5.7+ to parse the markdown source
 * into JSON and make available via the special `@xh/app-changelog.json` import above. Recent
 * hoist-dev-utils releases also supply each entry's markdown, wrapped lines and sub-bullets
 * included, which the dialog renders. Older releases supply plain text only.
 *
 * If a changelog is available, the top-level app menu will include an item to view the log in a
 * dialog. If a string pref is defined with key `xhLastReadChangelog`, this service will track the
 * most recent version viewed by the user, and the app will render a "What's new?" button in the
 * top appBar to alert the user. These app-level UI elements are currently desktop-only, can all be
 * independently disabled, and only appear when this service is enabled.
 *
 * Several additional options can be controlled via soft-config - see below.
 *
 * @see XH.showChangelog
 * @see whatsNewButton
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
    @observable accessor currentVersionIsUnread: boolean;

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

    override async initAsync(ctx: InitContext) {
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
                    // Prefer markdown `sections` over plain-text `parsed`, the only form older
                    // hoist-dev-utils supply. `parsed` holds `###` titles as keys, plus an `_`
                    // catch-all of every entry.
                    const isMarkdown = isArray(v.sections),
                        categories: ChangelogCategory[] = isMarkdown
                            ? v.sections
                            : map(omit(v.parsed, '_'), (items, title) => ({title, items}));

                    versions.push({
                        version: v.version,
                        title: v.title,
                        date: v.date ?? null,
                        isCurrentVersion: v.version === XH.appVersion,
                        isUnreleased: includes(v.version, 'SNAPSHOT'),
                        isMarkdown,
                        categories: categories.filter(it => this.includeCategory(it.title))
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

    private includeCategory(catTitle: string) {
        return (
            catTitle == null || !this.config.excludedCategories.some(it => catTitle.includes(it))
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
    /** The full `##` heading, e.g. `v2.0.0 - 2026-11-01`. */
    title: string;
    /** Release date from the heading, as `YYYY-MM-DD`, or null if not dated. */
    date: string;
    isCurrentVersion: boolean;
    /** True for a SNAPSHOT version that has not yet been released. */
    isUnreleased: boolean;
    /** True if category items are markdown, false if they are plain text. */
    isMarkdown: boolean;
    categories: ChangelogCategory[];
}

export interface ChangelogCategory {
    /** The `###` heading, or null for entries listed above any heading. */
    title: string;
    items: string[];
}
