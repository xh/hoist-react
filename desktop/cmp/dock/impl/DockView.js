/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {isValidElement} from 'react';
import {elem, hoistCmp, uses} from '@xh/hoist/core';
import {div, hbox, vbox, span, filler} from '@xh/hoist/cmp/layout';
import {dialog} from '@xh/hoist/kit/blueprint';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {DockViewModel} from '@xh/hoist/cmp/dock';
import classNames from 'classnames';

import './Dock.scss';

/**
 * Wrapper for contents to be shown within a DockContainer.
 *
 * @private
 */
export const dockView = hoistCmp.factory({
    displayName: 'DockView',
    model: uses(DockViewModel),
    className: 'xh-dock-view',

    render({model, className, compactHeaders}) {
        const {collapsed, docked} = model;

        // 1) Render docked
        if (collapsed || docked) {
            return vbox({
                className: classNames(className, collapsed ? 'xh-dock-view--collapsed' : null),
                items: [header({compactHeaders}), body()]
            });
        }

        // 2) Render in Dialog
        return dialog({
            className: classNames(className, 'xh-dock-view--dialog'),
            isOpen: true,
            onClose: () => model.onClose(),
            canOutsideClickClose: false,
            items: [header({compactHeaders}), body()]
        });
    }
});


const header = hoistCmp.factory(
    ({model, compactHeaders}) => {
        const {icon, title, collapsed, docked, allowClose, allowDialog} = model;

        return hbox({
            className: `xh-dock-view__header ${compactHeaders ? 'xh-dock-view__header--compact' : ''}`,
            items: [
                span({
                    omit: !icon,
                    item: icon,
                    className: 'xh-dock-view__header__icon',
                    onDoubleClick: () => model.toggleCollapsed()
                }),
                span({
                    omit: !title,
                    item: title,
                    className: 'xh-dock-view__header__title',
                    onDoubleClick: () => model.toggleCollapsed()
                }),
                filler(),
                button({
                    icon: collapsed ? Icon.angleUp() : Icon.angleDown(),
                    onClick: () => model.toggleCollapsed()
                }),
                button({
                    omit: collapsed || !allowDialog,
                    icon: docked ? Icon.expand() : Icon.collapse(),
                    onClick: () => model.toggleDocked()
                }),
                button({
                    omit: !allowClose,
                    icon: Icon.close(),
                    onClick: () => model.close()
                })
            ]
        });
    }
);

const body = hoistCmp.factory(
    ({model}) => {
        let {content} = model,
            contentEl = content.isHoistComponent ? elem(content) : content;
        if (!isValidElement(contentEl)) {
            console.error("Please specify a React element, or a Component for the 'content' of a DockedView");
            contentEl = null;
        }

        return div({className: 'xh-dock-view__body', item: contentEl});
    }
);