/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {box, filler, hbox, span, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, useContextModel} from '@xh/hoist/core';
import {button, modalToggleButton} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {withDefault} from '@xh/hoist/utils/js';
import classNames from 'classnames';
import {isEmpty, isNil} from 'lodash';
import {PanelModel} from '../PanelModel';
import './PanelHeader.scss';

export const panelHeader = hoistCmp.factory({
    displayName: 'PanelHeader',
    model: false,
    className: 'xh-panel-header',

    render({className, ...props}) {
        const panelModel = useContextModel(PanelModel),
            {
                isRenderedCollapsed,
                isCollapsedToLeftOrRight,
                collapsible,
                isModal,
                side,
                showModalToggleButton,
                showHeaderCollapseButton
            } = panelModel,
            {title, icon, compact} = props;

        // Title and icon can vary based on collapsed state.
        const collapsedTitle = withDefault(props.collapsedTitle, title),
            displayedTitle = (isRenderedCollapsed ? collapsedTitle : title) ?? null,
            collapsedIcon = withDefault(props.collapsedIcon, icon),
            displayedIcon = (isRenderedCollapsed ? collapsedIcon : icon) ?? null;

        // As can headerItems, which include app-specified controls (never shown when collapsed)
        // as well as (maybe) built-in modal/collapse toggle buttons.
        const headerItems = props.headerItems ?? [],
            displayedHeaderItems = isRenderedCollapsed ? [] : [...headerItems];

        // Return null if nothing to display.
        if (isNil(displayedTitle) && isNil(displayedIcon) && isEmpty(displayedHeaderItems)) {
            return null;
        }

        if (showModalToggleButton && !isRenderedCollapsed) {
            displayedHeaderItems.push(modalToggleButton());
        }
        if (showHeaderCollapseButton && !isModal) {
            displayedHeaderItems.push(collapseToggleButton({panelModel}));
        }

        const onDoubleClick = () => {
            if (isModal) {
                panelModel.toggleIsModal();
            } else if (collapsible) {
                panelModel.toggleCollapsed();
            }
        };

        const titleCls = 'xh-panel-header__title',
            sideCls = `xh-panel-header--${side}`,
            compactCls = compact ? 'xh-panel-header--compact' : null;

        // Return a vertically oriented header if collapsed to left or right side.
        if (isCollapsedToLeftOrRight) {
            return vbox({
                className: classNames(className, sideCls, compactCls),
                flex: 1,
                items: [
                    displayedIcon,
                    displayedTitle
                        ? box({
                              className: titleCls,
                              flex: 1,
                              item: span({className: `${titleCls}__inner`, item: displayedTitle})
                          })
                        : filler(),
                    ...displayedHeaderItems
                ],
                onDoubleClick
            });
        }

        // Return a standard horizontal header otherwise.
        // Panel is expanded, modal, and/or collapsed to the top or bottom side.
        return hbox({
            className: classNames(className, compactCls),
            items: [
                displayedIcon,
                displayedTitle
                    ? box({
                          className: titleCls,
                          flex: 1,
                          item: span({className: `${titleCls}__inner`, item: displayedTitle})
                      })
                    : filler(),
                hbox({
                    className: 'xh-panel-header__items',
                    items: displayedHeaderItems,
                    onDoubleClick: e => e.stopPropagation()
                })
            ],
            onDoubleClick
        });
    }
});

const collapseToggleButton = hoistCmp.factory(({panelModel}) => {
    const {vertical, collapsed, contentFirst} = panelModel as PanelModel,
        directions = vertical ? ['chevronUp', 'chevronDown'] : ['chevronLeft', 'chevronRight'],
        idx = contentFirst !== collapsed ? 0 : 1,
        chevron = directions[idx];

    return button({
        icon: Icon[chevron](),
        onClick: () => panelModel.toggleCollapsed(),
        minimal: true
    });
});
