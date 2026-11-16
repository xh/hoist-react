/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {div} from '@xh/hoist/cmp/layout';
import {mask, type MaskProps} from '@xh/hoist/cmp/mask';
import {creates, hoistCmp, HoistModel} from '@xh/hoist/core';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {render, screen} from '@testing-library/react';
import {beforeAll, describe, expect, it} from 'vitest';

/**
 * How the desktop Mask renders. Panels show an inline mask on every load, so it must stay a plain
 * element - Blueprint's overlay forces a browser layout on each show.
 */
describe('Mask', () => {
    beforeAll(() => initTestAppAsync());

    it('renders an inline mask within its parent, without a Blueprint overlay', () => {
        render(maskedView({isDisplayed: true, message: 'Loading trades', spinner: true}));

        const maskEl = document.querySelector('.test-masked-view > .xh-mask');
        expect(maskEl).not.toBeNull();
        expect(document.querySelector('.bp6-overlay')).toBeNull();
        expect(screen.getByText('Loading trades').classList).toContain('xh-mask-text');
        expect(maskEl.querySelector('.xh-spinner')).not.toBeNull();
    });

    it('renders a non-inline mask as a Blueprint overlay in a portal', () => {
        render(maskedView({isDisplayed: true, inline: false, message: 'Saving', spinner: true}));

        const overlay = document.querySelector('.bp6-overlay.xh-mask');
        expect(overlay).not.toBeNull();
        expect(document.querySelector('.test-masked-view').contains(overlay)).toBe(false);
        expect(screen.getByText('Saving').classList).toContain('xh-mask-text');
        expect(overlay.querySelector('.xh-spinner')).not.toBeNull();
    });

    it('renders nothing when not displayed', () => {
        render(maskedView({isDisplayed: false, message: 'Loading trades'}));

        expect(document.querySelector('.xh-mask')).toBeNull();
    });
});

class MaskedViewModel extends HoistModel {}

const maskedView = hoistCmp.factory<MaskProps>({
    model: creates(MaskedViewModel),
    render: props => div({className: 'test-masked-view', item: mask(props)})
});
