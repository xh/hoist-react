/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {div, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistModel, useContextModel, useLocalModel} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {GridApi, RowDropZoneParams} from '@xh/hoist/kit/ag-grid';
import {createObservableRef} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {KeyboardEvent} from 'react';
import {ManageDialogModel} from './ManageDialogModel';

/**
 * Strip rendered above the tree grid within one tab of the ViewManager's Manage dialog, registered
 * with ag-Grid as an external row-drop-zone accepting drops that move a view/group out of all
 * groups. Also clickable, to move the current selection without a drag.
 *
 * Deliberately not a grid row - it sits outside the grid's scrolling viewport, so it needs no
 * special-casing in the tree data and cannot be occluded by a sticky group-row header.
 *
 * Renders null for a grid that does not support drag-and-drop.
 */
export const topLevelDropStrip = hoistCmp.factory<GridModel>({
    displayName: 'TopLevelDropStrip',
    className: 'xh-view-manager__manage-dialog__top-level-strip',

    render({model: gridModel, className}) {
        const dialogModel = useContextModel(ManageDialogModel),
            impl = useLocalModel(() => new TopLevelDropStripLocalModel(gridModel, dialogModel));

        if (!dialogModel?.supportsDragDrop(gridModel)) return null;

        const {mode, hint} = dialogModel.stripState(gridModel),
            blocked = mode === 'blocked',
            open = mode === 'armed' || mode === 'hot',
            activate = () => dialogModel.moveSelectionToTopLevelAsync(gridModel).catchDefault();

        return div({
            ref: impl.ref,
            className: classNames(className, mode !== 'rest' ? `${className}--${mode}` : null),
            role: 'button',
            tabIndex: 0,
            'aria-label': 'Move selection to top level',
            'aria-disabled': blocked,
            onClick: activate,
            onKeyDown: (e: KeyboardEvent) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                activate();
            },
            items: [
                open
                    ? Icon.folderOpen({className: `${className}__icon`})
                    : Icon.folder({className: `${className}__icon`}),
                span('Top Level'),
                span({className: `${className}__hint`, item: hint, omit: !hint})
            ]
        });
    }
});

//------------------------
// Implementation
//------------------------
/**
 * Registers the strip's DOM element with ag-Grid as an external row-drop-zone, once both the
 * element and the grid's `agApi` are available - mount order between the two is not guaranteed.
 * Drag-event handling itself lives on {@link ManageDialogModel}.
 */
class TopLevelDropStripLocalModel extends HoistModel {
    override xhImpl = true;

    readonly ref = createObservableRef<HTMLElement>();
    private readonly gridModel: GridModel;
    private readonly dialogModel: ManageDialogModel;
    private dropZoneParams: RowDropZoneParams;

    constructor(gridModel: GridModel, dialogModel: ManageDialogModel) {
        super();
        this.gridModel = gridModel;
        this.dialogModel = dialogModel;
    }

    override onLinked() {
        this.addReaction({
            track: () => [this.ref.current, this.gridModel.agApi],
            run: ([el, agApi]: [HTMLElement, GridApi]) => {
                this.unregister();
                if (el && agApi) this.register(el, agApi);
            }
        });
    }

    override destroy() {
        this.unregister();
        super.destroy();
    }

    private register(container: HTMLElement, agApi: GridApi) {
        this.dropZoneParams = {
            getContainer: () => container,
            ...this.dialogModel.getTopLevelDropZoneEvents(this.gridModel)
        };
        agApi.addRowDropZone(this.dropZoneParams);
    }

    private unregister() {
        const {dropZoneParams, gridModel} = this;
        if (!dropZoneParams) return;
        gridModel.agApi?.removeRowDropZone(dropZoneParams);
        this.dropZoneParams = null;
    }
}
