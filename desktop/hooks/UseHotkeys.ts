/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {useHotkeys as useHotkeysBp} from '@xh/hoist/kit/blueprint';
import {isEmpty} from 'lodash';
import {cloneElement, ReactElement, useMemo, useRef} from 'react';
import {HotkeyConfig} from '@blueprintjs/core/src/hooks/hotkeys/hotkeyConfig';

/* eslint-disable react-hooks/exhaustive-deps */

/** Stable-identity placeholder - see note on Blueprint re-registration below. */
const NO_HOTKEYS: HotkeyConfig[] = [];

/**
 * Hook to add Key handling support to a component.
 *
 * The implementation of this hook is based on BlueprintJS.
 * See their docs {@link https://blueprintjs.com/docs/#core/components/hotkeys} for more info.
 *
 * Note that `hotkeys` are captured on the first render of the calling component and held for its
 * lifetime - later changes to the array are not picked up.
 *
 * @param child - element to be given hotkey support.  Must specify Component
 *      that takes react key events as props (e.g. boxes, panel, div, etc).
 * @param hotkeys - An array of hotkeys, or configs for hotkeys,
 *      as prescribed by blueprint. A Hotkeys element may also be provided.
 */
export function useHotkeys(child?: ReactElement<any>, hotkeys?: HotkeyConfig[]) {
    // Whether this component installs hotkey support must be decided on its first render
    // and held stable thereafter.
    const enabled = useRef(!isEmpty(hotkeys)).current;
    if (!enabled) return child;

    // Blueprint re-registers its handlers whenever the identity of its `keys` arg changes. Pass the
    // stable empty array while we have no child.
    const memoHotkeys = useMemo(() => hotkeys, []),
        {handleKeyDown, handleKeyUp} = useHotkeysBp(child ? memoHotkeys : NO_HOTKEYS);

    return child ? cloneElement(child, {onKeyDown: handleKeyDown, onKeyUp: handleKeyUp}) : child;
}
