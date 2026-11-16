/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {KeyboardEvent, MouseEvent} from 'react';

import type {PlainObject} from '@xh/hoist/core';

/** Handler for a click or Enter/Space keypress on a clickable row. */
export type RowClickHandler = (e: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => void;

/**
 * Props for a row that the user can click as a whole, such as an entry in a list.
 *
 * A mouse click anywhere in the row calls the handler. The button role, focus and Enter/Space
 * keys go on one part of the row, typically its title, set with `buttonProps`. Controls elsewhere
 * in the row, such as a button in a trailing detail, are then not nested inside a button. A click
 * or keypress on such a control goes to that control only.
 *
 * A disabled row keeps the button role, marked `aria-disabled`, but takes no focus or click.
 * With no handler, both sets of props are empty.
 *
 * @internal
 */
export function clickableRowProps(
    onClick: RowClickHandler,
    disabled: boolean
): {rowProps: PlainObject; buttonProps: PlainObject} {
    if (!onClick) return {rowProps: {}, buttonProps: {}};
    if (disabled) return {rowProps: {}, buttonProps: {role: 'button', 'aria-disabled': true}};

    return {
        rowProps: {
            onClick: (e: MouseEvent<HTMLElement>) => {
                if (!isFromNestedControl(e)) onClick(e);
            }
        },
        buttonProps: {
            role: 'button',
            tabIndex: 0,
            [BUTTON_ATTR]: true,
            onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
                if (isFromNestedControl(e)) return;
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick(e);
                }
            }
        }
    };
}

//------------------
// Implementation
//------------------
/** Elements that handle their own clicks and keys. */
const CONTROL_SELECTOR = 'button, a, input, select, textarea, [role="button"]';

/** Marks the part of a row that acts as its button, so a click there counts for the row. */
const BUTTON_ATTR = 'data-xh-row-button';

/** True if an event came from a control inside the row, other than the row's own button. */
function isFromNestedControl(e: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>): boolean {
    const control = (e.target as Element).closest(CONTROL_SELECTOR);
    return control != null && control !== e.currentTarget && !control.hasAttribute(BUTTON_ATTR);
}
