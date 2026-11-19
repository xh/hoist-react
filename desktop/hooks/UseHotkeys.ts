/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {HoistProps} from '@xh/hoist/core';
import {hoistCmp} from '@xh/hoist/core';
import {useHotkeys as useHotkeysBp} from '@xh/hoist/kit/blueprint';
import {isEqualWith, isFunction, partition} from 'lodash';
import type {KeyboardEvent as ReactKeyboardEvent, ReactElement, ReactNode} from 'react';
import {cloneElement, useEffect, useMemo, useRef} from 'react';
import {hotkeysRegistry} from './impl/HotkeysRegistry';
import {
    comboMatches,
    getKeyCombo,
    type KeyCombo,
    parseKeyCombo,
    isTextInput
} from './impl/KeyCombo';

/** A keyboard shortcut, installed via {@link useHotkeys} or `PanelProps.hotkeys`. */
export interface HotkeyConfig {
    /** Key combination that triggers the hotkey, e.g. `'shift + s'` or `'mod + enter'`. */
    combo: string;

    /** Description of the hotkey, shown in the hotkeys dialog (press `?`). */
    label: ReactNode;

    /** True to trigger the hotkey anywhere on the page, not only within the component. */
    global?: boolean;

    /** Group heading for the hotkey in the hotkeys dialog. */
    group?: string;

    /** True to trigger the hotkey while focus is in a text input. */
    allowInInput?: boolean;

    /** True to disable the hotkey. */
    disabled?: boolean;

    /** True to prevent the browser's default action for the key event. */
    preventDefault?: boolean;

    /** True to stop the key event propagating further. */
    stopPropagation?: boolean;

    /** Called on keydown of the combo. */
    onKeyDown?: (e: KeyboardEvent) => any;

    /** Called on keyup of the combo. */
    onKeyUp?: (e: KeyboardEvent) => any;
}

export interface HotkeysDefaults {
    /**
     * True to handle hotkeys and show the hotkeys dialog with Blueprint's, as before Hoist had its
     * own. For apps to fall back on while they adopt Hoist's - removed in the next major version.
     */
    useBlueprint?: boolean;
}

/** App-wide defaults for hotkeys. Set at startup, before the app renders. */
export const HOTKEYS_DEFAULTS: HotkeysDefaults = {
    useBlueprint: false
};

/**
 * Hook to add Key handling support to a component.
 *
 * A local hotkey fires on key events within the component, a `global` one on key events anywhere
 * on the page. All hotkeys of mounted components are listed in the hotkeys dialog, opened by `?`.
 * A combo names zero or more modifiers - `shift`, `alt`, `ctrl`, `meta`, or `mod` for Cmd on a
 * Mac and Ctrl elsewhere - and one key, e.g. `'shift + s'`, `'mod + enter'`, `'esc'` or `'?'`.
 *
 * Both args may change across renders - keys are (de)registered as they do.
 *
 * @param child - element to be given hotkey support.  Must specify Component
 *      that takes react key events as props (e.g. boxes, panel, div, etc).
 * @param hotkeys - configs for the hotkeys to be installed.
 */
export function useHotkeys(child?: ReactElement<any>, hotkeys?: HotkeyConfig[]): ReactElement {
    if (!child || !hotkeys) return child;
    return HOTKEYS_DEFAULTS.useBlueprint
        ? bpHotkeysHost({child, hotkeys})
        : hotkeysHost({child, hotkeys});
}

//------------------------
// Implementation
//------------------------
interface HotkeysHostProps extends HoistProps {
    child: ReactElement<any>;
    hotkeys: HotkeyConfig[];
}

// Host the hotkey hooks, mounted only for callers that pass hotkeys, and only while they have a
// child to bind them to - so none run on behalf of the many `Panel`s that specify no keys.
const hotkeysHost = hoistCmp.factory<HotkeysHostProps>({
    displayName: 'HotkeysHost',
    model: false,
    memo: false,
    observer: false,

    render({child, hotkeys}) {
        const {handleKeyDown, handleKeyUp} = useHoistHotkeys(useStableHotkeys(hotkeys));
        return cloneElement(child, {onKeyDown: handleKeyDown, onKeyUp: handleKeyUp});
    }
});

const bpHotkeysHost = hoistCmp.factory<HotkeysHostProps>({
    displayName: 'BpHotkeysHost',
    model: false,
    memo: false,
    observer: false,

    render({child, hotkeys}) {
        const {handleKeyDown, handleKeyUp} = useHotkeysBp(useStableHotkeys(hotkeys));
        return cloneElement(child, {onKeyDown: handleKeyDown, onKeyUp: handleKeyUp});
    }
});

// Hold configs stable, refreshing handlers in place - keys re-register on array identity.
function useStableHotkeys(hotkeys: HotkeyConfig[]): HotkeyConfig[] {
    const ref = useRef<HotkeyConfig[]>(null),
        prev = ref.current;
    if (prev && isEqualWith(prev, hotkeys, fnEquals)) {
        prev.forEach((hk, idx) => Object.assign(hk, hotkeys[idx]));
    } else {
        ref.current = hotkeys.map(hk => ({...hk}));
    }
    return ref.current;
}

interface ParsedHotkey {
    combo: KeyCombo;
    config: HotkeyConfig;
}

function useHoistHotkeys(hotkeys: HotkeyConfig[]) {
    const [globalKeys, localKeys] = useMemo(
        () =>
            partition(
                hotkeys.map(config => ({combo: parseKeyCombo(config.combo), config})),
                it => it.config.global
            ),
        [hotkeys]
    );

    useEffect(() => {
        hotkeysRegistry.add(hotkeys);
        return () => hotkeysRegistry.remove(hotkeys);
    }, [hotkeys]);

    useEffect(() => {
        if (!globalKeys.length) return;
        const onKeyDown = (e: KeyboardEvent) => invokeMatching(globalKeys, e, 'onKeyDown'),
            onKeyUp = (e: KeyboardEvent) => invokeMatching(globalKeys, e, 'onKeyUp');
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('keyup', onKeyUp);
        };
    }, [globalKeys]);

    return useMemo(
        () => ({
            handleKeyDown: (e: ReactKeyboardEvent) =>
                invokeMatching(localKeys, e.nativeEvent, 'onKeyDown'),
            handleKeyUp: (e: ReactKeyboardEvent) =>
                invokeMatching(localKeys, e.nativeEvent, 'onKeyUp')
        }),
        [localKeys]
    );
}

function invokeMatching(keys: ParsedHotkey[], e: KeyboardEvent, handler: 'onKeyDown' | 'onKeyUp') {
    if (!keys.length) return;
    const combo = getKeyCombo(e),
        inTextInput = isTextInput(e.target);
    for (const {combo: keyCombo, config} of keys) {
        if (config.disabled || (inTextInput && !config.allowInInput)) continue;
        if (!comboMatches(keyCombo, combo)) continue;
        if (config.preventDefault) e.preventDefault();
        if (config.stopPropagation) e.stopPropagation();
        config[handler]?.(e);
    }
}

const fnEquals = (a, b) => (isFunction(a) && isFunction(b) ? true : undefined);
