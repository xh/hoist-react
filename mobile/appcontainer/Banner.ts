/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {BannerModel} from '@xh/hoist/appcontainer/BannerModel';
import {XH, uses, hoistCmp} from '@xh/hoist/core';
import {hframe, div} from '@xh/hoist/cmp/layout';
import {button} from '@xh/hoist/mobile/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {markdown} from '@xh/hoist/cmp/markdown';
import {isEmpty, isFunction, isString} from 'lodash';
import classNames from 'classnames';

import './Banner.scss';

/**
 * Internal component to display a single instance of an app-wide banner.
 * @see XH.showBanner()
 * @internal
 */
export const banner = hoistCmp.factory({
    displayName: 'Banner',
    model: uses(BannerModel),
    render({model}) {
        const {icon, message, intent, onClick, className} = model;

        return div({
            className: classNames(
                'xh-banner',
                className,
                intent ? `xh-bg-intent-${intent}` : `xh-bg-intent-none`
            ),
            items: [
                hframe({
                    className: classNames(
                        'xh-banner__click_target',
                        onClick ? 'xh-banner__click_target--clickable' : null
                    ),
                    items: [
                        icon,
                        div({
                            className: 'xh-banner__message',
                            item: isString(message) ? markdown({content: message}) : message,
                            onClick
                        })
                    ]
                }),
                actionButton(),
                dismissButton()
            ]
        });
    }
});

const actionButton = hoistCmp.factory<BannerModel>(({model}) => {
    const {actionButtonProps} = model;
    if (isEmpty(actionButtonProps)) return null;

    return button({
        className: 'xh-banner__action-button',
        outlined: true,
        ...actionButtonProps
    });
});

const dismissButton = hoistCmp.factory<BannerModel>(({model}) => {
    const {enableClose, category, onClose} = model;
    if (!enableClose) return null;

    return button({
        icon: Icon.close(),
        minimal: true,
        className: 'xh-banner__dismiss-button',
        onClick: () => {
            XH.hideBanner(category);
            if (isFunction(onClose)) onClose(model);
        }
    });
});
