/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {hoistComponentFactory, useProvidedModel} from '@xh/hoist/core';
import {label} from '@xh/hoist/cmp/layout';
import {numberInput, textInput, switchInput} from '@xh/hoist/desktop/cmp/input';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {LogViewerModel} from './LogViewerModel';

export const logViewerToolbar = hoistComponentFactory(
    (props) => {
        const model = useProvidedModel(LogViewerModel, props);
        return toolbar(
            label('Start line:'),
            numberInput({
                model,
                bind: 'startLine',
                min: 0,
                width: 80,
                disabled: model.tail,
                displayWithCommas: true
            }),
            label('Max lines:'),
            numberInput({
                model,
                bind: 'maxLines',
                min: 1,
                width: 80,
                displayWithCommas: true
            }),
            toolbarSep(),
            textInput({
                model,
                bind: 'pattern',
                placeholder: 'Search...',
                enableClear: true,
                width: 150
            }),
            toolbarSep(),
            switchInput({
                model,
                bind: 'tail',
                label: 'Tail mode'
            })
        );
    }
);