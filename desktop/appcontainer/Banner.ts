/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {BannerModel} from '@xh/hoist/appcontainer/BannerModel';
import {XH, uses, hoistCmp} from '@xh/hoist/core';
import {hframe, div} from '@xh/hoist/cmp/layout';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {markdown} from '@xh/hoist/cmp/markdown';
import {isFunction, isEmpty, isString} from 'lodash';
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

        return toolbar({
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
        outlined: true,
        className: 'xh-banner__action-button',
        ...actionButtonProps
    });
});

const dismissButton = hoistCmp.factory<BannerModel>(({model}) => {
    const {enableClose, category, onClose} = model;
    if (!enableClose) return null;

    return button({
        icon: Icon.close(),
        className: 'xh-banner__dismiss-button',
        onClick: () => {
            XH.hideBanner(category);
            if (isFunction(onClose)) onClose(model);
        }
    });
});
