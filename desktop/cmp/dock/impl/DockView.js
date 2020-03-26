/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {useRef} from 'react';
import {hoistCmp, uses, RenderMode} from '@xh/hoist/core';
import {div, hbox, vbox, span, filler} from '@xh/hoist/cmp/layout';
import {refreshContextView} from '@xh/hoist/core/refresh';
import {elementFromContent} from '@xh/hoist/utils/react';
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
        const {width, height, collapsedWidth, collapsed, docked, isActive, renderMode, refreshContextModel} = model,
            wasActivated = useRef(false);

        if (!wasActivated.current && isActive) wasActivated.current = true;

        const unmount = !isActive && (
            (renderMode === RenderMode.UNMOUNT_ON_HIDE) ||
            (renderMode === RenderMode.LAZY && !wasActivated.current)
        );

        const header = headerCmp({compactHeaders}),
            body = refreshContextView({
                model: refreshContextModel,
                item: div({className: 'xh-dock-view__body', item: elementFromContent(model.content)})
            });

        // 1) Render collapsed
        if (collapsed) {
            return vbox({
                width: collapsedWidth,
                className: classNames(className, 'xh-dock-view--collapsed'),
                items: [header, unmount ? null : body]
            });
        }

        // 1) Render docked
        if (docked) {
            return vbox({
                width,
                height,
                className: classNames(className, 'xh-dock-view--docked'),
                items: [header, unmount ? null : body]
            });
        }

        // 2) Render in Dialog
        return dialog({
            className: classNames(className, 'xh-dock-view--dialog'),
            style: {width, height},
            isOpen: true,
            onClose: () => model.onClose(),
            canOutsideClickClose: false,
            items: [header, body]
        });
    }
});


const headerCmp = hoistCmp.factory(
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