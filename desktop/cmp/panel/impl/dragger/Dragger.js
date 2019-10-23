/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {hoistCmp, useContextModel, useLocalModel} from '@xh/hoist/core';
import {div} from '@xh/hoist/cmp/layout';
import {DraggerAnimatedModel} from './DraggerAnimatedModel';
import {DraggerModel} from './DraggerModel';
import {PanelModel} from '../../PanelModel';

import './Dragger.scss';


export const dragger = hoistCmp.factory({
    displayName: 'Dragger',
    model: false,

    render() {
        const panelModel = useContextModel(PanelModel),
            dragModel = useLocalModel(() => panelModel.resizeWhileDragging ?
                new DraggerAnimatedModel(panelModel) :
                new DraggerModel(panelModel));

        return div({
            className: `xh-resizable-dragger ${panelModel.side}`,
            onDrag: dragModel.onDrag,
            onDragStart: dragModel.onDragStart,
            onDragEnd: dragModel.onDragEnd,
            draggable: true
        });
    }
});

