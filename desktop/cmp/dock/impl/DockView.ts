/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {DockViewModel} from '@xh/hoist/desktop/cmp/dock';
import {div, filler, hbox, span, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, refreshContextView, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {modalSupport} from '@xh/hoist/desktop/cmp/modalsupport/ModalSupport';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {elementFromContent} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {useRef} from 'react';
import './Dock.scss';
import {errorBoundary} from '@xh/hoist/cmp/error/ErrorBoundary';

interface DockViewProps extends HoistProps<DockViewModel> {
    /** True to style docked headers with reduced padding and font-size. */
    compactHeaders?: boolean;
}

/**
 * Wrapper for contents to be shown within a DockContainer.
 *
 * @internal
 */
export const dockView = hoistCmp.factory<DockViewProps>({
    displayName: 'DockView',
    model: uses(DockViewModel),
    className: 'xh-dock-view',
    render({model, className, compactHeaders}) {
        const {
                width,
                height,
                collapsedWidth,
                dialogWidth,
                dialogHeight,
                collapsed,
                docked,
                isActive,
                renderMode,
                refreshContextModel
            } = model,
            wasActivated = useRef(false);

        if (!wasActivated.current && isActive) wasActivated.current = true;

        const unmount =
            !isActive &&
            (renderMode === 'unmountOnHide' || (renderMode === 'lazy' && !wasActivated.current));

        const header = headerCmp({compactHeaders}),
            body =
                unmount && (collapsed || docked)
                    ? null
                    : refreshContextView({
                          model: refreshContextModel,
                          item: div({
                              className: 'xh-dock-view__body',
                              item: errorBoundary(elementFromContent(model.content))
                          })
                      });

        const suffix = collapsed ? 'collapsed' : docked ? 'docked' : 'dialog';

        return modalSupport({
            model: model.modalSupportModel,
            item: vbox({
                width: collapsed ? collapsedWidth : docked ? width : dialogWidth,
                height: collapsed ? undefined : docked ? height : dialogHeight,
                className: classNames(className, `xh-dock-view--${suffix}`),
                items: [header, body]
            })
        });
    }
});

//------------------
// Implementation
//------------------
const headerCmp = hoistCmp.factory<DockViewModel>(({model, compactHeaders}) => {
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
});
