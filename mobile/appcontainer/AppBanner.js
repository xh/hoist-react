/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {AppBannerModel} from '@xh/hoist/appcontainer/AppBannerModel';
import {XH, uses, hoistCmp} from '@xh/hoist/core';
import {div, filler} from '@xh/hoist/cmp/layout';
import {button} from '@xh/hoist/mobile/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {isFunction} from 'lodash';
import classNames from 'classnames';

import './AppBanner.scss';

/** @private */
export const appBanner = hoistCmp.factory({
    displayName: 'AppBanner',
    model: uses(AppBannerModel),
    render({model}) {
        const {isShowing, config} = model;
        if (!isShowing) return null;

        const {
            className,
            message,
            icon,
            intent,
            actionFn,
            actionButtonProps,
            ...props
        } = config;

        return div({
            className: classNames(
                'xh-app-banner',
                className,
                intent ? `xh-intent-${intent}` : null
            ),
            items: [
                icon,
                div({
                    className: 'xh-app-banner__message',
                    item: message
                }),
                filler(),
                actionButton({actionFn, actionButtonProps}),
                dismissButton()
            ],
            ...props
        });
    }
});

const actionButton = hoistCmp.factory(
    ({actionFn, actionButtonProps}) => {
        if (!isFunction(actionFn)) return null;
        return button({
            text: 'Action',
            onClick: () => actionFn(),
            ...actionButtonProps
        });
    }
);

const dismissButton = hoistCmp.factory(
    () => {
        return button({
            icon: Icon.close(),
            modifier: 'quiet',
            onClick: () => XH.hideBanner()
        });
    }
);