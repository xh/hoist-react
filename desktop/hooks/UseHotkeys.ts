/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {hoistCmp, HoistProps} from '@xh/hoist/core';
import {useHotkeys as useHotkeysBp} from '@xh/hoist/kit/blueprint';
import {isEqualWith, isFunction} from 'lodash';
import {cloneElement, ReactElement, useRef} from 'react';
import {HotkeyConfig} from '@blueprintjs/core/src/hooks/hotkeys/hotkeyConfig';

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
 * @param hotkeys - configs for the hotkeys to be installed, as prescribed by blueprint.
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
