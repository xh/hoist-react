/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {PopupColChooserConfig} from '@xh/hoist/cmp/grid';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {ColChooserModel} from './ColChooserModel';

/**
 * Column chooser model for the popup presentations - a modal dialog (opened via {@link open}) and a
 * popover (opened via {@link openPopover}). The two are mutually exclusive overlays.
 * @internal
 */
export class PopupColChooserModel extends ColChooserModel {
    @observable override isOpen = false; // dialog
    @observable isPopoverOpen = false;

    constructor(config: PopupColChooserConfig) {
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
