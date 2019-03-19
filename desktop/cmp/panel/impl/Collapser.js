/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {hoistComponent, useProvidedModel} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/desktop/cmp/button';
import {hbox, vbox} from '@xh/hoist/cmp/layout';

import {PanelModel} from '../PanelModel';
import './Collapser.scss';

/**
 * @private
 */
export const [Collapser, collapser] = hoistComponent(props => {
    const model = useProvidedModel(PanelModel, props),
        {vertical, showSplitterCollapseButton} = model;

    const cmp = vertical ? hbox : vbox,
        cfg = {
            className: `xh-resizable-collapser ${vertical ? 'vertical' : 'horizontal'}`,
            item: button({
                className: 'xh-resizable-collapser-btn',
                icon: Icon[getChevron(model)](),
                onClick: () => model.toggleCollapsed(),
                omit: !showSplitterCollapseButton
            })
        };

    return cmp(cfg);
});

function getChevron(model) {
    const {vertical, collapsed, contentFirst} = model,
        directions = vertical ? ['chevronUp', 'chevronDown'] : ['chevronLeft', 'chevronRight'],
        idx = (contentFirst != collapsed ? 0 : 1);
    return directions[idx];
}