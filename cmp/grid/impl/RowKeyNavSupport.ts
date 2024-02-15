/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {GridModel} from '../GridModel';

import type {CellPosition, NavigateToNextCellParams} from '@xh/hoist/kit/ag-grid';

/**
 * Add support for row based navigation to GridModel.
 */
export class RowKeyNavSupport {
    gridModel: GridModel;

    constructor(gridModel: GridModel) {
        this.gridModel = gridModel;
    }

    navigateToNextCell(agParams: NavigateToNextCellParams): CellPosition {
        const {gridModel} = this,
            {selModel, agGridModel} = gridModel,
            {agApi, showCellFocus} = agGridModel,
            {nextCellPosition, previousCellPosition, event, key} = agParams,
            shiftKey = event.shiftKey,
            nextIndex = nextCellPosition?.rowIndex ?? null,
            prevIndex = previousCellPosition?.rowIndex ?? null,
            prevColumn = gridModel.getColumn(previousCellPosition?.column.getColId()),
            prevNode = prevIndex != null ? agApi.getDisplayedRowAtIndex(prevIndex) : null,
            prevNodeIsParent = prevNode && prevNode.allChildrenCount,
            canExpandCollapse = prevNodeIsParent && (!showCellFocus || prevColumn?.isTreeColumn);

        switch (key) {
            case 'ArrowDown':
            case 'ArrowUp':
                if (nextIndex != null) {
                    const isUp = key === 'ArrowUp';

                    // agGrid can weirdly wrap focus when bottom summary present - prevent that
                    if (isUp !== nextIndex < prevIndex) return previousCellPosition;

                    // If selection is enabled, want to sync up-down movement with that
                    if (selModel.isEnabled) {
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
                }

                return nextCellPosition;
            case 'ArrowLeft':
                if (canExpandCollapse && prevNode.expanded) {
                    prevNode.setExpanded(false);
                    return;
                }
                return nextCellPosition;
            case 'ArrowRight':
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
