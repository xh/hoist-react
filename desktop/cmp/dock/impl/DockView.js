/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {DockViewModel} from '@xh/hoist/cmp/dock';
import {div, filler, hbox, span, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, refreshContextView, RenderMode, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {fullScreenSupport} from '@xh/hoist/desktop/cmp/fullscreenhandler/FullScreenSupport';
import {Icon} from '@xh/hoist/icon';
import {elementFromContent} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {useRef} from 'react';
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


        const suffix = collapsed ? 'collapsed' : docked ? 'docked' : 'dialog';

        return fullScreenSupport({
            canOutsideClickClose: false,
            onClose: () => model.onClose(),
            style: {width, height},
            item: vbox({
                width: collapsed ? collapsedWidth : width,
                height: !collapsed ? height: null,
                className: classNames(className, `xh-dock-view--${suffix}`),
                items: [header, unmount ? null : body]
            })
        });
    }
});


const headerCmp = hoistCmp.factory(
    ({model, compactHeaders}) => {
        const {icon, title, collapsed, docked, allowClose, allowDialog} = model;

        return div({
            className: `xh-dock-view__header ${compactHeaders ? 'xh-dock-view__header--compact' : ''}`,
            item: hbox({
                className: `xh-dock-view__header__inner`,
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
            })
        });
    }
);
