/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {hbox, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {PanelModel} from '../PanelModel';
import './Splitter.scss';

export const splitter = hoistCmp.factory({
    displayName: 'Splitter',
    model: false,

    render() {
        const panelModel = useContextModel(PanelModel),
            {vertical, collapsed, contentFirst, showSplitterCollapseButton, collapsible} =
                panelModel,
            directions = vertical
                ? ['panelCollapseToggleUp', 'panelCollapseToggleDown']
                : ['panelCollapseToggleLeft', 'panelCollapseToggleRight'],
            idx = contentFirst != collapsed ? 0 : 1,
            chevron = directions[idx];

        const cmp = vertical ? hbox : vbox,
            cfg = {
                className: `xh-resizable-splitter ${vertical ? 'vertical' : 'horizontal'}`,
                item: button({
                    className: 'xh-resizable-collapser-btn',
                    icon: Icon[chevron](),
                    onClick: () => panelModel.toggleCollapsed(),
                    omit: !showSplitterCollapseButton || !collapsible
                }),
                ref: panelModel.splitterRef
            };

        return cmp(cfg);
    }
});
