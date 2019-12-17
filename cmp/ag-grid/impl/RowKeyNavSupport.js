/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

/**
 * Add support for row based navigation to ag-Grid.
 */
export class RowKeyNavSupport {

    agGridModel;

    constructor(agGridModel) {
        this.agGridModel = agGridModel;
    }

    navigateToNextCell(agParams) {
        const {nextCellPosition, previousCellPosition, event} = agParams,
            {agApi} = this.agGridModel,
            shiftKey = event.shiftKey,
            prevIndex = previousCellPosition ? previousCellPosition.rowIndex : null,
            nextIndex = nextCellPosition ? nextCellPosition.rowIndex : null,
            prevNode = prevIndex != null ? agApi.getDisplayedRowAtIndex(prevIndex) : null,
            nextNode = nextIndex != null ? agApi.getDisplayedRowAtIndex(nextIndex) : null,
            prevNodeIsParent = prevNode && prevNode.allChildrenCount,
            KEY_UP = 38, KEY_DOWN = 40, KEY_LEFT = 37, KEY_RIGHT = 39;

        switch (agParams.key) {
            case KEY_DOWN:
            case KEY_UP:
                if (nextNode) {
                    if (!shiftKey || !prevNode.isSelected()) {
                        // 0) Simple move of selection
                        nextNode.setSelected(true, true);
                    } else {
                        // 1) Extend or shrink multi-selection.
                        if (!nextNode.isSelected()) {
                            nextNode.setSelected(true, false);
                        } else {
                            prevNode.setSelected(false, false);
                        }
                    }
                }
                return nextCellPosition;
            case KEY_LEFT:
                if (prevNodeIsParent && prevNode.expanded) prevNode.setExpanded(false);
                return nextCellPosition;
            case KEY_RIGHT:
                if (prevNodeIsParent && !prevNode.expanded) prevNode.setExpanded(true);
                return nextCellPosition;
            default:
        }
    }
}