/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {div} from '@xh/hoist/cmp/layout';
import {dashContainer, DashContainerModel} from '@xh/hoist/desktop/cmp/dash';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {act, render, waitFor} from '@testing-library/react';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * View titles come from app code, from a user's rename, and from saved or shared state, so a tab
 * must show a title as text. Markup parsed into the page, even briefly, runs script.
 */
describe('DashContainer', () => {
    beforeAll(() => initTestAppAsync());

    it('shows view titles as text, never parsing them as markup', async () => {
        const added = watchAddedElements(),
            model = new DashContainerModel({
                viewSpecs: [
                    {id: 'spec', title: '<b class="probe">Spec</b>', content: () => div()},
                    {id: 'renamed', title: 'Renamed', content: () => div()}
                ],
                initialState: [
                    {
                        type: 'stack',
                        content: [
                            {type: 'view', id: 'spec'},
                            {type: 'view', id: 'renamed', title: '<i class="probe">Saved</i>'}
                        ]
                    }
                ]
            });
        onTestFinished(() => model.destroy());

        const {container} = render(dashContainer({model}));
        await waitFor(() => expect(container.querySelectorAll('.lm_tab')).toHaveLength(2));
        await act(() => Promise.resolve());

        expect(titles(container)).toEqual([
            '<b class="probe">Spec</b>',
            '<i class="probe">Saved</i>'
        ]);
        expect(added.filter(it => it.classList.contains('probe'))).toEqual([]);
    });
});

//------------------
// Helpers
//------------------
// Every element added to the page from here on, even one removed again at once.
function watchAddedElements(): Element[] {
    const ret: Element[] = [],
        observer = new MutationObserver(records =>
            records.forEach(r =>
                r.addedNodes.forEach(n => {
                    if (n instanceof Element) ret.push(n, ...n.querySelectorAll('*'));
                })
            )
        );
    observer.observe(document.body, {childList: true, subtree: true});
    onTestFinished(() => observer.disconnect());
    return ret;
}

function titles(container: HTMLElement): string[] {
    return Array.from(container.querySelectorAll('.lm_tab .lm_title'), it => it.textContent);
}
