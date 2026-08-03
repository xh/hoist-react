/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ColChooserPanelConfig} from '@xh/hoist/cmp/grid';
import {HSide, managed} from '@xh/hoist/core';
import {PanelModel} from '@xh/hoist/desktop/cmp/panel';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {isNumber} from 'lodash';
import {ColChooserModel} from './ColChooserModel';

/**
 * Column chooser model for the docked, non-modal side-panel presentation, owning the {@link PanelModel}
 * that governs the dock's resizable width. The panel renders only while {@link isOpen}, driven
 * externally rather than by panel collapse. Non-modal, so `commitOnChange` is forced true.
 * @internal
 */
export class ColChooserPanelModel extends ColChooserModel {
    @observable override isOpen = false;

    @managed
    readonly panelModel: PanelModel;

    get side(): HSide {
        return this.panelModel.side as HSide;
    }

    override get sizeToContent(): boolean {
        return false;
    }

    constructor(config: ColChooserPanelConfig) {
        super({...config, commitOnChange: true});
        makeObservable(this);

        const {width, libraryWidth, isLibraryShown} = this;

        this.panelModel = new PanelModel({
            side: 'right',
            defaultSize: isNumber(width) && isLibraryShown ? width + libraryWidth : width,
            minSize: 250,
            ...config.panelConfig,
            collapsible: false,
            resizable: true
        });

        // Keep the buckets a constant width as the library toggles. Delta-based, so a manual resize of
        // the dock survives across toggles; a non-numeric (percent) size is skipped.
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

    @action
    override open() {
        this.isOpen = true;
    }

    @action
    protected override hide() {
        this.isOpen = false;
    }
}
