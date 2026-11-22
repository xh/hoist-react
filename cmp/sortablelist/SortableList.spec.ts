/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {div, input, span} from '@xh/hoist/cmp/layout';
import {sortableList} from '@xh/hoist/cmp/sortablelist';
import type {SortableListProps} from '@xh/hoist/cmp/sortablelist';
import {HoistModel} from '@xh/hoist/core';
import {action, observable, observableRef} from '@xh/hoist/mobx';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {act, fireEvent, render} from '@testing-library/react';
import {beforeAll, describe, expect, it, vi} from 'vitest';

/**
 * Callers turn each reorder into one persisted edit - a pref, a server call, an undoable step - so
 * `onReorder` must fire exactly once per completed move and never for a no-op. Lists sit inside
 * surfaces with their own shortcuts, so the keys a list handles must not reach them.
 */
describe('SortableList', () => {
    beforeAll(() => initTestAppAsync());

    const DIMS = [
        {id: 'region', name: 'Region'},
        {id: 'sector', name: 'Sector'},
        {id: 'fund', name: 'Fund'}
    ];

    describe('Alt+Arrow', () => {
        it('moves the focused item one place and reports one reorder', () => {
            const onReorder = vi.fn(),
                el = renderList({value: DIMS, onReorder});

            fireEvent.keyDown(handles(el)[0], {key: 'ArrowDown', altKey: true});

            expect(onReorder).toHaveBeenCalledTimes(1);
            expect(onReorder).toHaveBeenCalledWith({
                item: DIMS[0],
                fromIndex: 0,
                toIndex: 1,
                items: [DIMS[1], DIMS[0], DIMS[2]],
                source: 'keyboard'
            });
        });

        it('reports nothing for a move past either end', () => {
            const onReorder = vi.fn(),
                el = renderList({value: DIMS, onReorder});

            fireEvent.keyDown(handles(el)[0], {key: 'ArrowUp', altKey: true});
            fireEvent.keyDown(handles(el)[2], {key: 'ArrowDown', altKey: true});
            expect(onReorder).not.toHaveBeenCalled();
        });

        it('uses the left and right arrows in a horizontal list', () => {
            const onReorder = vi.fn(),
                el = renderList({value: DIMS, onReorder, orientation: 'horizontal'});

            fireEvent.keyDown(handles(el)[1], {key: 'ArrowDown', altKey: true});
            expect(onReorder).not.toHaveBeenCalled();

            fireEvent.keyDown(handles(el)[1], {key: 'ArrowLeft', altKey: true});
            expect(onReorder.mock.calls[0][0]).toMatchObject({fromIndex: 1, toIndex: 0});
        });

        it('stops propagating, while other keys still bubble', () => {
            const ancestorKeyDown = vi.fn(),
                el = render(
                    div({
                        onKeyDown: ancestorKeyDown,
                        children: sortableList({value: DIMS, renderItem: it => span(it.name)})
                    })
                ).container.querySelector<HTMLElement>('.xh-sortable-list');

            fireEvent.keyDown(handles(el)[0], {key: 'ArrowDown', altKey: true});
            expect(ancestorKeyDown).not.toHaveBeenCalled();

            fireEvent.keyDown(handles(el)[0], {key: 'Delete'});
            expect(ancestorKeyDown).toHaveBeenCalledTimes(1);
        });

        it('ignores keys from inputs inside an item', () => {
            const onReorder = vi.fn(),
                el = renderList({
                    value: DIMS,
                    onReorder,
                    renderItem: it => input({className: 'name-input', defaultValue: it.name})
                });

            fireEvent.keyDown(el.querySelector('.name-input'), {key: 'ArrowDown', altKey: true});
            expect(onReorder).not.toHaveBeenCalled();
        });

        it('does not move a disabled item, or any item in a disabled list', () => {
            const onReorder = vi.fn(),
                el = renderList({value: DIMS, onReorder, isItemDisabled: it => it.id === 'region'});

            fireEvent.keyDown(handles(el)[0], {key: 'ArrowDown', altKey: true});
            expect(onReorder).not.toHaveBeenCalled();

            const disabledList = renderList({value: DIMS, onReorder, disabled: true});
            fireEvent.keyDown(handles(disabledList)[1], {key: 'ArrowDown', altKey: true});
            expect(onReorder).not.toHaveBeenCalled();
        });

        it('works from the item itself with handle: item', () => {
            const onReorder = vi.fn(),
                el = renderList({value: DIMS, onReorder, handle: 'item'});

            expect(handles(el)).toHaveLength(0);
            fireEvent.keyDown(items(el)[2], {key: 'ArrowUp', altKey: true});
            expect(onReorder.mock.calls[0][0]).toMatchObject({fromIndex: 2, toIndex: 1});
        });
    });

    it('writes the new order through the bound model setter, then calls onReorder', () => {
        const model = new DimsModel(),
            onReorder = vi.fn(),
            el = renderList({model, bind: 'dims', onReorder});

        fireEvent.keyDown(handles(el)[1], {key: 'ArrowDown', altKey: true});

        expect(model.setCount).toBe(1);
        expect(model.dims.map(it => it.id)).toEqual(['region', 'fund', 'sector']);
        expect(onReorder).toHaveBeenCalledTimes(1);
    });

    it('renders a detail under an item only when renderDetail returns content', () => {
        const el = renderList({
            value: DIMS,
            renderDetail: it => (it.id === 'sector' ? span('Sector settings') : null)
        });

        const details = el.querySelectorAll('.xh-sortable-list__detail');
        expect(details).toHaveLength(1);
        expect(items(el)[1].contains(details[0])).toBe(true);
    });

    // Rows read model state - an expanded row, a renamed item - so they must re-render on change.
    it('re-renders an item when observable state read by renderItem or renderDetail changes', () => {
        const model = new DimsModel(),
            el = renderList({
                value: DIMS,
                renderItem: it => span(model.expandedId === it.id ? `${it.name} (open)` : it.name),
                renderDetail: it => (model.expandedId === it.id ? span('Details') : null)
            });

        expect(el.querySelector('.xh-sortable-list__detail')).toBeNull();
        act(() => model.setExpandedId('sector'));
        expect(items(el)[1].textContent).toContain('Sector (open)');
        expect(items(el)[1].querySelector('.xh-sortable-list__detail')).not.toBeNull();
    });

    // jsdom keeps focus on a node React moves, so this can't catch the browser's focus loss.
    it('leaves focus on the moved item handle after Alt+Arrow', () => {
        const model = new DimsModel(),
            el = renderList({model, bind: 'dims'});

        handles(el)[0].focus();
        fireEvent.keyDown(handles(el)[0], {key: 'ArrowDown', altKey: true});
        expect(document.activeElement).toBe(handles(el)[1]);
        expect(document.activeElement.getAttribute('aria-label')).toBe('region');
    });

    it('names a custom handle after its item', () => {
        const el = renderList({
            value: DIMS,
            handle: 'custom',
            getItemLabel: it => it.name,
            renderItem: (it, {handleRef}) => div({ref: handleRef, className: 'my-grip'})
        });

        expect(el.querySelector('.my-grip').getAttribute('aria-label')).toBe('Region');
    });

    it('throws for a duplicate or missing item key', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => renderList({value: [DIMS[0], {...DIMS[0]}]})).toThrow(/unique/);
        expect(() => renderList({value: [{name: 'No id'}]})).toThrow(/key for every item/);
        vi.restoreAllMocks();
    });
});

class DimsModel extends HoistModel {
    @observableRef accessor dims = [
        {id: 'region', name: 'Region'},
        {id: 'sector', name: 'Sector'},
        {id: 'fund', name: 'Fund'}
    ];

    @observable accessor expandedId: string = null;

    setCount = 0;

    @action
    setExpandedId(id: string) {
        this.expandedId = id;
    }

    @action
    setDims(dims) {
        this.setCount++;
        this.dims = dims;
    }
}

function renderList(props: Partial<SortableListProps>): HTMLElement {
    return render(
        sortableList({renderItem: it => span(it.name), ...props} as SortableListProps)
    ).container.querySelector('.xh-sortable-list');
}

function handles(el: HTMLElement): HTMLElement[] {
    return Array.from(el.querySelectorAll('.xh-sortable-list__handle'));
}

function items(el: HTMLElement): HTMLElement[] {
    return Array.from(el.querySelectorAll('.xh-sortable-list__item'));
}
