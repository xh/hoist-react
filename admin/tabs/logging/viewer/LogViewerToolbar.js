/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {hoistCmp} from '@xh/hoist/core';
import {label} from '@xh/hoist/cmp/layout';
import {numberInput, textInput, switchInput} from '@xh/hoist/desktop/cmp/input';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';

export const logViewerToolbar = hoistCmp.factory(
    (model) => toolbar(
        label('Start line:'),
        numberInput({
            bind: 'startLine',
            min: 0,
            width: 80,
            disabled: model.tail,
            displayWithCommas: true
        }),
        label('Max lines:'),
        numberInput({
            bind: 'maxLines',
            min: 1,
            width: 80,
            displayWithCommas: true
        }),
        toolbarSep(),
        textInput({
            bind: 'pattern',
            placeholder: 'Search...',
            enableClear: true,
            width: 150
        }),
        toolbarSep(),
        switchInput({
            bind: 'tail',
            label: 'Tail mode'
        })
    )
);