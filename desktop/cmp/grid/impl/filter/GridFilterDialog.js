/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp, uses} from '@xh/hoist/core';
import {GridFilterModel} from '@xh/hoist/cmp/grid/filter/GridFilterModel';
import {filler} from '@xh/hoist/cmp/layout';
import {dialog} from '@xh/hoist/kit/blueprint';
import {Icon} from '@xh/hoist/icon';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {jsonInput} from '@xh/hoist/desktop/cmp/input';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {button} from '@xh/hoist/desktop/cmp/button';

import './GridFilterDialog.scss';

/**
 * Dialog for showing a read-only JSON representation of the currently applied grid filters.
 *
 * Applications should not create this component - it is created automatically for Grids with
 * a GridFilterModel, and is available via the `gridFilter` StoreContextMenu action.
 *
 * @private
 */
export const gridFilterDialog = hoistCmp.factory({
    model: uses(GridFilterModel),
    className: 'xh-grid-filter-dialog',
    render({model, className}) {
        if (!model.dialogOpen) return null;
        return dialog({
            className,
            icon: Icon.code(),
            title: 'Grid Filters',
            isOpen: true,
            onClose: () => model.closeDialog(),
            item: panel({
                item: filterView(),
                bbar: bbar()
            })
        });
    }
});

const filterView = hoistCmp.factory(
    ({model}) => {
        const value = JSON.stringify(model.filter?.toJSON() ?? null, undefined, 2);
        return jsonInput({
            value,
            readonly: true,
            showCopyButton: true
        });
    }
);

const bbar = hoistCmp.factory(
    ({model}) => {
        return toolbar(
            button({
                icon: Icon.reset(),
                intent: 'danger',
                text: 'Clear Filter',
                onClick: () => {
                    model.clear();
                    model.closeDialog();
                }
            }),
            filler(),
            button({
                text: 'Close',
                onClick: () => model.closeDialog()
            })
        );
    }
);