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
            {collapsed, isModal, vertical, side, showHeaderCollapseButton} = panelModel,
            {title, icon, compact} = props,
            headerItems = props.headerItems ?? [];

        if (
            !title && !icon && isEmpty(headerItems) &&
            (!showHeaderCollapseButton && !isModal)
        ) return null;

        const onDoubleClick = () => {
            if (isModal) {
                panelModel.toggleIsModal();
            } else {
                panelModel.toggleCollapsed();
            }
        };

        const titleCls = 'xh-panel-header__title',
            sideCls = `xh-panel-header--${side}`,
            compactCls = compact ? 'xh-panel-header--compact' : null;

        // 1) Classic "top" title bar
        if (!collapsed || vertical || isModal) {
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
                        items: [
                            ...(!collapsed || isModal ? headerItems : []),
                            modalButton({panelModel}),
                            !isModal ? collapseButton({panelModel}) : null
                        ],
                        onDoubleClick: (e) => e.stopPropagation()
                    })
                ],
                onDoubleClick
            });
        }

        // 2) ...otherwise its a narrow, sidebar
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

export const modalButton = hoistCmp.factory(
    ({panelModel}) => {
        if (!panelModel.modalView || panelModel.collapsed) return null;
        return button({
            icon: panelModel.isModal ? Icon.close() : Icon.openExternal(),
            onClick: () => panelModel.toggleIsModal(),
            minimal: true
        });
    }
);