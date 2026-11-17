/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {itemList} from '@xh/hoist/cmp/itemlist';
import type {ItemListProps} from '@xh/hoist/cmp/itemlist';
import {a, htmlButton, span} from '@xh/hoist/cmp/layout';
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

        expect(root.classList).toContain('xh-item-list--empty');
        expect(root.textContent).toBe('No alerts');
        expect(root.style.width).toBe('200px');
    });

    it.each([
        ['null', null],
        ['false', false],
        ['an empty string', ''],
        ['a blank string', '   ']
    ])('renders no element for a title, description or detail that is %s', (name, blank) => {
        const [first, second] = entriesOf(
            renderRoot({
                entries: [
                    {title: 'Kept', description: blank, detail: blank},
                    {title: blank, description: 'Kept'}
                ]
            })
        );

        expect(part(first, 'title').textContent).toBe('Kept');
        expect(part(first, 'description')).toBeNull();
        expect(part(first, 'detail')).toBeNull();
        expect(part(second, 'header')).toBeNull();
        expect(part(second, 'description').textContent).toBe('Kept');
    });

    it('renders no element for an array with nothing to show, such as [cond && badge()]', () => {
        const isNew = [].length > 0;
        const [blank, mixed] = entriesOf(
            renderRoot({
                entries: [
                    {title: 'A', detail: [isNew && span('New')], description: [null, '']},
                    {title: 'B', detail: [false, span({className: 'figure', item: '42'})]}
                ]
            })
        );

        expect(part(blank, 'detail')).toBeNull();
        expect(part(blank, 'description')).toBeNull();
        expect(part(mixed, 'detail').textContent).toBe('42');
    });

    it('keeps a title or detail of 0, as a number is content', () => {
        const root = renderRoot({entries: [{title: 0, detail: 0}]});

        expect(part(root, 'title').textContent).toBe('0');
        expect(part(root, 'detail').textContent).toBe('0');
    });

    it.each([
        ['null', null],
        ['false', false],
        ['a blank string', '  ']
    ])('renders nothing for an empty list with an emptyText that is %s', (name, emptyText) => {
        expect(render(itemList({entries: [], emptyText})).container.innerHTML).toBe('');
    });

    it('takes the default for a prop set to null', () => {
        const entries = [{title: 'A', description: 'B'}],
            unset = renderRoot({entries}),
            nulls = renderRoot({
                entries,
                numbered: null,
                dividers: null,
                size: null,
                emptyText: null
            });

        expect(nulls.outerHTML).toBe(unset.outerHTML);
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

        it('shows a dot for the intent of an entry with no icon, in a list with icons', () => {
            const root = renderRoot({
                    entries: [
                        {title: 'A', icon: Icon.warning(), intent: 'warning'},
                        {title: 'B', intent: 'danger'},
                        {title: 'C'}
                    ]
                }),
                [withIcon, withIntent, plain] = entriesOf(root);

            expect(part(withIcon, 'dot')).toBeNull();
            expect(
                part(withIntent, 'marker--icon').querySelector('.xh-item-list__dot')
            ).not.toBeNull();
            expect(withIntent.classList).toContain('xh-item-list__entry--intent-danger');
            expect(part(plain, 'dot')).toBeNull();
        });

        it('numbers the entries shown in a numbered list, in place of icons', () => {
            const root = renderRoot({
                numbered: true,
                entries: [
                    {title: 'A', icon: Icon.warning()},
                    null,
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
            const root = renderRoot({numbered: true, entries: [{title: 'A'}]});

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

    describe('onClick', () => {
        it('leaves entries plain and out of the tab order without a handler', () => {
            const root = renderRoot({entries: [{title: 'A', description: 'B'}]});

            expect(root.querySelector('[role="button"]')).toBeNull();
            expect(root.querySelector('[tabindex]')).toBeNull();
            expect(root.classList).not.toContain('xh-item-list--clickable');
        });

        it('makes the title of each entry with a handler a focusable button', () => {
            const root = renderRoot({entries: [{title: 'A', onClick: vi.fn()}, {title: 'B'}]}),
                [clickable, plain] = entriesOf(root).map(it => part(it, 'title'));

            expect(root.classList).toContain('xh-item-list--clickable');
            expect(clickable.getAttribute('role')).toBe('button');
            expect(clickable.getAttribute('tabindex')).toBe('0');
            expect(plain.hasAttribute('role')).toBe(false);
            expect(plain.hasAttribute('tabindex')).toBe(false);
        });

        it('calls the handler on a click anywhere in the entry, or Enter or Space', () => {
            const onClick = vi.fn(),
                root = renderRoot({entries: [{title: 'A', description: 'More', onClick}]}),
                title = part(root, 'title');

            fireEvent.click(part(root, 'entry-inner'));
            fireEvent.click(part(root, 'description'));
            fireEvent.keyDown(title, {key: 'Enter'});
            fireEvent.keyDown(title, {key: ' '});
            fireEvent.keyDown(title, {key: 'a'});

            expect(onClick).toHaveBeenCalledTimes(4);
        });

        it('describes the button with the entry description', () => {
            const root = renderRoot({
                    entries: [{title: 'A', description: 'More', onClick: vi.fn()}]
                }),
                describedBy = part(root, 'title').getAttribute('aria-describedby');

            expect(root.querySelector(`[id="${describedBy}"]`)).toBe(part(root, 'description'));
        });

        it('keeps a button for an entry with a blank title', () => {
            const onClick = vi.fn(),
                root = renderRoot({entries: [{title: null, description: 'More', onClick}]});

            fireEvent.keyDown(part(root, 'title'), {key: 'Enter'});
            expect(onClick).toHaveBeenCalledTimes(1);
        });

        it('keeps a disabled entry out of the tab order and does not call the handler', () => {
            const onClick = vi.fn(),
                root = renderRoot({entries: [{title: 'A', disabled: true, onClick}]}),
                title = part(root, 'title');

            expect(title.getAttribute('aria-disabled')).toBe('true');
            expect(title.hasAttribute('tabindex')).toBe(false);

            fireEvent.click(part(root, 'entry-inner'));
            fireEvent.click(title);
            fireEvent.keyDown(title, {key: 'Enter'});
            expect(onClick).not.toHaveBeenCalled();
        });

        it('ignores disabled on an entry with no handler', () => {
            expect(renderRoot({entries: [{title: 'A', disabled: true}]}).outerHTML).toBe(
                renderRoot({entries: [{title: 'A'}]}).outerHTML
            );
        });

        it.each([
            ['a button', () => htmlButton({className: 'inner', item: 'Dismiss'})],
            ['a link', () => a({className: 'inner', href: '#', item: 'Open'})],
            ['an element inside a button', () => htmlButton(span({className: 'inner', item: 'X'}))],
            ['a role="button" element', () => span({className: 'inner', role: 'button'})]
        ])('leaves a click or keypress on %s in the detail to that control', (name, control) => {
            const onClick = vi.fn(),
                root = renderRoot({entries: [{title: 'A', detail: control(), onClick}]}),
                inner = root.querySelector('.inner');

            fireEvent.click(inner);
            fireEvent.keyDown(inner, {key: 'Enter'});
            fireEvent.keyDown(inner, {key: ' '});
            expect(onClick).not.toHaveBeenCalled();
        });

        it('does not nest a control in the detail inside the button', () => {
            const root = renderRoot({
                entries: [{title: 'A', detail: htmlButton('Dismiss'), onClick: vi.fn()}]
            });

            expect(root.querySelector('[role="button"] button')).toBeNull();
        });

        it('still responds to a click on plain content inside the title', () => {
            const onClick = vi.fn(),
                root = renderRoot({
                    entries: [{title: span({className: 'inner', item: 'A'}), onClick}]
                });

            fireEvent.click(root.querySelector('.inner'));
            expect(onClick).toHaveBeenCalledTimes(1);
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
