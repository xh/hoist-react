/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ColChooserConfig} from '@xh/hoist/cmp/grid';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {ColChooserModel} from './ColChooserModel';

/**
 * Column chooser model for the modal presentations - a dialog (opened via {@link open}) and a
 * popover (opened via {@link openPopover}). The two are mutually exclusive overlays.
 * @internal
 */
export class ColChooserModalModel extends ColChooserModel {
    @observable override isOpen = false; // dialog
    @observable isPopoverOpen = false;

    constructor(config: ColChooserConfig) {
        super(config);
        makeObservable(this);
    }

    @action
    override open() {
        this.isPopoverOpen = false;
        this.isOpen = true;
    }

    @action
    openPopover() {
        this.isOpen = false;
        this.isPopoverOpen = true;
    }

    @action
    protected override hide() {
        this.isOpen = false;
        this.isPopoverOpen = false;
    }
}
