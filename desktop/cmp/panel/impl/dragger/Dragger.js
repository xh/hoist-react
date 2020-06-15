/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {div} from '@xh/hoist/cmp/layout';
import {hoistCmp, useContextModel, useLocalModel} from '@xh/hoist/core';

import './Dragger.scss';
import {DraggerModel} from './DraggerModel';
import {PanelModel} from '../../PanelModel';

export const dragger = hoistCmp.factory({
    displayName: 'Dragger',
    model: false,

    render() {
        const panelModel = useContextModel(PanelModel),
            dragModel = useLocalModel(() => new DraggerModel(panelModel));

        return div({
            ref: dragModel.ref,
            className: `xh-resizable-dragger ${panelModel.side}`,
            draggable: true
        });
    }
});

