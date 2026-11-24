/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {div, htmlButton, input, span} from '@xh/hoist/cmp/layout';
import {sortableList} from '@xh/hoist/cmp/sortablelist';
import type {SortableListProps} from '@xh/hoist/cmp/sortablelist';
import type {HoistProps} from '@xh/hoist/core';
import {hoistCmp, HoistModel} from '@xh/hoist/core';
import {action, observable, observableRef} from '@xh/hoist/mobx';
import {select} from '@xh/hoist/desktop/cmp/input';
import {wait} from '@xh/hoist/promise';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {uniq} from 'lodash';
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
                        children: sortableList({value: DIMS, itemRenderer: it => span(it.name)})
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
                    itemRenderer: it => input({className: 'name-input', defaultValue: it.name})
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
    it('re-renders an item when observable state read by itemRenderer or detailRenderer changes', () => {
        const model = new DimsModel(),
            el = renderList({
                value: DIMS,
                expandedKeys: ['sector'],
                itemRenderer: it =>
                    span(model.expandedId === it.id ? `${it.name} (open)` : it.name),
                detailRenderer: it => span(model.expandedId === it.id ? 'Editing' : 'Details')
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
            itemRenderer: (it, {handleRef}) => div({ref: handleRef, className: 'my-grip'})
        });

        expect(el.querySelector('.my-grip').getAttribute('aria-label')).toBe('Region');
    });

    describe('expandable rows', () => {
        const detailText = (it: any) => span(`${it.name} settings`);

        it('opens a row from its chevron, rendering its detail only while open', () => {
            const detailRenderer = vi.fn(detailText),
                el = renderList({value: DIMS, detailRenderer});

            expect(detailRenderer).not.toHaveBeenCalled();
            expect(chevron(el, 1).tagName).toBe('BUTTON');
            expect(chevron(el, 1).getAttribute('aria-expanded')).toBe('false');

            fireEvent.click(chevron(el, 1));
            const region = detail(el, 1);
            expect(chevron(el, 1).getAttribute('aria-expanded')).toBe('true');
            expect(chevron(el, 1).getAttribute('aria-controls')).toBe(region.id);
            expect(region.getAttribute('role')).toBe('region');
            expect(region.getAttribute('aria-label')).toBe('sector details');
            expect(region.textContent).toBe('Sector settings');
            expect(detailRenderer.mock.calls.every(([it]) => it.id === 'sector')).toBe(true);

            fireEvent.click(chevron(el, 1));
            expect(detail(el, 1)).toBeNull();
        });

        it('keeps one row open by default, and several with multiExpand', () => {
            const single = renderList({value: DIMS, detailRenderer: detailText});
            fireEvent.click(chevron(single, 0));
            fireEvent.click(chevron(single, 2));
            expect(openRows(single)).toEqual([2]);

            const multi = renderList({value: DIMS, detailRenderer: detailText, multiExpand: true});
            fireEvent.click(chevron(multi, 0));
            fireEvent.click(chevron(multi, 2));
            expect(openRows(multi)).toEqual([0, 2]);
        });

        it('follows expandedKeys when controlled, reporting changes via onExpandedChange', () => {
            const onExpandedChange = vi.fn(),
                el = renderList({
                    value: DIMS,
                    detailRenderer: detailText,
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
                detailRenderer: detailText,
                isItemExpandable: it => it.id !== 'region'
            });

            expect(chevron(el, 0)).toBeNull();
            fireEvent.click(row(el, 0));
            expect(chevron(el, 1)).not.toBeNull();
            expect(openRows(el)).toEqual([0]);
        });

        // Lets a list show a detail always - a step's body under its header - or track open
        // state itself, as before rows could expand.
        it('always shows the detail of a non-expandable item, when detailRenderer returns one', () => {
            const el = renderList({
                value: DIMS,
                isItemExpandable: () => false,
                detailRenderer: it => (it.id === 'fund' ? null : detailText(it))
            });

            expect(items(el).some(it => it.querySelector('.xh-sortable-list__expander'))).toBe(
                false
            );
            expect(openRows(el)).toEqual([0, 1]);
            expect(detail(el, 0).hasAttribute('role')).toBe(false);
        });

        it('toggles on a row click, unless toggleOnRowClick is false', () => {
            const el = renderList({value: DIMS, detailRenderer: detailText});
            fireEvent.click(row(el, 1));
            expect(openRows(el)).toEqual([1]);
            fireEvent.click(row(el, 1));
            expect(openRows(el)).toEqual([]);

            const off = renderList({
                value: DIMS,
                detailRenderer: detailText,
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
                detailRenderer: detailText,
                itemRenderer: () =>
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
                    detailRenderer: detailText,
                    itemRenderer: () =>
                        select({model, bind: 'expandedId', options: DIMS.map(d => d.id)})
                });

            fireEvent.click(items(el)[1].querySelector('.xh-select__control'));
            expect(openRows(el)).toEqual([]);
        });

        // React bubbles a portal's click - a select menu, a popover - up to the row that renders it.
        it('ignores a click from a portal that a row renders', () => {
            const el = renderList({
                value: DIMS,
                detailRenderer: detailText,
                itemRenderer: it =>
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
            const el = renderList({value: DIMS, detailRenderer: detailText});
            fireEvent.click(handles(el)[1]);
            expect(openRows(el)).toEqual([]);
        });

        it('ignores a row click that ends a text selection', () => {
            const el = renderList({value: DIMS, detailRenderer: detailText});
            vi.spyOn(window, 'getSelection').mockReturnValue({
                isCollapsed: false,
                toString: () => 'Sect'
            } as Selection);

            fireEvent.click(row(el, 1));
            expect(openRows(el)).toEqual([]);
            vi.restoreAllMocks();
        });

        it('ignores the click that ends a drag', () => {
            const el = renderList({value: DIMS, detailRenderer: detailText});
            fireEvent.pointerDown(row(el, 1), {clientX: 10, clientY: 10});
            fireEvent.click(row(el, 1), {clientX: 10, clientY: 40});
            expect(openRows(el)).toEqual([]);
        });

        it('never toggles on a row click with handle: item, though the chevron works', () => {
            const el = renderList({value: DIMS, detailRenderer: detailText, handle: 'item'});
            fireEvent.click(row(el, 1));
            expect(openRows(el)).toEqual([]);

            fireEvent.click(chevron(el, 1));
            expect(openRows(el)).toEqual([1]);
        });

        it('keeps a row open when the list reorders', () => {
            const model = new DimsModel(),
                el = renderList({model, bind: 'dims', detailRenderer: detailText});

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
                            itemRenderer: it => span(it.name)
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

        it('shows an Add row only with getNewItem or addRenderer, labelled by addText', () => {
            expect(addRow(renderList({value: DIMS, onAdd: vi.fn()}))).toBeNull();
            expect(addRow(renderList({value: DIMS, getNewItem: vi.fn()})).textContent).toBe(
                'Add...'
            );
            expect(
                addRow(renderList({value: DIMS, getNewItem: vi.fn(), addText: 'Add level'}))
                    .textContent
            ).toBe('Add level');
            expect(
                addRow(renderList({value: DIMS, addRenderer: () => span('Pick one')})).textContent
            ).toBe('Pick one');
        });

        describe('built-in button', () => {
            it('appends the item getNewItem returns through bind, then calls onAdd', async () => {
                const model = new DimsModel(),
                    onAdd = vi.fn(),
                    el = renderList({model, bind: 'dims', getNewItem: () => newDim, onAdd});

                await act(async () => fireEvent.click(addRow(el)));
                expect(model.dims.map(it => it.id)).toEqual(['region', 'sector', 'fund', 'book']);
                expect(onAdd).toHaveBeenCalledExactlyOnceWith({
                    item: newDim,
                    index: 3,
                    items: model.dims
                });
                expect(status(el).textContent).toBe('Added book.');
            });

            it('focuses the new item, opening its detail', async () => {
                const el = renderList({
                    model: new DimsModel(),
                    bind: 'dims',
                    getNewItem: () => newDim,
                    detailRenderer: it => span(`${it.name} settings`)
                });

                await act(async () => fireEvent.click(addRow(el)));
                expect(document.activeElement).toBe(handles(el)[3]);
                expect(openRows(el)).toEqual([3]);
            });

            it('waits for an async getNewItem, and adds nothing when it returns null', async () => {
                const model = new DimsModel(),
                    onAdd = vi.fn(),
                    el = renderList({model, bind: 'dims', getNewItem: async () => newDim}),
                    none = renderList({
                        model: new DimsModel(),
                        bind: 'dims',
                        getNewItem: () => null,
                        onAdd
                    });

                await act(async () => fireEvent.click(addRow(el)));
                expect(model.dims).toHaveLength(4);

                await act(async () => fireEvent.click(addRow(none)));
                expect(items(none)).toHaveLength(3);
                expect(onAdd).not.toHaveBeenCalled();
            });

            it('leaves a list without bind to onAdd', async () => {
                const onAdd = vi.fn(),
                    el = renderList({value: DIMS, getNewItem: () => newDim, onAdd});

                await act(async () => fireEvent.click(addRow(el)));
                expect(items(el)).toHaveLength(3);
                expect(onAdd).toHaveBeenCalledExactlyOnceWith({
                    item: newDim,
                    index: 3,
                    items: [...DIMS, newDim]
                });
            });

            it('focuses the Add row once the last item is removed', () => {
                const el = renderList({
                    model: new DimsModel(),
                    bind: 'dims',
                    onRemove: () => {},
                    getNewItem: () => null
                });

                fireEvent.click(removeButton(el, 2));
                fireEvent.click(removeButton(el, 1));
                fireEvent.click(removeButton(el, 0));
                expect(document.activeElement).toBe(addRow(el));
            });
        });

        describe('addRenderer', () => {
            const picker = ({add}) =>
                htmlButton({className: 'picker', onClick: () => add(newDim), children: 'Pick'});

            it('appends each item its control passes to ctx.add, then calls onAdd', () => {
                const model = new DimsModel(),
                    onAdd = vi.fn(),
                    el = renderList({model, bind: 'dims', addRenderer: picker, onAdd});

                fireEvent.click(el.querySelector('.picker'));
                expect(model.dims.map(it => it.id)).toEqual(['region', 'sector', 'fund', 'book']);
                expect(onAdd).toHaveBeenCalledExactlyOnceWith({
                    item: newDim,
                    index: 3,
                    items: model.dims
                });
                expect(status(el).textContent).toBe('Added book.');
            });

            it('keeps focus in its control after adding an item with no detail', () => {
                const el = renderList({model: new DimsModel(), bind: 'dims', addRenderer: picker}),
                    control = el.querySelector<HTMLElement>('.picker');

                control.focus();
                fireEvent.click(control);
                expect(document.activeElement).toBe(control);
            });

            // As GroupingChooser's select does, keyed on its options to clear its typed text.
            it('refocuses a control that remounts on the add', () => {
                const model = new DimsModel(),
                    el = renderList({
                        model,
                        bind: 'dims',
                        addRenderer: ({add}) => remountingPicker({dimsModel: model, add})
                    }),
                    control = el.querySelector<HTMLElement>('.picker');

                control.focus();
                fireEvent.click(control);
                const next = el.querySelector<HTMLElement>('.picker');
                expect(next).not.toBe(control);
                expect(document.activeElement).toBe(next);
            });

            it('focuses an added item with a detail, opening it', () => {
                const el = renderList({
                    model: new DimsModel(),
                    bind: 'dims',
                    addRenderer: picker,
                    detailRenderer: it => span(`${it.name} settings`)
                });

                fireEvent.click(chevron(el, 0));
                fireEvent.click(el.querySelector('.picker'));
                expect(document.activeElement).toBe(handles(el)[3]);
                expect(openRows(el)).toEqual([3]);
            });

            it('passes the current items and disabled state', () => {
                const addRenderer = vi.fn(() => null);
                renderList({value: DIMS, addRenderer, disabled: true});
                expect(addRenderer).toHaveBeenLastCalledWith(
                    expect.objectContaining({items: DIMS, disabled: true})
                );
            });

            it('focuses its control once the last item is removed', () => {
                const el = renderList({
                    model: new DimsModel(),
                    bind: 'dims',
                    removable: true,
                    addRenderer: picker
                });

                fireEvent.click(removeButton(el, 2));
                fireEvent.click(removeButton(el, 1));
                fireEvent.click(removeButton(el, 0));
                expect(document.activeElement).toBe(el.querySelector('.picker'));
            });
        });
    });

    it('shows emptyText while there are no items', () => {
        expect(emptyRow(renderList({value: [], emptyText: 'Ungrouped'})).textContent).toBe(
            'Ungrouped'
        );
        expect(emptyRow(renderList({value: DIMS, emptyText: 'Ungrouped'}))).toBeNull();
        expect(emptyRow(renderList({value: []}))).toBeNull();
    });

    /**
     * Rows can be heavy - a detail row may hold a whole editor - so a list re-render, a drag or a
     * move must re-render only the rows it changes, and never an open detail it doesn't change.
     */
    describe('render cost', () => {
        function setup(props: Partial<SortableListProps> = {}) {
            const itemRenderer = vi.fn((it: any) => span(it.name)),
                detailRenderer = vi.fn((it: any) => span(`${it.name} settings`)),
                listProps = {
                    value: DIMS,
                    itemRenderer,
                    detailRenderer,
                    expandedKeys: ['fund'],
                    ...props
                } as SortableListProps,
                {container, rerender} = render(sortableList(listProps)),
                el = container.querySelector<HTMLElement>('.xh-sortable-list'),
                rendered = () => itemRenderer.mock.calls.map(([it]) => it.id);
            itemRenderer.mockClear();
            detailRenderer.mockClear();
            return {
                el,
                itemRenderer,
                detailRenderer,
                rendered,
                rerender: () => rerender(sortableList({...listProps, className: 'changed'}))
            };
        }

        it('re-renders no row when the list re-renders with the same items', () => {
            const {itemRenderer, detailRenderer, rerender} = setup();
            rerender();
            expect(itemRenderer).not.toHaveBeenCalled();
            expect(detailRenderer).not.toHaveBeenCalled();
        });

        it('re-renders only the rows a move swaps, leaving an open detail alone', () => {
            const {el, detailRenderer, rendered} = setup({
                value: null,
                model: new DimsModel(),
                bind: 'dims'
            });
            fireEvent.keyDown(handles(el)[0], {key: 'ArrowDown', altKey: true});
            expect(rendered().sort()).toEqual(['region', 'sector']);
            expect(detailRenderer).not.toHaveBeenCalled();
        });

        // A keyboard drag runs in jsdom given the two browser APIs dnd-kit's drag start calls.
        it('re-renders only the lifted row at drag start, leaving its open detail alone', async () => {
            vi.stubGlobal(
                'IntersectionObserver',
                class {
                    observe() {}
                    disconnect() {}
                }
            );
            Document.prototype.getAnimations = Element.prototype.getAnimations = () => [];
            const {el, detailRenderer, rendered} = setup();
            await act(() => wait(20));
            handles(el)[2].focus();
            await act(async () => {
                fireEvent.keyDown(handles(el)[2], {key: ' ', code: 'Space'});
                await wait(50);
            });
            expect(el.classList).toContain('xh-sortable-list--keyboard-drag');
            expect(uniq(rendered())).toEqual(['fund']);
            expect(detailRenderer).not.toHaveBeenCalled();
            delete Document.prototype.getAnimations;
            delete Element.prototype.getAnimations;
            vi.unstubAllGlobals();
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

const remountingPicker = hoistCmp.factory<HoistProps & {dimsModel: DimsModel; add: (it) => void}>({
    model: false,
    render({dimsModel, add}) {
        const n = dimsModel.dims.length;
        return htmlButton({
            key: n,
            className: 'picker',
            onClick: () => add({id: `new${n}`, name: `New ${n}`}),
            children: 'Pick'
        });
    }
});

function renderList(props: Partial<SortableListProps>): HTMLElement {
    return render(
        sortableList({itemRenderer: it => span(it.name), ...props} as SortableListProps)
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

function emptyRow(el: HTMLElement): HTMLElement {
    return el.querySelector('.xh-sortable-list__empty');
}

function status(el: HTMLElement): HTMLElement {
    return el.querySelector('.xh-sortable-list__status');
}
