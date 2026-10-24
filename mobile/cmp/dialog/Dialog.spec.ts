/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {span} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistModel, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/mobile/cmp/button';
import {dialog, DialogProps} from '@xh/hoist/mobile/cmp/dialog';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {fireEvent, render, screen} from '@testing-library/react';
import {beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * The mobile Dialog: a modal with a title, content and buttons over a backdrop. These guard how it
 * opens and closes, and that models in context reach its content.
 */
describe('Dialog (mobile)', () => {
    beforeAll(() => initTestAppAsync({isMobileApp: true}));

    it('renders nothing when closed', () => {
        const {container} = renderDialog({isOpen: false});
        expect(container.innerHTML).toBe('');
    });

    it('renders its title, content and buttons when open', () => {
        renderDialog({buttons: [button({text: 'OK', testId: 'ok'})]});
        expect(screen.getByText('Confirm')).not.toBeNull();
        expect(screen.getByText('Are you sure?')).not.toBeNull();
        expect(screen.getByTestId('ok')).not.toBeNull();
    });

    it('cancels when the backdrop is tapped', () => {
        const onCancel = vi.fn(),
            {container} = renderDialog({onCancel});
        fireEvent.click(container.querySelector('.xh-dialog__mask'));
        expect(onCancel).toHaveBeenCalledOnce();
    });

    it('cancels on Escape', () => {
        const onCancel = vi.fn();
        renderDialog({onCancel});
        fireEvent.keyDown(document, {key: 'Escape'});
        expect(onCancel).toHaveBeenCalledOnce();
    });

    it('does not cancel when not cancelable', () => {
        const onCancel = vi.fn(),
            {container} = renderDialog({onCancel, isCancelable: false});
        fireEvent.click(container.querySelector('.xh-dialog__mask'));
        fireEvent.keyDown(document, {key: 'Escape'});
        expect(onCancel).not.toHaveBeenCalled();
    });

    it('stops listening for Escape once closed', () => {
        const onCancel = vi.fn(),
            {unmount} = renderDialog({onCancel});
        unmount();
        fireEvent.keyDown(document, {key: 'Escape'});
        expect(onCancel).not.toHaveBeenCalled();
    });

    it('makes a model in context available to its content', () => {
        const model = new ContextModel();
        onTestFinished(() => model.destroy());
        render(host({model, item: dialog({isOpen: true, content: contextReader()})}));
        expect(screen.getByText('from context')).not.toBeNull();
    });
});

//------------------
// Helpers
//------------------
function renderDialog(props: Partial<DialogProps> = {}) {
    return render(
        dialog({
            isOpen: true,
            title: 'Confirm',
            content: 'Are you sure?',
            ...props
        })
    );
}

class ContextModel extends HoistModel {
    label = 'from context';
}

const host = hoistCmp.factory<ContextModel>({
    model: uses(ContextModel),
    render: ({children}) => children
});

const contextReader = hoistCmp.factory<ContextModel>({
    model: uses(ContextModel),
    render: ({model}) => span(model.label)
});
