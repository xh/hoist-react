/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {div} from '@xh/hoist/cmp/layout';
import {hoistCmp, useContextModel, useLocalModel} from '@xh/hoist/core';
import {PanelModel} from '../../PanelModel';
import './Dragger.scss';

import {DraggerModel} from './DraggerModel';


export const dragger = hoistCmp.factory({
    displayName: 'Dragger',
    model: false,

    render() {
        const panelModel = useContextModel(PanelModel),
            dragModel = useLocalModel(() => new DraggerModel(panelModel));

        return div({
            className: `xh-resizable-dragger ${panelModel.side}`,
            onDrag: dragModel.onDrag,
            onDragStart: dragModel.onDragStart,
            onDragEnd: dragModel.onDragEnd,
            draggable: true
        });
    }
});

