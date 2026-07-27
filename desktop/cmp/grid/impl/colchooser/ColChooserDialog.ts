/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {hoistCmp, uses} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {dialog} from '@xh/hoist/kit/blueprint';
import {ColChooserModalModel} from './ColChooserModalModel';
import {colChooser} from './ColChooser';

export const colChooserDialog = hoistCmp.factory({
    model: uses(ColChooserModalModel),
    className: 'xh-col-chooser-dialog',

    render({model, className}) {
        if (!model.isOpen) return null;

        return dialog({
            icon: Icon.gridPanel(),
            title: 'Choose Columns',
            isOpen: true,
            onClose: () => model.close(),
            item: colChooser({model}),
            className,
            // Hug the chooser's content - it sizes itself to the buckets plus the library when shown.
            style: {width: 'fit-content', maxWidth: '90vw'}
        });
    }
});
