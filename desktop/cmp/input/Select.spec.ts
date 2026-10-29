/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {select} from '@xh/hoist/desktop/cmp/input';
import {bindable} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {fireEvent, render, waitFor} from '@testing-library/react';
import {afterAll, beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * How a single Select brings its value into view when its menu opens. The menu renders in a portal,
 * so Select waits for the selected option to appear before it scrolls. That wait must end with the
 * menu: one left running scrolls other menus, and reads `document` after a test's jsdom is gone.
 */
beforeAll(async () => {
    await initTestAppAsync();
    // jsdom has no layout, so lacks the `scrollIntoView()` that Select calls on opening its menu.
    Element.prototype.scrollIntoView = () => {};
});

afterAll(() => {
    delete Element.prototype.scrollIntoView;
});

describe('Select', () => {
    describe('on menu open', () => {
        it('scrolls the selected option into view', async () => {
            const scrolled = spyOnScroll(),
                {container} = renderSelect('EU');

            openMenu(container);
            await waitFor(() => expect(scrolled).toEqual(['EU']));
        });

        // Guards a CI failure: a wait outlived its test and read `document` after jsdom teardown.
        it('stops waiting for the selected option once the select unmounts', async () => {
            const scrolled = spyOnScroll(),
                first = renderSelect('Asia'),
                second = renderSelect('EU');

            openMenu(first.container);
            first.unmount();

            // Select finds its selected option by class anywhere in the document, so a wait left
            // over from the first select would scroll the second's option a second time.
            openMenu(second.container);
            await waitFor(() => expect(scrolled).toEqual(['EU']));
            await wait(200);
            expect(scrolled).toEqual(['EU']);
        });
    });

    describe('windowed menu', () => {
        it('renders only the options in view once the list has 100 or more options', async () => {
            const {container} = renderWindowedSelect(optionsNamed('Option', 300));

            openMenu(container);
            await waitFor(() => expect(renderedOptions().length).toBeGreaterThan(0));
            expect(renderedOptions().length).toBeLessThan(300);
            expect(document.querySelector('.xh-select__menu-list')).not.toBeNull();
        });

        it('renders every option of a shorter list', async () => {
            const {container} = renderWindowedSelect(optionsNamed('Option', 50));

            openMenu(container);
            await waitFor(() => expect(renderedOptions().length).toBe(50));
        });

        it('renders each group heading as a row of its own', async () => {
            const {container} = renderWindowedSelect([
                {label: 'Group A', options: optionsNamed('A', 80)},
                {label: 'Group B', options: optionsNamed('B', 80)}
            ]);

            openMenu(container);
            await waitFor(() => expect(renderedOptions().length).toBeGreaterThan(0));
            expect(document.querySelectorAll('.xh-select__group-heading').length).toBe(1);
            expect(renderedOptions().length).toBeLessThan(160);
        });
    });
});

//------------------
// Helpers
//------------------
function renderSelect(value: string) {
    const model = new FormModel(value);
    onTestFinished(() => model.destroy());
    return render(select({model, bind: 'value', options: ['US', 'Emerging Markets', 'EU']}));
}

function renderWindowedSelect(options: any[]) {
    const model = new FormModel(null);
    onTestFinished(() => model.destroy());
    return render(select({model, bind: 'value', options, enableWindowed: true}));
}

function optionsNamed(prefix: string, count: number): string[] {
    return Array.from({length: count}, (_, i) => `${prefix} ${i}`);
}

function renderedOptions() {
    return document.querySelectorAll('.xh-select__option');
}

class FormModel extends HoistModel {
    @bindable accessor value: string;

    constructor(value: string) {
        super();
        this.value = value;
    }
}

function openMenu(container: HTMLElement) {
    fireEvent.keyDown(container.querySelector('input'), {key: 'ArrowDown'});
}

/** Record the text of each element scrolled into view until the end of the current test. */
function spyOnScroll(): string[] {
    const ret: string[] = [],
        spy = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(function () {
            ret.push(this.textContent);
        });
    onTestFinished(() => spy.mockRestore());
    return ret;
}
