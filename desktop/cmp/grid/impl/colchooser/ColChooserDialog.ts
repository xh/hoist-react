/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {hoistCmp, uses} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {dialog} from '@xh/hoist/kit/blueprint';
import {colChooser} from './ColChooser';
import {ColChooserModel} from './ColChooserModel';

export const colChooserDialog = hoistCmp.factory({
    model: uses(ColChooserModel),
    className: 'xh-col-chooser-dialog',

    render({model, className}) {
        const {isOpen, width} = model;
        if (!isOpen) return null;

        return dialog({
            icon: Icon.gridPanel(),
            title: 'Choose Columns',
            isOpen: true,
            onClose: () => model.close(),
            item: colChooser({model}),
            className,
            style: {width}
        });
    }
});
