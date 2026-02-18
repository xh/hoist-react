/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {useHotkeys as useHotkeysBp} from '@xh/hoist/kit/blueprint';
import {isEmpty} from 'lodash';
import {cloneElement, ReactElement, useMemo} from 'react';
import {HotkeyConfig} from '@blueprintjs/core/src/hooks/hotkeys/hotkeyConfig';

/* eslint-disable react-hooks/exhaustive-deps */

/**
 * Hook to add Key handling support to a component.
 *
 * The implementation of this hook is based on BlueprintJS.
 * See their docs {@link https://blueprintjs.com/docs/#core/components/hotkeys} for more info.
 *
 * @param child - element to be given hotkey support.  Must specify Component
 *      that takes react key events as props (e.g. boxes, panel, div, etc).
 * @param hotkeys - An array of hotkeys, or configs for hotkeys,
 *      as prescribed by blueprint. A Hotkeys element may also be provided.
 */
export function useHotkeys(child?: ReactElement, hotkeys?: HotkeyConfig[]) {
    if (!child || isEmpty(hotkeys)) return child;

    const memoHotkeys = useMemo(() => hotkeys, []),
        {handleKeyDown, handleKeyUp} = useHotkeysBp(memoHotkeys);

    return cloneElement(child, {onKeyDown: handleKeyDown, onKeyUp: handleKeyUp});
}
