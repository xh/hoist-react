/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {hoistCmp, uses} from '@xh/hoist/core';
import {columnChooser} from '@xh/hoist/desktop/cmp/grid/columnchooser/ColumnChooser';
import {Icon} from '@xh/hoist/icon';
import {dialog} from '@xh/hoist/kit/blueprint';
import {ColChooserModel} from './ColChooserModel';

export const colChooserDialog = hoistCmp.factory({
    model: uses(ColChooserModel),
    className: 'xh-col-chooser-dialog',

    render({model, className}) {
        const {isOpen, gridModel, showRestoreDefaults, width, height} = model;
        if (!isOpen) return null;

        return dialog({
            icon: Icon.gridPanel(),
            title: 'Choose Columns',
            isOpen: true,
            onClose: () => model.close(),
            item: columnChooser({gridModel, showRestoreDefaults, width, height}),
            className,
            style: {width}
        });
    }
});
