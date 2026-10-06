/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    buildViewGroupTree,
    composeGroupPath,
    getAllGroupPaths,
    getGroupLeaf,
    getGroupParent,
    isGroupSameOrDescendant,
    normalizeGroupPath,
    type ViewGroupNode,
    type ViewInfo
} from '@xh/hoist/cmp/viewmanager';
import {describe, expect, it} from 'vitest';

/**
 * Slash-delimited view group paths, as shown in the ViewManager menu and edited in its Manage
 * dialog. Groups persist as plain strings, so these helpers decide which views share a group and
 * which views move when a group is renamed or re-parented.
 */
describe('GroupUtils', () => {
    describe('normalizeGroupPath', () => {
        it.each([
            [' Reports / Sales ', 'Reports/Sales'],
            ['/Reports//Sales/', 'Reports/Sales'],
            [' / ', null]
        ])('normalizes %j to %j', (path, expected) => {
            expect(normalizeGroupPath(path)).toBe(expected);
        });
    });

    describe('isGroupSameOrDescendant', () => {
        it('matches a group and the groups nested beneath it', () => {
            expect(isGroupSameOrDescendant('Reports', 'Reports')).toBe(true);
            expect(isGroupSameOrDescendant('Reports/Sales/Monthly', 'Reports')).toBe(true);
            expect(isGroupSameOrDescendant('Reports', 'Reports/Sales')).toBe(false);
        });

        it('does not match a group that only shares a prefix', () => {
            // Renaming 'Reports' must not move 'ReportsArchive'.
            expect(isGroupSameOrDescendant('ReportsArchive', 'Reports')).toBe(false);
        });
    });

    describe('path segments', () => {
        it('splits and composes paths, with a null parent at the top level', () => {
            expect(getGroupParent('Reports/Sales/Monthly')).toBe('Reports/Sales');
            expect(getGroupParent('Reports')).toBeNull();
            expect(getGroupLeaf('Reports/Sales')).toBe('Sales');

            // Re-parenting a group to the top level, and moving one beneath another.
            expect(composeGroupPath(null, 'Sales')).toBe('Sales');
            expect(composeGroupPath('Archive', 'Sales')).toBe('Archive/Sales');
        });
    });

    describe('buildViewGroupTree', () => {
        it('nests views by group path, sorting groups and views by name at every level', () => {
            const {roots, ungrouped} = buildViewGroupTree([
                view('Zeta', 'Reports/Sales'),
                view('Scratch', null),
                view('Alpha', 'Reports/Sales'),
                view('Q1 Close', 'Archive/2025'),
                view('Overview', 'Reports'),
                view('Adhoc', null)
            ]);

            expect(roots.map(summarize)).toEqual([
                {
                    path: 'Archive',
                    views: [],
                    children: [{path: 'Archive/2025', views: ['Q1 Close'], children: []}]
                },
                {
                    path: 'Reports',
                    views: ['Overview'],
                    children: [{path: 'Reports/Sales', views: ['Alpha', 'Zeta'], children: []}]
                }
            ]);
            expect(ungrouped.map(it => it.name)).toEqual(['Adhoc', 'Scratch']);
        });
    });

    describe('getAllGroupPaths', () => {
        it('lists every group, including those implied by nested paths, depth-first', () => {
            const paths = getAllGroupPaths([
                view('Monthly Sales', 'Reports/Sales/Monthly'),
                view('Q1 Close', 'Archive'),
                view('Scratch', null)
            ]);

            expect(paths).toEqual(['Archive', 'Reports', 'Reports/Sales', 'Reports/Sales/Monthly']);
        });
    });
});

//------------------
// Test support
//------------------
function view(name: string, group: string): ViewInfo {
    return {name, group} as ViewInfo;
}

interface NodeSummary {
    path: string;
    views: string[];
    children: NodeSummary[];
}

function summarize(node: ViewGroupNode): NodeSummary {
    return {
        path: node.path,
        views: node.views.map(it => it.name),
        children: node.children.map(summarize)
    };
}
