/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {beforeAll, describe, expect, it} from 'vitest';

/**
 * The theme and sizing mode a user picks, saved to the `xhTheme` and `xhSizingMode` prefs. Both
 * apply as soon as the pref changes, from the Options dialog or from app code, with no refresh.
 */
describe('Theme and sizing mode prefs', () => {
    beforeAll(async () => {
        await initTestAppAsync();
    });

    it('applies the theme when its pref changes', () => {
        XH.setPref('xhTheme', 'dark');
        expect(XH.darkTheme).toBe(true);
        expect(document.body.classList.contains('xh-dark')).toBe(true);

        XH.prefService.unset('xhTheme');
        expect(XH.darkTheme).toBe(false);
        expect(document.body.classList.contains('xh-dark')).toBe(false);
    });

    it('saves the theme to its pref when set directly', () => {
        XH.setTheme('dark');
        expect(XH.getPref('xhTheme')).toBe('dark');
    });

    it('applies the sizing mode when its pref changes', () => {
        XH.setPref('xhSizingMode', {desktop: 'compact'});
        expect(XH.sizingMode).toBe('compact');
        expect(document.body.classList.contains('xh-compact')).toBe(true);

        XH.prefService.unset('xhSizingMode');
        expect(XH.sizingMode).toBe('standard');
    });
});
