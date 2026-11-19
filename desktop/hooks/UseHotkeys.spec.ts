/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {div, fragment} from '@xh/hoist/cmp/layout';
import {hoistCmp, type HoistProps} from '@xh/hoist/core';
import {hotkeysDialog} from '@xh/hoist/desktop/appcontainer/HotkeysDialog';
import {HOTKEYS_DEFAULTS, type HotkeyConfig, useHotkeys} from '@xh/hoist/desktop/hooks';
import {hotkeysRegistry} from '@xh/hoist/desktop/hooks/impl/HotkeysRegistry';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {TEST_ID} from '@xh/hoist/utils/js';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {createElement} from 'react';
import {afterEach, beforeAll, describe, expect, it, vi} from 'vitest';

/**
 * How hotkeys added with useHotkeys, or `PanelProps.hotkeys`, fire, and how the `?` dialog lists
 * them. App-wide hotkeys such as Shift+R to refresh are installed this way.
 */
describe('useHotkeys', () => {
    beforeAll(() => initTestAppAsync());

    afterEach(() => {
        HOTKEYS_DEFAULTS.useBlueprint = false;
        act(() => hotkeysRegistry.closeDialog());
    });

    const target = hoistCmp.factory<HoistProps & {hotkeys: HotkeyConfig[]}>({
        model: false,
        render({hotkeys}) {
            return fragment(
                useHotkeys(
                    div({
                        [TEST_ID]: 'target',
                        tabIndex: 0,
                        children: createElement('input', {[TEST_ID]: 'input'})
                    }),
                    hotkeys
                ),
                div({[TEST_ID]: 'outside', tabIndex: 0})
            );
        }
    });

    it('fires a local hotkey on key events within its component only', () => {
        const onKeyDown = vi.fn();
        render(target({hotkeys: [{combo: 'shift + s', label: 'Save', group: 'Edit', onKeyDown}]}));

        fireEvent.keyDown(screen.getByTestId('outside'), {key: 'S', code: 'KeyS', shiftKey: true});
        expect(onKeyDown).not.toHaveBeenCalled();

        fireEvent.keyDown(screen.getByTestId('target'), {key: 'S', code: 'KeyS', shiftKey: true});
        expect(onKeyDown).toHaveBeenCalledOnce();
    });

    it('fires a global hotkey anywhere on the page', () => {
        const onKeyDown = vi.fn();
        render(
            target({hotkeys: [{combo: 'shift + r', label: 'Refresh', global: true, onKeyDown}]})
        );

        fireEvent.keyDown(screen.getByTestId('outside'), {key: 'R', code: 'KeyR', shiftKey: true});
        expect(onKeyDown).toHaveBeenCalledOnce();
    });

    it('ignores key events in a text input unless allowInInput is set', () => {
        const blocked = vi.fn(),
            allowed = vi.fn();
        render(
            target({
                hotkeys: [
                    {combo: 'enter', label: 'Blocked', group: 'Edit', onKeyDown: blocked},
                    {
                        combo: 'enter',
                        label: 'Allowed',
                        group: 'Edit',
                        allowInInput: true,
                        onKeyDown: allowed
                    }
                ]
            })
        );

        fireEvent.keyDown(screen.getByTestId('input'), {key: 'Enter', code: 'Enter'});
        expect(blocked).not.toHaveBeenCalled();
        expect(allowed).toHaveBeenCalledOnce();
    });

    it('matches aliases, shifted symbols and exact modifiers', () => {
        const mod = vi.fn(),
            question = vi.fn(),
            up = vi.fn();
        render(
            target({
                hotkeys: [
                    {combo: 'mod + enter', label: 'Submit', group: 'Edit', onKeyDown: mod},
                    {combo: '?', label: 'Help', group: 'Edit', onKeyDown: question},
                    {combo: 'up', label: 'Up', group: 'Edit', onKeyDown: up}
                ]
            })
        );
        const el = screen.getByTestId('target');

        fireEvent.keyDown(el, {key: 'Enter', code: 'Enter', ctrlKey: true});
        fireEvent.keyDown(el, {key: 'Enter', code: 'Enter', ctrlKey: true, altKey: true});
        fireEvent.keyDown(el, {key: '?', code: 'Slash', shiftKey: true});
        fireEvent.keyDown(el, {key: 'ArrowUp', code: 'ArrowUp'});
        expect(mod).toHaveBeenCalledOnce();
        expect(question).toHaveBeenCalledOnce();
        expect(up).toHaveBeenCalledOnce();
    });

    it('skips disabled hotkeys, and prevents the default action when told to', () => {
        const disabled = vi.fn();
        render(
            target({
                hotkeys: [
                    {combo: 'a', label: 'Off', group: 'Edit', disabled: true, onKeyDown: disabled},
                    {combo: 'b', label: 'On', group: 'Edit', preventDefault: true}
                ]
            })
        );
        const el = screen.getByTestId('target');

        fireEvent.keyDown(el, {key: 'a', code: 'KeyA'});
        expect(disabled).not.toHaveBeenCalled();
        expect(fireEvent.keyDown(el, {key: 'b', code: 'KeyB'})).toBe(false);
    });

    it('calls the latest handler after a re-render', () => {
        const first = vi.fn(),
            second = vi.fn(),
            hotkey = (onKeyDown): HotkeyConfig[] => [
                {combo: 'x', label: 'Act', group: 'Edit', onKeyDown}
            ];
        const {rerender} = render(target({hotkeys: hotkey(first)}));
        rerender(target({hotkeys: hotkey(second)}));

        fireEvent.keyDown(screen.getByTestId('target'), {key: 'x', code: 'KeyX'});
        expect(first).not.toHaveBeenCalled();
        expect(second).toHaveBeenCalledOnce();
    });

    it('lists mounted hotkeys in a dialog on ?, global first, then by group', async () => {
        const {unmount} = render(
            fragment(
                target({
                    hotkeys: [
                        {combo: 'shift + s', label: 'Save', group: 'Edit'},
                        {combo: 'shift + r', label: 'Refresh', global: true}
                    ]
                }),
                hotkeysDialog()
            )
        );

        fireEvent.keyDown(screen.getByTestId('outside'), {key: '?', code: 'Slash', shiftKey: true});
        const el = await screen.findByRole('dialog');
        const text = Array.from(el.querySelectorAll('h4, .bp6-hotkey-label')).map(
            it => it.textContent
        );
        expect(text).toEqual(['Global', 'Refresh', 'Edit', 'Save']);

        unmount();
        expect(hotkeysRegistry.hotkeys).toEqual([]);
    });

    it('does not open the dialog on ? typed in a text input', () => {
        render(
            fragment(target({hotkeys: [{combo: 'a', label: 'A', group: 'Edit'}]}), hotkeysDialog())
        );
        fireEvent.keyDown(screen.getByTestId('input'), {key: '?', code: 'Slash', shiftKey: true});
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('handles hotkeys with Blueprint when useBlueprint is set', async () => {
        HOTKEYS_DEFAULTS.useBlueprint = true;
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        const onKeyDown = vi.fn();
        render(target({hotkeys: [{combo: 'shift + s', label: 'Save', group: 'Edit', onKeyDown}]}));

        fireEvent.keyDown(screen.getByTestId('target'), {key: 'S', code: 'KeyS', shiftKey: true});
        await waitFor(() => expect(onKeyDown).toHaveBeenCalledOnce());
        expect(hotkeysRegistry.hotkeys).toEqual([]);
    });
});
