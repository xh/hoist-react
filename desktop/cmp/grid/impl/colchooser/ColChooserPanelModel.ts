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
import {isNumber} from 'lodash';
import {ColChooserModel} from './ColChooserModel';

/**
 * Column chooser model for the docked, non-modal side-panel presentation. Owns the {@link PanelModel}
 * that governs the dock's user-resizable width. Open/close is tracked directly by {@link isOpen} -
 * the panel renders only while open, driven externally (e.g. a `ColChooserButton` with
 * `target: 'panel'`, or `GridModel.showColChooserPanel()`) rather than by panel collapse. Non-modal
 * display means changes always auto-commit and live-sync with external column state, so
 * `commitOnChange` is forced true.
 * @internal
 */
export class ColChooserPanelModel extends ColChooserModel {
    @observable override isOpen = false;

    @managed
    readonly panelModel: PanelModel;

    get side(): 'left' | 'right' {
        return this.panelModel.side as 'left' | 'right';
    }

    // Outer panel governs the dock width; the library takes a fixed slice of it, buckets flex.
    override get sizeToContent(): boolean {
        return false;
    }

    constructor(config: ColChooserPanelConfig) {
        super({...config, commitOnChange: true});
        makeObservable(this);
        this.panelModel = new PanelModel({
            side: 'right',
            // Seed the dock wide enough to hold the buckets plus the library if it opens shown; the
            // toggle reaction keeps it in sync from there.
            defaultSize: this.dockSizeFor(this.isLibraryShown),
            minSize: 250,
            ...config.panelConfig,
            // Open/close is driven by `isOpen` (panel rendered only when open), not collapse - the
            // dock is purely resizable.
            collapsible: false,
            resizable: true
        });

        // Keep the buckets a constant width as the (roaming, shared) library toggles: grow the dock
        // by the library width when it shows, shrink it back when it hides. Delta-based so any manual
        // resize of the dock is preserved across toggles. Skips a non-numeric (percent) size.
        this.addReaction({
            track: () => this.isLibraryShown,
            run: shown => {
                const {size} = this.panelModel;
                if (isNumber(size)) {
                    this.panelModel.size = size + (shown ? this.libraryWidth : -this.libraryWidth);
                }
            }
        });
    }

    private dockSizeFor(libraryShown: boolean): number | string {
        const {width, libraryWidth} = this;
        return isNumber(width) && libraryShown ? width + libraryWidth : width;
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
