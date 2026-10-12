/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {FormModel} from '@xh/hoist/cmp/form';
import {ViewManagerModel} from '@xh/hoist/cmp/viewmanager';
import {XH} from '@xh/hoist/core';
import {viewManager} from '@xh/hoist/desktop/cmp/viewmanager';
import type {JsonBlob} from '@xh/hoist/svc';
import {hoistCore, initTestAppAsync} from '@xh/hoist/test-support';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * The testIds that desktop ViewManager renders on itself and on the parts a test drives - its
 * buttons, its menu and the views listed in it, and its dialogs. Playwright tests and agents find
 * these by `data-testid`, so a dropped or renamed id breaks their scripts.
 */
describe('ViewManager', () => {
    beforeAll(async () => {
        hoistCore.route('POST', 'xhView/allData', () => ({
            state: {userPinned: {}, autoSave: false},
            views: [
                blob(1, 'mine', 'My Positions', hoistCore.username),
                blob(2, 'firm', 'Firm', null)
            ],
            manageGlobal: false
        }));
        hoistCore.route('POST', 'xhView/updateState', req => ({
            userPinned: {},
            autoSave: false,
            ...req.json
        }));
        await initTestAppAsync();
    });

    it('renders its testId on its outer element and derives one for each button', async () => {
        const model = await createAsync();
        render(
            viewManager({
                model,
                testId: 'vm',
                showSaveButton: 'always',
                showRevertButton: 'always'
            })
        );

        const outer = screen.getByTestId('vm');
        expect(outer.classList).toContain('xh-view-manager');
        expect(testIdsWithin(outer)).toEqual(['vm-menu-btn', 'vm-save-btn', 'vm-revert-btn']);
    });

    it('tags its menu, the menu actions, and each view by token', async () => {
        const model = await createAsync();
        render(viewManager({model, testId: 'vm'}));

        const menu = await openMenuAsync();
        expect(testIdsWithin(menu)).toEqual([
            'vm-menu-view-mine',
            'vm-menu-view-firm',
            'vm-menu-view-default',
            'vm-menu-save',
            'vm-menu-save-as',
            'vm-menu-revert',
            'vm-menu-auto-save',
            'vm-menu-manage'
        ]);
        expect(screen.getByTestId('vm-menu-view-mine').textContent).toBe('My Positions');
    });

    it('tags the Save As dialog, its fields, and its buttons', async () => {
        const model = await createAsync();
        render(viewManager({model, testId: 'vm'}));

        await openMenuAsync();
        act(() => fireEvent.click(screen.getByTestId('vm-menu-save-as')));

        const dialog = screen.getByTestId('vm-save-as-dialog');
        expect(testIdsWithin(dialog)).toEqual(
            expect.arrayContaining([
                'vm-save-as-dialog-name-input',
                'vm-save-as-dialog-save-btn',
                'vm-save-as-dialog-cancel-btn'
            ])
        );
        expect(XH.getModelByTestId('vm-save-as-dialog')).toBeInstanceOf(FormModel);
    });

    it('registers its model for XH.getModelByTestId while mounted', async () => {
        const model = await createAsync(),
            {unmount} = render(viewManager({model, testId: 'vm'}));
        expect(XH.getModelByTestId('vm')).toBe(model);

        unmount();
        expect(XH.getModelByTestId('vm')).toBeFalsy();
    });

    it('renders no testIds when given none', async () => {
        const model = await createAsync();
        render(viewManager({model}));

        // Check the menu and the Save As dialog, which derive testIds of their own when given one.
        act(() => fireEvent.click(document.querySelector('.xh-view-manager__menu-button')));
        const saveAs = await screen.findByText('Save As...');
        expect(testIdsWithin(document.body)).toEqual([]);

        act(() => fireEvent.click(saveAs));
        expect(document.querySelector('.xh-view-manager__save-dialog')).not.toBeNull();
        expect(testIdsWithin(document.body)).toEqual([]);
    });

    it('tags the Manage dialog and its Close button', async () => {
        const model = await createAsync();
        render(viewManager({model, testId: 'vm'}));

        await openMenuAsync();
        act(() => fireEvent.click(screen.getByTestId('vm-menu-manage')));

        const dialog = await screen.findByTestId('vm-manage-dialog');
        expect(testIdsWithin(dialog)).toContain('vm-manage-dialog-close-btn');
    });
});

//------------------
// Test support
//------------------
const TYPE = 'portfolioGrid';

async function createAsync(): Promise<ViewManagerModel> {
    const ret = await ViewManagerModel.createAsync({type: TYPE});
    onTestFinished(() => ret.destroy());
    return ret;
}

/** Click the menu button and wait for the menu, which shows once its refresh of views is done. */
async function openMenuAsync(): Promise<HTMLElement> {
    act(() => fireEvent.click(screen.getByTestId('vm-menu-btn')));
    return screen.findByTestId('vm-menu');
}

/** The `data-testid` values set within an element, in document order. */
function testIdsWithin(el: HTMLElement): string[] {
    return Array.from(el.querySelectorAll('[data-testid]'), it => it.getAttribute('data-testid'));
}

/** A view as hoist-core's `xhView/allData` lists it - without its value. */
function blob(id: number, token: string, name: string, owner: string): Omit<JsonBlob, 'value'> {
    return {
        id,
        token,
        type: TYPE,
        owner,
        acl: owner ? null : '*',
        name,
        archived: false,
        archivedDate: 0,
        description: null,
        dateCreated: 0,
        lastUpdated: 0,
        lastUpdatedBy: owner ?? 'admin',
        meta: {}
    };
}
