/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {MenuItemLike} from '@xh/hoist/core';
import {describe, expect, it} from 'vitest';
import type {DashViewSpec} from '../DashViewSpec';
import {createViewSpecMenuItems, groupViewSpecs, ViewSpecGroup} from './DashUtils';

/**
 * The add view menus of DashContainer and DashCanvas, and the DashCanvasWidgetChooser, group view
 * specs by `groupName`. A slash-delimited name nests groups, so apps with many specs can keep
 * each menu short.
 */
describe('createViewSpecMenuItems', () => {
    it('nests specs into submenus by slash-delimited groupName', () => {
        const items = createViewSpecMenuItems(
            [
                spec('monthly', 'Reports/Sales/Monthly'),
                spec('daily', 'Reports/Sales/Daily'),
                spec('risk', 'Reports/Risk'),
                spec('summary', 'Reports')
            ],
            createItem
        );

        expect(outline(items)).toEqual([
            {
                Reports: [
                    {Sales: [{Monthly: ['monthly']}, {Daily: ['daily']}]},
                    {Risk: ['risk']},
                    'summary'
                ]
            }
        ]);
    });

    it('merges groups of the same path, ignoring blank segments and surrounding spaces', () => {
        const items = createViewSpecMenuItems(
            [
                spec('a', 'Charts/Line'),
                spec('b', 'Charts / Line'),
                spec('c', '/Charts//Line/'),
                spec('d', ' / ')
            ],
            createItem
        );

        expect(outline(items)).toEqual([{Charts: [{Line: ['a', 'b', 'c']}]}, 'd']);
    });

    it('lists groups and specs in the order each first appears', () => {
        const items = createViewSpecMenuItems(
            [
                spec('a'),
                spec('b', 'Charts/Line'),
                spec('c'),
                spec('d', 'Charts'),
                spec('e', 'Grids'),
                spec('f', 'Charts/Bar')
            ],
            createItem
        );

        expect(outline(items)).toEqual([
            'a',
            {Charts: [{Line: ['b']}, 'd', {Bar: ['f']}]},
            'c',
            {Grids: ['e']}
        ]);
    });
});

describe('groupViewSpecs', () => {
    it('collects every spec within a group, including those of nested groups', () => {
        const [charts] = groupViewSpecs([
            spec('line', 'Charts/Line'),
            spec('pie', 'Charts'),
            spec('bar', 'Charts/Bar')
        ]) as ViewSpecGroup[];

        expect(charts.allViewSpecs.map(it => it.id)).toEqual(['line', 'pie', 'bar']);
    });
});

//------------------
// Test support
//------------------
function spec(id: string, groupName: string = null): DashViewSpec {
    return {id, groupName, title: id, content: () => null};
}

function createItem(viewSpec: DashViewSpec) {
    return {text: viewSpec.title};
}

/** Menu items as a compact tree - a submenu as `{text: [items]}`, a plain item as its text. */
function outline(items: MenuItemLike[]) {
    return items.map(item => {
        if (typeof item === 'string' || !('text' in item)) return item;
        return item.items ? {[item.text as string]: outline(item.items)} : item.text;
    });
}
