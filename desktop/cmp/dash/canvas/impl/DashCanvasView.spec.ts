/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {DashCanvasModel, type DashCanvasConfig} from '@xh/hoist/desktop/cmp/dash';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {fireEvent, render, screen} from '@testing-library/react';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';
import {dashCanvasView} from './DashCanvasView';

/**
 * The header of each DashCanvas widget, with its menu for adding, removing, and renaming views.
 * The menu button hides itself when a locked canvas leaves no items to show.
 */
describe('DashCanvasView', () => {
    beforeAll(() => initTestAppAsync());

    it('renders a header menu listing the actions the canvas allows', async () => {
        const {container} = renderView();

        fireEvent.click(menuButton(container));

        expect(await screen.findByText('Remove')).toBeTruthy();
        expect(screen.getByText('Rename')).toBeTruthy();
        expect(screen.getByText('Duplicate')).toBeTruthy();
    });

    it('omits the header menu when locks hide every item', () => {
        const {container} = renderView({contentLocked: true, renameLocked: true});

        expect(container.querySelector('.xh-dash-tab')).toBeTruthy();
        expect(menuButton(container)).toBeNull();
    });
});

//------------------
// Test support
//------------------
function renderView(config: Partial<DashCanvasConfig> = {}) {
    const canvas = new DashCanvasModel({
        viewSpecs: [{id: 'chart', title: 'Chart', content: () => null}],
        initialState: [{layout: {x: 0, y: 0, w: 6, h: 5}, viewSpecId: 'chart'}],
        ...config
    });
    onTestFinished(() => canvas.destroy());
    return render(dashCanvasView({model: canvas.viewModels[0]}));
}

function menuButton(container: HTMLElement): HTMLElement {
    return container.querySelector('.xh-panel-header .xh-button');
}
