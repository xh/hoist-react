/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

interface ToggleOption {
    _key: string;
    disabled?: boolean;
}

/** True if a SegmentedControl acts as a toggle: `toggleOnClick`, with exactly two enabled options. */
export function isToggle(options: ToggleOption[], toggleOnClick: boolean): boolean {
    return !!toggleOnClick && options.length === 2 && options.every(it => !it.disabled);
}

/**
 * The key a click on `clickedKey` selects - in a toggle with a selection, always the option not
 * selected, else the clicked one.
 */
export function resolveSegmentKey(
    options: ToggleOption[],
    selectedKey: string,
    clickedKey: string,
    toggleOnClick: boolean
): string {
    if (selectedKey == null || !isToggle(options, toggleOnClick)) return clickedKey;
    return options.find(it => it._key !== selectedKey)._key;
}
