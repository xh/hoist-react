/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {hoistCmp, uses} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {ColChooserPanelModel} from './ColChooserPanelModel';
import {columnChooser} from './ColumnChooser';

/**
 * Docked, non-modal side-panel column chooser, rendered alongside the grid as a resizable,
 * header-less chooser dock (shown only while open). Open/close is driven externally - e.g. a
 * `ColChooserButton` with `target: 'panel'`, or `GridModel.showColChooserPanel()`. Desktop only -
 * Grid mounts this within an `hframe` when a {@link ColChooserPanelModel} is configured.
 * @internal
 */
export const colChooserPanel = hoistCmp.factory({
    displayName: 'ColChooserPanel',
    model: uses(ColChooserPanelModel),

    render({model}) {
        if (!model.isOpen) return null;
        return panel({
            className: 'xh-col-chooser-panel',
            model: model.panelModel,
            item: columnChooser({model})
        });
    }
});
