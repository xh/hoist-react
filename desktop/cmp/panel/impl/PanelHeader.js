/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {box, hbox, vbox, filler} from '@xh/hoist/cmp/layout';

import './PanelHeader.scss';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import classNames from 'classnames';

export const panelHeader = hoistCmp.factory({
    displayName: 'PanelHeader',
    model: false,
    className: 'xh-panel-header',

    render({model, className, ...props}) {
        const {collapsed, vertical, side, showHeaderCollapseButton} = model,
            {title, icon, compact, headerItems = []} = props;

        if (!title && !icon && !headerItems.length && !showHeaderCollapseButton) return null;

        const onDoubleClick = () => {
            if (model.collapsible) model.toggleCollapsed();
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
                    ...(!collapsed ? headerItems : []),
                    collapseButton({model})
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
                    isLeft ? filler() : collapseButton({model}),
                    icon || null,
                    title ?
                        box({
                            className: titleCls,
                            item: title
                        }) :
                        null,
                    !isLeft ? filler() : collapseButton({model})
                ],
                onDoubleClick
            });
        }
    }
});


const collapseButton = hoistCmp.factory({
    displayName: 'CollapseButton',
    model: false,

    render({model}) {
        if (!model.showHeaderCollapseButton || !model.collapsible) return null;

        const {vertical, collapsed, contentFirst} = model,
            directions = vertical ? ['chevronUp', 'chevronDown'] : ['chevronLeft', 'chevronRight'],
            idx = (contentFirst != collapsed ? 0 : 1),
            chevron = directions[idx];

        return button({
            icon: Icon[chevron](),
            onClick: () => model.toggleCollapsed(),
            minimal: true
        });
    }
});