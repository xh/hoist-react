/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {HoistProps} from '@xh/hoist/core';
import {hoistCmp} from '@xh/hoist/core';
import {useHotkeys as useHotkeysBp} from '@xh/hoist/kit/blueprint';
import {isEqualWith, isFunction} from 'lodash';
import type {ReactElement, ReactNode} from 'react';
import {cloneElement, useRef} from 'react';

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

/**
 * Hook to add Key handling support to a component.
 *
 * The implementation of this hook is based on BlueprintJS.
 * See their docs {@link https://blueprintjs.com/docs/#core/components/hotkeys} for more info.
 *
 * Both args may change across renders - keys are (de)registered as they do.
 *
 * @param child - element to be given hotkey support.  Must specify Component
 *      that takes react key events as props (e.g. boxes, panel, div, etc).
 * @param hotkeys - configs for the hotkeys to be installed.
 */
export function useHotkeys(child?: ReactElement<any>, hotkeys?: HotkeyConfig[]): ReactElement {
    return child && hotkeys ? hotkeysHost({child, hotkeys}) : child;
}

//------------------------
// Implementation
//------------------------
interface HotkeysHostProps extends HoistProps {
    child: ReactElement<any>;
    hotkeys: HotkeyConfig[];
}

// Hosts BP's hooks, mounted only for callers that pass hotkeys, and only while they have a child
// to bind them to - BP adds document listeners and warns re. its missing `HotkeysProvider` for
// every caller of its hook, so it is not run on behalf of the many `Panel`s that specify no keys.
const hotkeysHost = hoistCmp.factory<HotkeysHostProps>({
    displayName: 'HotkeysHost',
    model: false,
    memo: false,
    observer: false,

    render({child, hotkeys}) {
        // Hold configs stable, refreshing handlers in place - BP re-registers on array identity.
        const ref = useRef<HotkeyConfig[]>(null),
            prev = ref.current;
        if (prev && isEqualWith(prev, hotkeys, fnEquals)) {
            prev.forEach((hk, idx) => Object.assign(hk, hotkeys[idx]));
        } else {
            ref.current = hotkeys.map(hk => ({...hk}));
        }

        const {handleKeyDown, handleKeyUp} = useHotkeysBp(ref.current);
        return cloneElement(child, {onKeyDown: handleKeyDown, onKeyUp: handleKeyUp});
    }
});

const fnEquals = (a, b) => (isFunction(a) && isFunction(b) ? true : undefined);
