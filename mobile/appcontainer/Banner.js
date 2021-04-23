/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {BannerModel} from '@xh/hoist/appcontainer/BannerModel';
import {XH, uses, hoistCmp} from '@xh/hoist/core';
import {div} from '@xh/hoist/cmp/layout';
import {button} from '@xh/hoist/mobile/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {isEmpty, isFunction} from 'lodash';
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

        return div({
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

        return button({...actionButtonProps});
    }
);

const dismissButton = hoistCmp.factory(
    ({model}) => {
        const {enableClose, category, onClose} = model;
        if (!enableClose) return null;

        return button({
            icon: Icon.close(),
            modifier: 'quiet',
            className: 'xh-banner__dismiss-button',
            onClick: () => {
                XH.hideBanner(category);
                if (isFunction(onClose)) onClose(model);
            }
        });
    }
);
