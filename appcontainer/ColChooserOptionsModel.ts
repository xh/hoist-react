/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {bindable, makeObservable} from '@xh/hoist/mobx';

/**
 * Shared display options for the grid column chooser, held as a single {@link AppContainerModel}
 * singleton so a toggle in one open chooser live-syncs (via MobX) to any other chooser already on
 * screen. Persisted browser-local, so the options roam across every chooser for the user in this
 * app on this device.
 * @internal
 */
export class ColChooserOptionsModel extends HoistModel {
    override xhImpl = true;
    override persistWith = {localStorageKey: 'xhColChooser'};

    @bindable showGroups: boolean = true;
    @bindable showLibrary: boolean = true;

    constructor() {
        super();
        makeObservable(this);
    }

    init() {
        // Bind persistence here rather than via @persist - this singleton is constructed during
        // AppContainerModel construction, before LocalStorageService is installed.
        this.markPersist('showGroups');
        this.markPersist('showLibrary');
    }
}
