/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {dialog} from '@xh/hoist/kit/blueprint';
import {hoistCmpFactory, receive} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {getClassName} from '@xh/hoist/utils/react';

import {colChooser} from './ColChooser';
import {ColChooserModel} from './ColChooserModel';

export const colChooserDialog = hoistCmpFactory({
    model: receive(ColChooserModel),

    render({model, ...props}) {

        if (!model.isOpen) return null;

        const className = getClassName('xh-col-chooser-dialog', props);

        return dialog({
            icon: Icon.gridPanel(),
            title: 'Choose Columns',
            isOpen: true,
            onClose: () => model.close(),
            item: colChooser({model}),
            className
        });
    }
});
