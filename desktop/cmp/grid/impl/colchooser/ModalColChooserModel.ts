/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ColChooserMode} from '@xh/hoist/cmp/grid';
import {action, observable} from '@xh/hoist/mobx';
import {ColChooserModel} from './ColChooserModel';

/**
 * Column chooser model for the modal presentation - a dialog (opened via {@link open}) and a
 * popover (opened via {@link openPopover}). The two are mutually exclusive overlays.
 * @internal
 */
export class ModalColChooserModel extends ColChooserModel {
    override readonly mode: ColChooserMode = 'modal';

    @observable override accessor isOpen = false; // dialog
    @observable accessor isPopoverOpen = false;

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
