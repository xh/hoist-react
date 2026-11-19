/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {div, h4, span} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import {dialog, dialogBody} from '@xh/hoist/desktop/cmp/dialog';
import {HOTKEYS_DEFAULTS, type HotkeyConfig} from '@xh/hoist/desktop/hooks';
import {hotkeysRegistry} from '@xh/hoist/desktop/hooks/impl/HotkeysRegistry';
import {
    comboKeysForDisplay,
    comboMatches,
    getKeyCombo,
    isMac,
    isTextInput,
    parseKeyCombo
} from '@xh/hoist/desktop/hooks/impl/KeyCombo';
import {createElement, type ReactNode, useEffect} from 'react';
import {sortBy, uniqWith} from 'lodash';
import classNames from 'classnames';

const DIALOG_COMBO = parseKeyCombo('?');

/**
 * Lists the hotkeys of every mounted component, opened by pressing `?` outside a text input.
 * Global hotkeys come first, then the rest by group.
 * @internal
 */
export const hotkeysDialog = hoistCmp.factory({
    displayName: 'HotkeysDialog',
    model: false,

    render() {
        const useBlueprint = HOTKEYS_DEFAULTS.useBlueprint;

        useEffect(() => {
            if (useBlueprint) return;
            const onKeyDown = (e: KeyboardEvent) => {
                if (!isTextInput(e.target) && comboMatches(DIALOG_COMBO, getKeyCombo(e))) {
                    hotkeysRegistry.openDialog();
                }
            };
            document.addEventListener('keydown', onKeyDown);
            return () => document.removeEventListener('keydown', onKeyDown);
        }, [useBlueprint]);

        if (useBlueprint) return null;

        const {isDialogOpen} = hotkeysRegistry;
        return dialog({
            className: 'xh-hotkeys-dialog bp6-hotkey-dialog',
            isOpen: isDialogOpen,
            onClose: () => hotkeysRegistry.closeDialog(),
            children: isDialogOpen ? dialogBody(hotkeyList(hotkeysRegistry.hotkeys)) : null
        });
    }
});

//------------------------
// Implementation
//------------------------
function hotkeyList(hotkeys: HotkeyConfig[]) {
    const entries = sortBy(uniqWith(hotkeys, sameHotkey), [
            it => !it.global,
            it => groupOf(it) ?? ''
        ]),
        children: ReactNode[] = [];

    let lastGroup: string;
    entries.forEach((hotkey, idx) => {
        const group = groupOf(hotkey);
        if (group !== lastGroup) {
            children.push(h4({className: 'bp6-heading', key: `group-${idx}`, children: group}));
            lastGroup = group;
        }
        children.push(
            div({
                className: 'xh-hotkeys-dialog__hotkey bp6-hotkey',
                key: idx,
                children: [
                    div({className: 'bp6-hotkey-label', children: hotkey.label}),
                    keyComboTag(hotkey.combo)
                ]
            })
        );
    });
    return div({className: 'xh-hotkeys-dialog__list bp6-hotkey-column', children});
}

function keyComboTag(combo: string) {
    return span({
        className: 'xh-key-combo bp6-key-combo',
        children: comboKeysForDisplay(combo).map((key, idx) => {
            const glyph = glyphFor(key.toLowerCase());
            return createElement(
                'kbd',
                {
                    key: idx,
                    className: classNames('xh-key', 'bp6-key', glyph && 'bp6-modifier-key')
                },
                glyph ? span({title: glyph.title, children: glyph.char}) : null,
                DISPLAY_NAMES[key.toLowerCase()] ?? key
            );
        })
    });
}

const GLYPHS: Record<string, {char: string; title: string; macOnly?: boolean}> = {
    alt: {char: '⌥', title: 'Alt/Option key', macOnly: true},
    cmd: {char: '⌘', title: 'Command key', macOnly: true},
    ctrl: {char: '⌃', title: 'Control key', macOnly: true},
    shift: {char: '⇧', title: 'Shift key', macOnly: true},
    arrowup: {char: '↑', title: 'Up key'},
    arrowdown: {char: '↓', title: 'Down key'},
    arrowleft: {char: '←', title: 'Left key'},
    arrowright: {char: '→', title: 'Right key'},
    enter: {char: '↵', title: 'Enter key'},
    delete: {char: '⌦', title: 'Delete key'}
};

const DISPLAY_NAMES: Record<string, string> = {
    arrowup: 'up',
    arrowdown: 'down',
    arrowleft: 'left',
    arrowright: 'right'
};

function glyphFor(key: string) {
    const glyph = GLYPHS[key];
    return glyph && (!glyph.macOnly || isMac()) ? glyph : null;
}

function groupOf(hotkey: HotkeyConfig): string {
    return hotkey.global && hotkey.group == null ? 'Global' : hotkey.group;
}

// The same hotkey may be registered by several mounted components - list it once.
function sameHotkey(a: HotkeyConfig, b: HotkeyConfig): boolean {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    keys.delete('onKeyDown');
    keys.delete('onKeyUp');
    return [...keys].every(k => a[k] === b[k]);
}
