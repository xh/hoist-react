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

        it('gives up on a value missing from the options without an unhandled rejection', async () => {
            const unhandled = captureUnhandledRejections(),
                scrolled = spyOnScroll();
            vi.useFakeTimers();
            const {container} = renderSelect('Asia');

            openMenu(container);
            await vi.advanceTimersByTimeAsync(6000);
            expect(scrolled).toEqual([]);
            expect(unhandled).toEqual([]);
        });

        it('stops waiting for the selected option once the menu closes', async () => {
            const scrolled = spyOnScroll(),
                first = renderSelect('Asia'),
                second = renderSelect('EU');

            openMenu(first.container);
            closeMenu(first.container);
            await expectOneScrollOfSecondAsync(second.container, scrolled);
        });

        // Guards a CI failure: a wait outlived its test and read `document` after jsdom teardown.
        it('stops waiting for the selected option once the select unmounts', async () => {
            const scrolled = spyOnScroll(),
                first = renderSelect('Asia'),
                second = renderSelect('EU');

            openMenu(first.container);
            first.unmount();
            await expectOneScrollOfSecondAsync(second.container, scrolled);
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

function closeMenu(container: HTMLElement) {
    fireEvent.keyDown(container.querySelector('input'), {key: 'Escape'});
}

// Select finds its selected option by class anywhere in the document, so a wait left over from
// another select would scroll this one's option a second time.
async function expectOneScrollOfSecondAsync(container: HTMLElement, scrolled: string[]) {
    openMenu(container);
    await waitFor(() => expect(scrolled).toEqual(['EU']));
    await wait(200);
    expect(scrolled).toEqual(['EU']);
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

/** Collect unhandled promise rejections raised until the end of the current test. */
function captureUnhandledRejections(): unknown[] {
    const ret: unknown[] = [],
        onRejection = (reason: unknown) => ret.push(reason);
    process.on('unhandledRejection', onRejection);
    onTestFinished(() => {
        process.off('unhandledRejection', onRejection);
    });
    return ret;
}
