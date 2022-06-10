/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {box, filler, hbox, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import classNames from 'classnames';
import {isEmpty} from 'lodash';
import {PanelModel} from '../PanelModel';
import './PanelHeader.scss';

export const panelHeader = hoistCmp.factory({
    displayName: 'PanelHeader',
    model: false,
    className: 'xh-panel-header',

    render({className, ...props}) {
        const panelModel = useContextModel(PanelModel),
            {collapsed, vertical, side, showHeaderCollapseButton} = panelModel,
            {title, icon, compact} = props,
            headerItems = props.headerItems ?? [];

        if (!title && !icon && isEmpty(headerItems) && !showHeaderCollapseButton) return null;

        const onDoubleClick = () => {
            if (panelModel.collapsible) panelModel.toggleCollapsed();
        };

        const titleCls = 'xh-panel-header__title',
            sideCls = `xh-panel-header--${side}`,
            compactCls = compact ? 'xh-panel-header--compact' : null;

        if (!collapsed || vertical) {
            return hbox({
                className: classNames(className, compactCls),
                items: [
                    icon || null,
                    title ?
                        box({
                            className: titleCls,
                            flex: 1,
                            item: title
                        }) :
                        filler(),
                    hbox({
                        className: 'xh-panel-header__items',
                        items: [...(!collapsed ? headerItems : []),
                            collapseButton({panelModel})
                        ],
                        onDoubleClick: (e) => e.stopPropagation()
                    })
                ],
                onDoubleClick
            });
        } else {
            // For vertical layout, skip header items.
            const isLeft = side === 'left';
            return vbox({
                className: classNames(className, sideCls, compactCls),
                flex: 1,
                items: [
                    isLeft ? filler() : collapseButton({panelModel}),
                    icon || null,
                    title ?
                        box({
                            className: titleCls,
                            item: title
                        }) :
                        null,
                    !isLeft ? filler() : collapseButton({panelModel})
                ],
                onDoubleClick
            });
        }
    }
});


const collapseButton = hoistCmp.factory(
    ({panelModel}) => {
        if (!panelModel.showHeaderCollapseButton || !panelModel.collapsible) return null;

        const {vertical, collapsed, contentFirst} = panelModel,
            directions = vertical ? ['chevronUp', 'chevronDown'] : ['chevronLeft', 'chevronRight'],
            idx = (contentFirst != collapsed ? 0 : 1),
            chevron = directions[idx];

        return button({
            icon: Icon[chevron](),
            onClick: () => panelModel.toggleCollapsed(),
            minimal: true
        });
    }
);
