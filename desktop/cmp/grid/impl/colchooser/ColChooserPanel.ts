/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {hoistCmp, uses} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {ColChooserPanelModel} from './ColChooserPanelModel';
import {columnChooser} from './ColumnChooser';

/**
 * Docked, non-modal side-panel column chooser, rendered alongside the grid. Desktop only - Grid
 * mounts this within an `hframe` when a {@link ColChooserPanelModel} is configured.
 * @internal
 */
export const colChooserPanel = hoistCmp.factory({
    displayName: 'ColChooserPanel',
    model: uses(ColChooserPanelModel),
    className: 'xh-col-chooser-panel',

    render({model, className}) {
        return panel({
            title: 'Columns',
            icon: Icon.gridPanel(),
            className,
            compactHeader: true,
            model: model.panelModel,
            item: columnChooser({model})
        });
    }
});
