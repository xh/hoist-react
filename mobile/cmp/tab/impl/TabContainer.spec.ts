/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {div} from '@xh/hoist/cmp/layout';
import {tabContainer, TabContainerModel, TabContainerProps} from '@xh/hoist/cmp/tab';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * The mobile TabContainer: a switcher of buttons docked above or below the tab content, showing
 * the active tab. These guard the testIds, the switcher's behavior and which tabs render.
 */
describe('TabContainer (mobile)', () => {
    beforeAll(() => initTestAppAsync({isMobileApp: true}));

    it('renders a switcher with a button per tab, with testIds', () => {
        renderTabs({switcher: {orientation: 'top'}});
        const switcher = screen.getByTestId('tabs-switcher');
        expect(switcher.classList.contains('xh-tab-switcher--top')).toBe(true);
        expect(screen.getByTestId('tabs-switcher-alpha').textContent).toBe('Alpha');
        expect(screen.getByTestId('tabs-switcher-beta').textContent).toBe('Beta');
        expect(screen.getByTestId('tabs-switcher-alpha').classList.contains('xh-tab--active')).toBe(
            true
        );
    });

    it('docks the switcher below the content by default', () => {
        const {container} = renderTabs();
        const children = [...container.querySelector('.xh-tab-container').children];
        expect(children.at(-1).classList.contains('xh-tab-switcher--bottom')).toBe(true);
    });

    it('activates a tab when its button is clicked', () => {
        const {model} = renderTabs();
        fireEvent.click(screen.getByTestId('tabs-switcher-beta'));
        expect(model.activeTabId).toBe('beta');
        expect(screen.getByTestId('tabs-switcher-beta').classList.contains('xh-tab--active')).toBe(
            true
        );
    });

    it('shows only the active tab, keeping the others mounted', () => {
        const {model} = renderTabs();
        expect(screen.getByTestId('tabs-alpha').textContent).toBe('Alpha content');
        act(() => model.activateTab('beta'));
        expect(wrapperOf('tabs-alpha').style.display).toBe('none');
        expect(wrapperOf('tabs-beta').style.display).toBe('');
    });

    it('unmounts an inactive tab whose renderMode is unmountOnHide', () => {
        const {model} = renderTabs({}, {renderMode: 'unmountOnHide'});
        act(() => model.activateTab('beta'));
        expect(screen.queryByTestId('tabs-alpha')).toBeNull();
        expect(screen.getByTestId('tabs-beta').textContent).toBe('Beta content');
    });

    it('renders a tab excluded from the switcher, without a button', () => {
        const {model} = renderTabs();
        expect(screen.queryByTestId('tabs-switcher-gamma')).toBeNull();
        act(() => model.activateTab('gamma'));
        expect(screen.getByTestId('tabs-gamma').textContent).toBe('Gamma content');
    });

    it('renders no switcher when switcher is false', () => {
        renderTabs({switcher: false});
        expect(screen.queryByTestId('tabs-switcher')).toBeNull();
    });

    it('rejects a vertical switcher', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        onTestFinished(() => error.mockRestore());
        expect(() => renderTabs({switcher: {orientation: 'left'}})).toThrow(/orientation/);
    });

    it('shows its emptyText when it has no tabs', () => {
        const model = new TabContainerModel({tabs: [], emptyText: 'Nothing here'});
        onTestFinished(() => model.destroy());
        render(tabContainer({model, testId: 'tabs'}));
        expect(screen.getByTestId('tabs').textContent).toBe('Nothing here');
    });
});

//------------------
// Helpers
//------------------
function renderTabs(props: Partial<TabContainerProps> = {}, tabProps: any = {}) {
    const model = new TabContainerModel({
        tabs: [
            {id: 'alpha', title: 'Alpha', content: () => div('Alpha content'), ...tabProps},
            {id: 'beta', title: 'Beta', content: () => div('Beta content'), ...tabProps},
            {
                id: 'gamma',
                title: 'Gamma',
                excludeFromSwitcher: true,
                content: () => div('Gamma content'),
                ...tabProps
            }
        ]
    });
    onTestFinished(() => model.destroy());
    const ret = render(tabContainer({model, testId: 'tabs', ...props}));
    return {...ret, model};
}

function wrapperOf(testId: string): HTMLElement {
    return screen.getByTestId(testId).closest('.xh-tab-wrapper');
}
