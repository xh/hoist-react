/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {BannerModel} from '@xh/hoist/appcontainer/BannerModel';
import {XH, uses, hoistCmp} from '@xh/hoist/core';
import {hframe, div} from '@xh/hoist/cmp/layout';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {isFunction, isEmpty} from 'lodash';
import classNames from 'classnames';

import './Banner.scss';

/**
 * Internal component to display a single instance of an app-wide banner.
 * @see {XH.showBanner()}
 * @private
 */
export const banner = hoistCmp.factory({
    displayName: 'Banner',
    model: uses(BannerModel),

    /** @param {BannerModel} model */
    render({model}) {
        const {
            icon,
            message,
            intent,
            onClick,
            className,
            props
        } = model;

        return toolbar({
            className: classNames(
                'xh-banner',
                className,
                intent ? `xh-intent-${intent}` : `xh-intent-none`
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
                            item: message,
                            onClick
                        })
                    ]
                }),
                actionButton(),
                dismissButton()
            ],
            ...props
        });
    }
});

const actionButton = hoistCmp.factory(
    /** @param {BannerModel} model */
    ({model}) => {
        const {actionButtonProps} = model;
        if (isEmpty(actionButtonProps)) return null;

        return button({
            outlined: true,
            className: 'xh-banner__action-button',
            ...actionButtonProps
        });
    }
);

const dismissButton = hoistCmp.factory(
    /** @param {BannerModel} model */
    ({model}) => {
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
    }
);
