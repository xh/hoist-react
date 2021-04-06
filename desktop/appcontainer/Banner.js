/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {BannerModel} from '@xh/hoist/appcontainer/BannerModel';
import {XH, uses, hoistCmp} from '@xh/hoist/core';
import {div} from '@xh/hoist/cmp/layout';
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
    render({model}) {
        const {
            icon,
            message,
            intent,
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
                icon,
                div({
                    className: 'xh-banner__message',
                    item: message
                }),
                actionButton(),
                dismissButton()
            ],
            ...props
        });
    }
});

const actionButton = hoistCmp.factory(
    ({model}) => {
        const {actionButtonProps} = model;
        if (isEmpty(actionButtonProps)) return null;
        return button({
            text: 'Action',
            minimal: false,
            intent: 'primary',
            ...actionButtonProps
        });
    }
);

const dismissButton = hoistCmp.factory(
    ({model}) => {
        const {enableClose, category, onClose} = model;
        return button({
            omit: !enableClose,
            icon: Icon.close(),
            className: 'xh-banner__dismiss-button',
            onClick: () => {
                XH.hideBanner(category);
                if (isFunction(onClose)) onClose(model);
            }
        });
    }
);
