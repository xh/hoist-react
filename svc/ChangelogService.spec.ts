/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {hoistCore, initTestAppAsync} from '@xh/hoist/test-support';
// @ts-ignore - written by hoist-dev-utils at build time, and an empty object in tests.
import changelogJson from '@xh/app-changelog.json';
import {beforeAll, describe, expect, it} from 'vitest';

// The changelog JSON that hoist-dev-utils writes from the app's CHANGELOG.md. Recent releases add
// markdown `sections` to each version. Older ones supply only plain-text `parsed`.
const CHANGELOG = {
    title: 'Changelog',
    versions: [
        {
            version: '2.0.0',
            title: 'v2.0.0 - 2026-11-01',
            parsed: {
                _: ['Added Foo.', 'Upgraded Bar. • Removed Baz.', 'Hoist React v91.0'],
                'New Features': ['Added Foo.'],
                'Technical Notes': ['Upgraded Bar. • Removed Baz.']
            },
            sections: [
                {title: null, items: ['Hoist React v91.0']},
                {title: 'New Features', items: ['Added `Foo`.']},
                {title: 'Technical Notes', items: ['Upgraded `Bar`.\n* Removed `Baz`.']}
            ]
        },
        {
            version: '1.0.0',
            title: 'v1.0.0 - 2026-10-01',
            parsed: {
                _: ['Added Foo.', 'Fixed Bar.'],
                'New Features': ['Added Foo.'],
                'Bug Fixes': ['Fixed Bar.']
            }
        }
    ]
};

/**
 * Release notes as `ChangelogService` reads them from the build's changelog JSON, in both the
 * markdown form and the plain-text form that older hoist-dev-utils releases write.
 */
describe('ChangelogService', () => {
    beforeAll(async () => {
        hoistCore.configs.xhChangelogConfig = {
            enabled: true,
            excludedVersions: [],
            excludedCategories: ['Technical'],
            limitToRoles: []
        };
        Object.assign(changelogJson, CHANGELOG);
        await initTestAppAsync();
    });

    it('reads markdown sections when the build supplies them, minus excluded categories', () => {
        const [latest] = XH.changelogService.versions;

        expect(latest.isMarkdown).toBe(true);
        expect(latest.categories).toEqual([
            {title: null, items: ['Hoist React v91.0']},
            {title: 'New Features', items: ['Added `Foo`.']}
        ]);
    });

    it('falls back to plain-text items, without the catch-all, from an older build', () => {
        const [, older] = XH.changelogService.versions;

        expect(older.isMarkdown).toBe(false);
        expect(older.categories).toEqual([
            {title: 'New Features', items: ['Added Foo.']},
            {title: 'Bug Fixes', items: ['Fixed Bar.']}
        ]);
    });
});
