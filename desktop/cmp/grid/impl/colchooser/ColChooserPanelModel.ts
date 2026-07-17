/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ColChooserPanelConfig} from '@xh/hoist/cmp/grid';
import {managed} from '@xh/hoist/core';
import {PanelModel} from '@xh/hoist/desktop/cmp/panel';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {ColChooserModel} from './ColChooserModel';

/**
 * Column chooser model for the docked, non-modal side-panel presentation. Owns the {@link PanelModel}
 * that governs the dock's user-resizable width. Open/close is tracked directly by {@link isOpen} -
 * the panel renders only while open, driven by the persistent grid-edge toggle rail rather than by
 * panel collapse, so the closed grid edge carries only that rail. Non-modal display means changes
 * always auto-commit and live-sync with external column state, so `commitOnChange` is forced true.
 * @internal
 */
export class ColChooserPanelModel extends ColChooserModel {
    @observable override isOpen = false;

    /** Show the grid-edge toggle rail (the dock's built-in open/close affordance). */
    readonly showRail: boolean;

    @managed
    readonly panelModel: PanelModel;

    get side(): 'left' | 'right' {
        return this.panelModel.side as 'left' | 'right';
    }

    constructor(config: ColChooserPanelConfig) {
        super({...config, commitOnChange: true});
        makeObservable(this);
        this.showRail = config.showRail ?? true;
        this.panelModel = new PanelModel({
            side: 'right',
            defaultSize: this.width,
            minSize: 250,
            ...config.panelConfig,
            // Open/close is driven by `isOpen` (panel rendered only when open), not collapse - the
            // dock is purely resizable.
            collapsible: false,
            resizable: true
        });
    }

    @action
    override open() {
        this.isOpen = true;
    }

    @action
    protected override hide() {
        this.isOpen = false;
    }
}
