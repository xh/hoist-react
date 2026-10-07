/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {hoistCmp, uses} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {DockedColChooserModel} from './DockedColChooserModel';
import {colChooser} from './ColChooser';

/**
 * Docked, non-modal side-panel column chooser - a resizable, header-less dock rendered alongside the
 * grid while open. Desktop only; Grid mounts this in an `hframe` when its chooser is configured
 * with `mode: 'docked'`.
 * @internal
 */
export const dockedColChooser = hoistCmp.factory({
    displayName: 'DockedColChooser',
    model: uses(DockedColChooserModel),

    render({model}) {
        if (!model.isOpen) return null;
        return panel({
            className: 'xh-docked-col-chooser',
            model: model.panelModel,
            item: colChooser({model})
        });
    }
});
