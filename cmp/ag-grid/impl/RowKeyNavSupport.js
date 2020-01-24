/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
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
            prevNodeIsParent = prevNode && prevNode.allChildrenCount,
            KEY_UP = 38, KEY_DOWN = 40, KEY_LEFT = 37, KEY_RIGHT = 39;
        let nextNode = nextIndex != null ? agApi.getDisplayedRowAtIndex(nextIndex) : null;

        switch (agParams.key) {
            case KEY_DOWN:
            case KEY_UP:
                if (nextNode) {
                    if ((agParams.key === KEY_DOWN && nextIndex < prevIndex) ||
                        (agParams.key === KEY_UP && nextIndex > prevIndex)) {
                        // nextCellPosition wraps the position if there is a summary row so ignore
                        return previousCellPosition;
                    }
                    if (!nextNode.selectable) {
                        // nextCellPosition doesn't respect row selectability so calculate the next selectable row
                        nextNode = this.findNext(prevIndex, agParams.key === KEY_UP, agApi);
                        if (!nextNode) {
                            return previousCellPosition;
                        }
                        nextCellPosition.rowIndex = nextNode.rowIndex;
                    }
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

    findNext(id, isBefore, agApi) {
        let next = null,
            foundId = false;
        agApi.forEachNodeAfterFilterAndSort((node, index) => {
            if (node.selectable) {
                if (index === id) {
                    foundId = true;
                } else if (!foundId) {
                    if (isBefore) {
                        next = node;
                    }
                } else if (!next && !isBefore) {
                    next = node;
                }
            }
        });
        return next;
    }
}
