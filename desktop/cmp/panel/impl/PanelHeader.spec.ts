/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {panel, PanelModel} from '@xh/hoist/desktop/cmp/panel';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {render} from '@testing-library/react';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * A panel's header lays out its title from the stylesheet alone, so an app's CSS can size the
 * title against the header's items.
 */
describe('PanelHeader', () => {
    beforeAll(() => initTestAppAsync());

    it('sets no inline flex on the title', () => {
        const {container} = render(panel({title: 'Users', headerItems: ['x']}));
        expect(title(container).style.flex).toBe('');
    });

    it('sets no inline flex on the title of a panel collapsed to the side', () => {
        const model = new PanelModel({side: 'left', collapsible: true, defaultCollapsed: true});
        onTestFinished(() => model.destroy());
        const {container} = render(panel({model, title: 'Users'}));
        expect(title(container).style.flex).toBe('');
    });
});

function title(container: HTMLElement): HTMLElement {
    return container.querySelector('.xh-panel-header__title');
}
