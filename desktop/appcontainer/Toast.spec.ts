/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {ToastModel} from '@xh/hoist/appcontainer/ToastModel';
import {ToastSourceModel} from '@xh/hoist/appcontainer/ToastSourceModel';
import type {ToastSpec} from '@xh/hoist/core';
import {toastSource} from '@xh/hoist/desktop/appcontainer/ToastSource';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * How desktop toasts from `XH.toast()` show, stack and dismiss.
 */
describe('Toast (desktop)', () => {
    beforeAll(() => initTestAppAsync());

    afterEach(() => {
        vi.useRealTimers();
    });

    it('shows the message as an alert, styled for its intent', () => {
        const {show} = renderSource();
        show({message: 'Saved', intent: 'success'});

        const alert = screen.getByRole('alert');
        expect(alert.textContent).toBe('Saved');
        expect(alert.closest('.xh-toast').classList).toContain('xh-bg-intent-success');
    });

    it('stacks toasts by position, newest first', () => {
        const {show} = renderSource();
        show({message: 'One'});
        show({message: 'Two'});
        show({message: 'Top', position: 'top'});

        const bottomRight = document.querySelector('.xh-toast-container--bottom-right'),
            top = document.querySelector('.xh-toast-container--top');
        expect(texts(bottomRight)).toEqual(['Two', 'One']);
        expect(texts(top)).toEqual(['Top']);
    });

    it('shows a toast within its containerRef', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        onTestFinished(() => container.remove());

        const {show} = renderSource();
        show({message: 'Anchored', containerRef: container});
        expect(container.querySelector('.xh-toast-container--anchored').textContent).toBe(
            'Anchored'
        );
    });

    it('dismisses after its timeout, pausing while hovered', () => {
        vi.useFakeTimers();
        const {show} = renderSource();
        const model = show({message: 'Brief', timeout: 1000});

        fireEvent.mouseEnter(screen.getByRole('alert').closest('.xh-toast'));
        act(() => vi.advanceTimersByTime(5000));
        expect(model.isOpen).toBe(true);

        fireEvent.mouseLeave(screen.getByRole('alert').closest('.xh-toast'));
        act(() => vi.advanceTimersByTime(1000));
        expect(model.isOpen).toBe(false);
        expect(screen.queryByText('Brief')).toBeNull();
    });

    it('stays open with no timeout until dismissed', () => {
        vi.useFakeTimers();
        const {show} = renderSource();
        const model = show({message: 'Sticky', timeout: null});

        act(() => vi.advanceTimersByTime(60000));
        expect(model.isOpen).toBe(true);

        fireEvent.click(screen.getByLabelText('Close'));
        expect(model.isOpen).toBe(false);
    });

    it('runs its action and then dismisses', () => {
        const onClick = vi.fn(),
            {show} = renderSource(),
            model = show({message: 'Deleted', actionButtonProps: {text: 'Undo', onClick}});

        fireEvent.click(screen.getByText('Undo'));
        expect(onClick).toHaveBeenCalledOnce();
        expect(model.isOpen).toBe(false);
    });

    it('dismisses every toast in a stack on Escape', () => {
        const {show} = renderSource(),
            one = show({message: 'One'}),
            two = show({message: 'Two'});

        fireEvent.keyDown(screen.getByText('One'), {key: 'Escape'});
        expect(one.isOpen).toBe(false);
        expect(two.isOpen).toBe(false);
    });
});

//------------------
// Helpers
//------------------
function renderSource() {
    const model = new ToastSourceModel();
    const ret = render(toastSource({model}));
    onTestFinished(() => {
        ret.unmount();
        model.destroy();
    });
    const show = (spec: ToastSpec) => {
        let toast: ToastModel;
        act(() => {
            toast = model.show(spec);
        });
        return toast;
    };
    return {...ret, model, show};
}

function texts(container: Element): string[] {
    return Array.from(container.querySelectorAll('[role=alert]')).map(it => it.textContent);
}
