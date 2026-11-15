/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {itemList} from '@xh/hoist/cmp/itemlist';
import type {ItemListEntry, ItemListProps} from '@xh/hoist/cmp/itemlist';
import {span} from '@xh/hoist/cmp/layout';
import {Icon} from '@xh/hoist/icon';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {fireEvent, render} from '@testing-library/react';
import {beforeAll, describe, expect, it, vi} from 'vitest';

/**
 * An ItemList takes plain data that is often partial: entries left out, null entries, some with
 * an icon and some without. It must render what it has as a real HTML list, keep the text of its
 * entries aligned, and work from the keyboard when its entries are clickable.
 */
describe('ItemList', () => {
    beforeAll(() => initTestAppAsync());

    it('renders an unordered list with an entry per item, in order', () => {
        const root = renderRoot({entries: [{title: 'First'}, {title: 'Second'}]});

        expect(root.tagName).toBe('UL');
        expect(root.getAttribute('role')).toBe('list');
        expect(texts(root, 'title')).toEqual(['First', 'Second']);
        expect(root.querySelectorAll('li')).toHaveLength(2);
    });

    it('shows the description and detail of an entry only when given', () => {
        const root = renderRoot({
            entries: [{title: 'Plain'}, {title: 'Full', description: 'More text', detail: '2m ago'}]
        });
        const [plain, full] = entriesOf(root);

        expect(part(plain, 'description')).toBeNull();
        expect(part(plain, 'detail')).toBeNull();
        expect(part(full, 'description').textContent).toBe('More text');
        expect(part(full, 'detail').textContent).toBe('2m ago');
    });

    it('renders element content in each slot, and a string as text', () => {
        const root = renderRoot({
            entries: [{title: '<b>Bold</b>', detail: span({className: 'figure', item: '42'})}]
        });

        expect(part(root, 'title').textContent).toBe('<b>Bold</b>');
        expect(part(root, 'title').querySelector('b')).toBeNull();
        expect(part(root, 'detail').querySelector('.figure').textContent).toBe('42');
    });

    it('skips null entries and those marked omit', () => {
        const root = renderRoot({
            entries: [{title: 'A'}, null, {title: 'B', omit: true}, {title: 'C'}]
        });

        expect(texts(root, 'title')).toEqual(['A', 'C']);
    });

    it.each([
        ['an empty array', []],
        ['a missing array', null],
        ['only omitted entries', [{title: 'A', omit: true}]]
    ])('renders nothing for %s', (name, entries) => {
        expect(render(itemList({entries})).container.innerHTML).toBe('');
    });

    it('shows emptyText in place of an empty list, with layout props and class name', () => {
        const root = renderRoot({entries: [], emptyText: 'No alerts', width: 200});

        expect(root.tagName).toBe('DIV');
        expect(root.classList).toContain('xh-item-list--empty');
        expect(root.textContent).toBe('No alerts');
        expect(root.style.width).toBe('200px');
    });

    describe('markers', () => {
        it('has none when no entry has an icon or intent', () => {
            const root = renderRoot({entries: [{title: 'A'}, {title: 'B'}]});

            expect(part(root, 'marker')).toBeNull();
        });

        it('keeps the space of a missing icon, so that every title lines up', () => {
            const root = renderRoot({entries: [{title: 'A', icon: Icon.warning()}, {title: 'B'}]}),
                [withIcon, without] = entriesOf(root);

            expect(part(withIcon, 'marker--icon').querySelector('svg')).not.toBeNull();
            expect(part(without, 'marker--icon').childElementCount).toBe(0);
        });

        it('numbers the entries shown in an ordered list, in place of icons', () => {
            const root = renderRoot({
                ordered: true,
                entries: [
                    {title: 'A', icon: Icon.warning()},
                    {title: 'B', omit: true},
                    {title: 'C'}
                ]
            });

            expect(root.tagName).toBe('OL');
            expect(texts(root, 'marker--number')).toEqual(['1', '2']);
            expect(root.querySelector('svg')).toBeNull();
        });

        it('draws an accent bar for intent in a list with no icons', () => {
            const root = renderRoot({entries: [{title: 'A', intent: 'danger'}, {title: 'B'}]}),
                [flagged, plain] = entriesOf(root);

            expect(flagged.classList).toContain('xh-item-list__entry--intent-danger');
            expect(part(flagged, 'marker--accent')).not.toBeNull();
            expect(part(plain, 'marker--accent')).not.toBeNull();
            expect(plain.className).not.toMatch(/--intent/);
        });

        it('hides markers from screen readers', () => {
            const root = renderRoot({ordered: true, entries: [{title: 'A'}]});

            expect(part(root, 'marker').getAttribute('aria-hidden')).toBe('true');
        });
    });

    it('applies size, dividers, layout props and a test id to the list', () => {
        const root = renderRoot({
            entries: [{title: 'A'}],
            size: 'compact',
            dividers: true,
            maxWidth: 300,
            testId: 'alerts'
        });

        expect(root.classList).toContain('xh-item-list--compact');
        expect(root.classList).toContain('xh-item-list--dividers');
        expect(root.style.maxWidth).toBe('300px');
        expect(root.getAttribute('data-testid')).toBe('alerts');
    });

    describe('onEntryClick', () => {
        const entries: ItemListEntry[] = [{title: 'A'}, {title: 'B', omit: true}, {title: 'C'}];

        it('leaves entries plain and out of the tab order without a handler', () => {
            const root = renderRoot({entries}),
                inner = part(root, 'entry-inner');

            expect(inner.hasAttribute('role')).toBe(false);
            expect(inner.hasAttribute('tabindex')).toBe(false);
            expect(root.classList).not.toContain('xh-item-list--clickable');
        });

        it('makes each entry a focusable button', () => {
            const root = renderRoot({entries, onEntryClick: vi.fn()}),
                inner = part(root, 'entry-inner');

            expect(inner.getAttribute('role')).toBe('button');
            expect(inner.getAttribute('tabindex')).toBe('0');
        });

        it('calls the handler on a click, Enter or Space, with the entry and its index', () => {
            const onEntryClick = vi.fn(),
                root = renderRoot({entries, onEntryClick}),
                last = entriesOf(root)[1].querySelector('.xh-item-list__entry-inner');

            fireEvent.click(last);
            fireEvent.keyDown(last, {key: 'Enter'});
            fireEvent.keyDown(last, {key: ' '});
            fireEvent.keyDown(last, {key: 'a'});

            expect(onEntryClick).toHaveBeenCalledTimes(3);
            expect(onEntryClick).toHaveBeenLastCalledWith(entries[2], 2);
        });

        it('ignores a keypress on a control inside an entry', () => {
            const onEntryClick = vi.fn(),
                root = renderRoot({
                    entries: [{title: 'A', detail: span({className: 'inner', tabIndex: 0})}],
                    onEntryClick
                });

            fireEvent.keyDown(root.querySelector('.inner'), {key: 'Enter'});
            expect(onEntryClick).not.toHaveBeenCalled();
        });
    });
});

function renderRoot(props: ItemListProps): HTMLElement {
    return render(itemList(props)).container.querySelector('.xh-item-list');
}

function entriesOf(root: HTMLElement): HTMLElement[] {
    return Array.from(root.querySelectorAll('.xh-item-list__entry'));
}

/** The first element of a part, by the suffix of its class name. */
function part(el: HTMLElement, name: string): HTMLElement {
    return el.querySelector(`.xh-item-list__${name}`);
}

function texts(root: HTMLElement, name: string): string[] {
    return Array.from(root.querySelectorAll(`.xh-item-list__${name}`)).map(it => it.textContent);
}
