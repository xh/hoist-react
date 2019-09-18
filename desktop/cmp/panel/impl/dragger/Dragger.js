/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {hoistCmp, useLocalModel} from '@xh/hoist/core';
import {div} from '@xh/hoist/cmp/layout';
import {DraggerAnimatedModel} from './DraggerAnimatedModel';
import {DraggerModel} from './DraggerModel';

import './Dragger.scss';


export const dragger = hoistCmp.factory({
    displayName: 'Dragger',
    model: false,

    render({model}) {
        const dragModel = useLocalModel(() => model.resizeWhileDragging ?
            new DraggerAnimatedModel(model) :
            new DraggerModel(model));

        return div({
            className: `xh-resizable-dragger ${model.side}`,
            onDrag: dragModel.onDrag,
            onDragStart: dragModel.onDragStart,
            onDragEnd: dragModel.onDragEnd,
            draggable: true
        });
    }
});

