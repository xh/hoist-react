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
import {select} from '@xh/hoist/desktop/cmp/input';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {createPortal} from 'react-dom';
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

        it('does not move an item isItemMovable rejects, or any item in a disabled list', () => {
            const onReorder = vi.fn(),
                el = renderList({value: DIMS, onReorder, isItemMovable: it => it.id !== 'region'});

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

    // Rows read model state - an expanded row, a renamed item - so they must re-render on change.
    it('re-renders an item when observable state read by renderItem or renderDetail changes', () => {
        const model = new DimsModel(),
            el = renderList({
                value: DIMS,
                expandedKeys: ['sector'],
                renderItem: it => span(model.expandedId === it.id ? `${it.name} (open)` : it.name),
                renderDetail: it => span(model.expandedId === it.id ? 'Editing' : 'Details')
            });

        act(() => model.setExpandedId('sector'));
        expect(items(el)[1].textContent).toContain('Sector (open)');
        expect(detail(el, 1).textContent).toBe('Editing');
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

    describe('expandable rows', () => {
        const detailText = (it: any) => span(`${it.name} settings`);

        it('opens a row from its chevron, rendering its detail only while open', () => {
            const renderDetail = vi.fn(detailText),
                el = renderList({value: DIMS, renderDetail});

            expect(renderDetail).not.toHaveBeenCalled();
            expect(chevron(el, 1).tagName).toBe('BUTTON');
            expect(chevron(el, 1).getAttribute('aria-expanded')).toBe('false');

            fireEvent.click(chevron(el, 1));
            const region = detail(el, 1);
            expect(chevron(el, 1).getAttribute('aria-expanded')).toBe('true');
            expect(chevron(el, 1).getAttribute('aria-controls')).toBe(region.id);
            expect(region.getAttribute('role')).toBe('region');
            expect(region.getAttribute('aria-label')).toBe('sector details');
            expect(region.textContent).toBe('Sector settings');
            expect(renderDetail.mock.calls.every(([it]) => it.id === 'sector')).toBe(true);

            fireEvent.click(chevron(el, 1));
            expect(detail(el, 1)).toBeNull();
        });

        it('keeps one row open by default, and several with multiExpand', () => {
            const single = renderList({value: DIMS, renderDetail: detailText});
            fireEvent.click(chevron(single, 0));
            fireEvent.click(chevron(single, 2));
            expect(openRows(single)).toEqual([2]);

            const multi = renderList({value: DIMS, renderDetail: detailText, multiExpand: true});
            fireEvent.click(chevron(multi, 0));
            fireEvent.click(chevron(multi, 2));
            expect(openRows(multi)).toEqual([0, 2]);
        });

        it('follows expandedKeys when controlled, reporting changes via onExpandedChange', () => {
            const onExpandedChange = vi.fn(),
                el = renderList({
                    value: DIMS,
                    renderDetail: detailText,
                    expandedKeys: ['fund'],
                    onExpandedChange
                });

            expect(openRows(el)).toEqual([2]);
            fireEvent.click(chevron(el, 0));
            expect(onExpandedChange).toHaveBeenCalledWith(['region']);
            expect(openRows(el)).toEqual([2]);
        });

        it('gives rows that isItemExpandable rejects no chevron and no row toggle', () => {
            const el = renderList({
                value: DIMS,
                renderDetail: detailText,
                isItemExpandable: it => it.id !== 'region'
            });

            expect(chevron(el, 0)).toBeNull();
            fireEvent.click(row(el, 0));
            expect(chevron(el, 1)).not.toBeNull();
            expect(openRows(el)).toEqual([0]);
        });

        // Lets a list show a detail always - a step's body under its header - or track open
        // state itself, as before rows could expand.
        it('always shows the detail of a non-expandable item, when renderDetail returns one', () => {
            const el = renderList({
                value: DIMS,
                isItemExpandable: () => false,
                renderDetail: it => (it.id === 'fund' ? null : detailText(it))
            });

            expect(items(el).some(it => it.querySelector('.xh-sortable-list__expander'))).toBe(
                false
            );
            expect(openRows(el)).toEqual([0, 1]);
            expect(detail(el, 0).hasAttribute('role')).toBe(false);
        });

        it('toggles on a row click, unless toggleOnRowClick is false', () => {
            const el = renderList({value: DIMS, renderDetail: detailText});
            fireEvent.click(row(el, 1));
            expect(openRows(el)).toEqual([1]);
            fireEvent.click(row(el, 1));
            expect(openRows(el)).toEqual([]);

            const off = renderList({
                value: DIMS,
                renderDetail: detailText,
                toggleOnRowClick: false
            });
            fireEvent.click(row(off, 1));
            expect(openRows(off)).toEqual([]);
        });

        it.each([
            ['a button', 'button'],
            ['a link', 'a'],
            ['an input', 'input'],
            ['a select', 'select'],
            ['a textarea', 'textarea'],
            ['a role=button element', '[role=button]'],
            ['a contenteditable element', '[contenteditable]'],
            ['a chip', '.xh-chip'],
            ['a Hoist input', '.xh-input div'],
            ['a combobox', '[role=combobox]'],
            ['a listbox', '[role=listbox] div']
        ])('ignores a row click on %s', (_, selector) => {
            const el = renderList({
                value: DIMS,
                renderDetail: detailText,
                renderItem: () =>
                    div({
                        dangerouslySetInnerHTML: {
                            __html:
                                '<button>b</button><a href="#">a</a><input/><select></select>' +
                                '<textarea></textarea><span role="button">r</span>' +
                                '<span contenteditable="true">e</span><span class="xh-chip">c</span>' +
                                '<div class="xh-input"><div>s</div></div>' +
                                '<div role="combobox">x</div><div role="listbox"><div>o</div></div>'
                        }
                    })
            });

            fireEvent.click(items(el)[1].querySelector(selector));
            expect(openRows(el)).toEqual([]);
        });

        it('ignores a row click on a Hoist select', () => {
            const model = new DimsModel(),
                el = renderList({
                    value: DIMS,
                    renderDetail: detailText,
                    renderItem: () =>
                        select({model, bind: 'expandedId', options: DIMS.map(d => d.id)})
                });

            fireEvent.click(items(el)[1].querySelector('.xh-select__control'));
            expect(openRows(el)).toEqual([]);
        });

        // React bubbles a portal's click - a select menu, a popover - up to the row that renders it.
        it('ignores a click from a portal that a row renders', () => {
            const el = renderList({
                value: DIMS,
                renderDetail: detailText,
                renderItem: it =>
                    it.id === 'sector'
                        ? createPortal(
                              span({className: 'popover-pick', children: 'Pick'}),
                              document.body
                          )
                        : span(it.name)
            });

            fireEvent.click(document.querySelector('.popover-pick'));
            expect(openRows(el)).toEqual([]);
        });

        it('ignores a row click on the drag handle', () => {
            const el = renderList({value: DIMS, renderDetail: detailText});
            fireEvent.click(handles(el)[1]);
            expect(openRows(el)).toEqual([]);
        });

        it('ignores a row click that ends a text selection', () => {
            const el = renderList({value: DIMS, renderDetail: detailText});
            vi.spyOn(window, 'getSelection').mockReturnValue({
                isCollapsed: false,
                toString: () => 'Sect'
            } as Selection);

            fireEvent.click(row(el, 1));
            expect(openRows(el)).toEqual([]);
            vi.restoreAllMocks();
        });

        it('ignores the click that ends a drag', () => {
            const el = renderList({value: DIMS, renderDetail: detailText});
            fireEvent.pointerDown(row(el, 1), {clientX: 10, clientY: 10});
            fireEvent.click(row(el, 1), {clientX: 10, clientY: 40});
            expect(openRows(el)).toEqual([]);
        });

        it('never toggles on a row click with handle: item, though the chevron works', () => {
            const el = renderList({value: DIMS, renderDetail: detailText, handle: 'item'});
            fireEvent.click(row(el, 1));
            expect(openRows(el)).toEqual([]);

            fireEvent.click(chevron(el, 1));
            expect(openRows(el)).toEqual([1]);
        });

        it('keeps a row open when the list reorders', () => {
            const model = new DimsModel(),
                el = renderList({model, bind: 'dims', renderDetail: detailText});

            fireEvent.click(chevron(el, 1));
            fireEvent.keyDown(handles(el)[1], {key: 'ArrowUp', altKey: true});
            expect(model.dims[0].id).toBe('sector');
            expect(openRows(el)).toEqual([0]);
            expect(detail(el, 0).textContent).toBe('Sector settings');
        });
    });

    describe('remove', () => {
        it('shows a named remove button only on removable items', () => {
            const el = renderList({
                value: DIMS,
                onRemove: vi.fn(),
                isItemRemovable: it => it.id !== 'fund'
            });

            expect(removeButton(el, 0).getAttribute('aria-label')).toBe('Remove region');
            expect(removeButton(el, 2)).toBeNull();
            expect(renderList({value: DIMS}).querySelector('.xh-sortable-list__remove')).toBeNull();
        });

        it('writes the list without the item through bind, then calls onRemove', () => {
            const model = new DimsModel(),
                onRemove = vi.fn(),
                el = renderList({model, bind: 'dims', onRemove});

            fireEvent.click(removeButton(el, 1));
            expect(model.dims.map(it => it.id)).toEqual(['region', 'fund']);
            expect(onRemove).toHaveBeenCalledWith({
                item: DIMS[1],
                index: 1,
                items: [DIMS[0], DIMS[2]]
            });
        });

        it('is turned on by removable alone, writing through bind', () => {
            const model = new DimsModel(),
                el = renderList({model, bind: 'dims', removable: true});

            fireEvent.click(removeButton(el, 0));
            expect(model.dims.map(it => it.id)).toEqual(['sector', 'fund']);
        });

        it('leaves a list without bind to the caller', () => {
            const onRemove = vi.fn(),
                el = renderList({value: DIMS, onRemove});

            fireEvent.click(removeButton(el, 0));
            expect(onRemove).toHaveBeenCalledTimes(1);
            expect(items(el)).toHaveLength(3);
        });

        it('removes on Delete or Backspace on a handle, keeping the key from ancestors', () => {
            const model = new DimsModel(),
                ancestorKeyDown = vi.fn(),
                el = render(
                    div({
                        onKeyDown: ancestorKeyDown,
                        children: sortableList({
                            model,
                            bind: 'dims',
                            onRemove: () => {},
                            renderItem: it => span(it.name)
                        })
                    })
                ).container.querySelector<HTMLElement>('.xh-sortable-list');

            fireEvent.keyDown(handles(el)[0], {key: 'Delete'});
            fireEvent.keyDown(handles(el)[0], {key: 'Backspace'});
            expect(model.dims.map(it => it.id)).toEqual(['fund']);
            expect(ancestorKeyDown).not.toHaveBeenCalled();
        });

        it('moves focus to the next item, or the previous one after the last, and announces it', () => {
            const model = new DimsModel(),
                el = renderList({model, bind: 'dims', onRemove: () => {}});

            fireEvent.click(removeButton(el, 1));
            expect(document.activeElement).toBe(handles(el)[1]);
            expect(handles(el)[1].getAttribute('aria-label')).toBe('fund');
            expect(status(el).textContent).toBe('Removed sector.');

            fireEvent.click(removeButton(el, 1));
            expect(document.activeElement).toBe(handles(el)[0]);
        });
    });

    describe('add', () => {
        const newDim = {id: 'book', name: 'Book'};

        it('shows an Add row only with onAdd, labelled by addText', () => {
            expect(addRow(renderList({value: DIMS}))).toBeNull();
            expect(addRow(renderList({value: DIMS, onAdd: vi.fn()})).textContent).toBe('Add...');
            expect(
                addRow(renderList({value: DIMS, onAdd: vi.fn(), addText: 'Add level'})).textContent
            ).toBe('Add level');
        });

        it('appends the item onAdd returns through bind, focuses it and opens its detail', async () => {
            const model = new DimsModel(),
                el = renderList({
                    model,
                    bind: 'dims',
                    onAdd: () => newDim,
                    renderDetail: it => span(`${it.name} settings`)
                });

            await act(async () => fireEvent.click(addRow(el)));
            expect(model.dims.map(it => it.id)).toEqual(['region', 'sector', 'fund', 'book']);
            expect(document.activeElement).toBe(handles(el)[3]);
            expect(openRows(el)).toEqual([3]);
            expect(status(el).textContent).toBe('Added book.');
        });

        it('waits for an async onAdd, and adds nothing when it returns null', async () => {
            const model = new DimsModel(),
                el = renderList({model, bind: 'dims', onAdd: async () => newDim}),
                none = renderList({model: new DimsModel(), bind: 'dims', onAdd: () => null});

            await act(async () => fireEvent.click(addRow(el)));
            expect(model.dims).toHaveLength(4);

            await act(async () => fireEvent.click(addRow(none)));
            expect(items(none)).toHaveLength(3);
        });

        it('focuses the Add row once the last item is removed', () => {
            const el = renderList({
                model: new DimsModel(),
                bind: 'dims',
                onRemove: () => {},
                onAdd: () => null
            });

            fireEvent.click(removeButton(el, 2));
            fireEvent.click(removeButton(el, 1));
            fireEvent.click(removeButton(el, 0));
            expect(document.activeElement).toBe(addRow(el));
        });
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

function row(el: HTMLElement, idx: number): HTMLElement {
    return items(el)[idx].querySelector('.xh-sortable-list__row');
}

function chevron(el: HTMLElement, idx: number): HTMLElement {
    return items(el)[idx].querySelector('.xh-sortable-list__expander');
}

function detail(el: HTMLElement, idx: number): HTMLElement {
    return items(el)[idx].querySelector('.xh-sortable-list__detail');
}

function openRows(el: HTMLElement): number[] {
    return items(el)
        .map((it, idx) => (it.querySelector('.xh-sortable-list__detail') ? idx : -1))
        .filter(idx => idx >= 0);
}

function removeButton(el: HTMLElement, idx: number): HTMLElement {
    return items(el)[idx].querySelector('.xh-sortable-list__remove');
}

function addRow(el: HTMLElement): HTMLElement {
    return el.querySelector('.xh-sortable-list__add');
}

function status(el: HTMLElement): HTMLElement {
    return el.querySelector('.xh-sortable-list__status');
}
