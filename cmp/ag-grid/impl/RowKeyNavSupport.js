/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
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
        const {nextCellPosition, previousCellPosition, event, key} = agParams,
            {agApi, showCellFocus} = this.agGridModel,
            shiftKey = event.shiftKey,
            nextIndex = nextCellPosition?.rowIndex ?? null,
            prevIndex =  previousCellPosition?.rowIndex ?? null,
            prevIsTreeCol = previousCellPosition?.column.colDef.xhColumn.isTreeColumn,
            prevNode = prevIndex != null ? agApi.getDisplayedRowAtIndex(prevIndex) : null,
            prevNodeIsParent = prevNode && prevNode.allChildrenCount,
            canExpandCollapse = prevNodeIsParent && (!showCellFocus || prevIsTreeCol),
            KEY_UP = 38, KEY_DOWN = 40, KEY_LEFT = 37, KEY_RIGHT = 39;

        switch (key) {
            case KEY_DOWN:
            case KEY_UP:
                if (nextIndex != null) {

                    const isUp = (key === KEY_UP);

                    // agGrid can weirdly wrap focus when bottom summary present - prevent that
                    if (isUp != (nextIndex < prevIndex)) return previousCellPosition;

                    // Otherwise scan for a selectable node -- agGrid does not take this in to account
                    const nextNode = this.findNextSelectable(nextIndex, isUp, agApi);
                    if (!nextNode) return previousCellPosition;

                    nextCellPosition.rowIndex = nextNode.rowIndex;

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
                if (canExpandCollapse && prevNode.expanded) {
                    prevNode.setExpanded(false);
                    return;
                }
                return nextCellPosition;
            case KEY_RIGHT:
                if (canExpandCollapse && !prevNode.expanded) {
                    prevNode.setExpanded(true);
                    return;
                }
                return nextCellPosition;
            default:
        }
    }

    findNextSelectable(index, isUp, agApi) {
        const count = agApi.getDisplayedRowCount();
        while (index >= 0 && index < count) {
            const node = agApi.getDisplayedRowAtIndex(index);
            if (node?.selectable) return node;
            index = index + (isUp ? -1 : 1);
        }
        return null;
    }
}
