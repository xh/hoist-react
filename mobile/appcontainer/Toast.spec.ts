/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ToastModel} from '@xh/hoist/appcontainer/ToastModel';
import {toast} from '@xh/hoist/mobile/appcontainer/Toast';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {fireEvent, render, screen} from '@testing-library/react';
import {beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * The mobile Toast renders a ToastModel's message with its intent, an optional action and a
 * dismiss button.
 */
describe('Toast (mobile)', () => {
    beforeAll(() => initTestAppAsync({isMobileApp: true}));

    it('renders the message, styled for its intent', () => {
        const {container} = renderToast({message: 'Saved', intent: 'success'});
        expect(screen.getByText('Saved')).not.toBeNull();
        expect(container.querySelector('.xh-toast--intent-success')).not.toBeNull();
    });

    it('dismisses its model when the close button is clicked', () => {
        const {container, model} = renderToast({message: 'Saved'});
        const buttons = container.querySelectorAll('.xh-button');
        fireEvent.click(buttons[buttons.length - 1]);
        expect(model.isOpen).toBe(false);
    });

    it('renders an action button when configured', () => {
        const onClick = vi.fn();
        renderToast({message: 'Deleted', actionButtonProps: {text: 'Undo', onClick}});
        fireEvent.click(screen.getByText('Undo'));
        expect(onClick).toHaveBeenCalledOnce();
    });
});

//------------------
// Helpers
//------------------
function renderToast(spec: ConstructorParameters<typeof ToastModel>[0]) {
    const model = new ToastModel(spec);
    onTestFinished(() => model.destroy());
    const ret = render(toast({model}));
    return {...ret, model};
}
