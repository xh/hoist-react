/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ColChooserConfig, GridModel, IColChooserModel} from '@xh/hoist/cmp/grid';
import {HoistModel} from '@xh/hoist/core';
import {action, makeObservable, observable} from '@xh/hoist/mobx';

/**
 * Visibility and config host for the desktop column chooser, shared between its dialog and popover
 * presentations. The chooser UI itself is rendered by the {@link ColumnChooser} component, which
 * manages column state via its own local model.
 * @internal
 */
export class ColChooserModel extends HoistModel implements IColChooserModel {
    override xhImpl = true;

    gridModel: GridModel;

    // Show in dialog
    @observable isOpen = false;

    // Show in popover
    @observable isPopoverOpen = false;

    showRestoreDefaults: boolean;
    showColumnLibrary: boolean;
    width: string | number;
    height: string | number;

    constructor({
        gridModel,
        showRestoreDefaults = true,
        showColumnLibrary = false,
        width = 300,
        height = 600
    }: ColChooserConfig) {
        super();
        makeObservable(this);

        this.gridModel = gridModel;
        this.showRestoreDefaults = showRestoreDefaults;
        this.showColumnLibrary = showColumnLibrary;
        this.width = width;
        this.height = height;
    }

    @action
    open() {
        this.isOpen = true;
    }

    @action
    openPopover() {
        this.isPopoverOpen = true;
    }

    @action
    close() {
        this.isOpen = false;
        this.isPopoverOpen = false;
    }
}
