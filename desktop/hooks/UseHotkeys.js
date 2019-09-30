/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {HoistModel, useLocalModel} from '@xh/hoist/core';
import {HotkeysEvents, hotkey as hotkeyBp, hotkeys as hotkeysBp} from '@xh/hoist/kit/blueprint';
import {isPlainObject, isArray, isEmpty} from 'lodash';
import {cloneElement, isValidElement} from 'react';

/**
 * Hook to add Key handling support to a component.
 *
 * The implementation of this hook is based on BlueprintJS.
 * See their docs {@link https://blueprintjs.com/docs/#core/components/hotkeys} for more info.
 *
 * @param {element} [child] - element to be given hotkey support.  Must specify Component
 *      that takes react key events as props (e.g. boxes, panel, div, etc).
 * @param {(Array|element)} [hotkeys] - An array of hotkeys, or configs for hotkeys,
 *      as prescribed by blueprint. A Hotkeys element may also be provided.
 */
export function useHotkeys(child, hotkeys) {
    const impl = useLocalModel(() => {
        return !isEmpty(hotkeys) ? new LocalModel(hotkeys): null;
    });
    if (!child || !impl) return child;

    return cloneElement(
        child,
        {onKeyUp: impl.onKeyUp, onKeyDown: impl.onKeyDown}
    );
}

@HoistModel
class LocalModel {

    localHotkeysEvents = new HotkeysEvents('local');
    globalHotkeysEvents = new HotkeysEvents('global');

    // Capture the handlers on initial render.  Following blueprint, assume these static.
    constructor(hotkeys) {

        // Normalize to blueprint Hotkeys element
        if (isArray(hotkeys)) {
            hotkeys = hotkeys.map(it => isPlainObject(it) ? hotkeyBp(it) : it);
            hotkeys = hotkeysBp(hotkeys);
        }

        if (!isValidElement(hotkeys)) {
            console.error("Incorrect specification of 'hotkeys' arg in useHotkeys()");
            return;
        }

        //  Parse and add with blueprint api
        this.localHotkeysEvents.setHotkeys(hotkeys.props);
        this.globalHotkeysEvents.setHotkeys(hotkeys.props);
        document.addEventListener('keydown', this.globalHotkeysEvents.handleKeyDown);
        document.addEventListener('keyup', this.globalHotkeysEvents.handleKeyUp);
    }

    onKeyUp = (e) => this.localHotkeysEvents.handleKeyUp(e);
    onKeyDown = (e) => this.localHotkeysEvents.handleKeyDown(e);

    destroy() {
        document.removeEventListener('keydown', this.globalHotkeysEvents.handleKeyDown);
        document.removeEventListener('keyup', this.globalHotkeysEvents.handleKeyUp);
        this.globalHotkeysEvents.clear();
        this.localHotkeysEvents.clear();
    }
}

