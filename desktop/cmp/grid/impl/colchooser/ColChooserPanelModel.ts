/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ColChooserPanelConfig} from '@xh/hoist/cmp/grid';
import {managed} from '@xh/hoist/core';
import {PanelModel} from '@xh/hoist/desktop/cmp/panel';
import {ColChooserModel} from './ColChooserModel';

/**
 * Column chooser model for the docked, non-modal side-panel presentation. Owns the {@link PanelModel}
 * whose collapsed state *is* the chooser's open state ({@link isOpen}). Non-modal display means
 * changes always auto-commit and live-sync with external column state, so `commitOnChange` is forced
 * true.
 * @internal
 */
export class ColChooserPanelModel extends ColChooserModel {
    @managed
    readonly panelModel: PanelModel;

    constructor(config: ColChooserPanelConfig) {
        super({...config, commitOnChange: true});
        this.panelModel = new PanelModel({
            side: 'right',
            defaultSize: this.width,
            minSize: 250,
            defaultCollapsed: true,
            ...config.panelConfig,
            // open/close is driven by collapsed state - force collapsible regardless of config.
            collapsible: true
        });
    }

    override get isOpen(): boolean {
        return !this.panelModel.collapsed;
    }

    override open() {
        this.panelModel.setCollapsed(false);
    }

    protected override hide() {
        this.panelModel.setCollapsed(true);
    }
}
