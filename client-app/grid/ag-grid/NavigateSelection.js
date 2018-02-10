/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */


/**
 * Adapated from Ag-Grig Sample Docs
 * Allow KeyPresses to navigate selection.
 *
 * TODO:  This looks like it does full row scans on each key press!
 */
export function navigateSelection(params, api) {
    var previousCell = params.previousCellDef,
        suggestedNextCell = params.nextCellDef;

    const KEY_UP = 38, KEY_DOWN = 40, KEY_LEFT = 37, KEY_RIGHT = 39;

    switch (params.key) {
        case KEY_DOWN:
            previousCell = params.previousCellDef;
            // set selected cell on current cell + 1
            api.forEachNode((node) => {
                if (previousCell.rowIndex + 1 === node.rowIndex) {
                    node.setSelected(true);
                }
            });
            return suggestedNextCell;
        case KEY_UP:
            previousCell = params.previousCellDef;
            // set selected cell on current cell - 1
            api.forEachNode((node) => {
                if (previousCell.rowIndex - 1 === node.rowIndex) {
                    node.setSelected(true);
                }
            });
            return suggestedNextCell;
        case KEY_LEFT:
        case KEY_RIGHT:
            return suggestedNextCell;
        default:
    }
}