/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {hoistCmp, uses} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {ColChooserPanelModel} from './ColChooserPanelModel';
import {colChooser} from './ColChooser';

/**
 * Docked, non-modal side-panel column chooser - a resizable, header-less dock rendered alongside the
 * grid while open. Desktop only; Grid mounts this in an `hframe` when a {@link ColChooserPanelModel} is
 * configured.
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
            item: colChooser({model})
        });
    }
});
