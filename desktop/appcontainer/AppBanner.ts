/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {BannerModel} from '@xh/hoist/appcontainer/BannerModel';
import {XH, uses, hoistCmp} from '@xh/hoist/core';
import {banner} from '@xh/hoist/desktop/cmp/banner';
import classNames from 'classnames';

import './AppBanner.scss';

/**
 * Internal component to display a single instance of an app-wide banner.
 * @see XH.showBanner()
 * @internal
 */
export const appBanner = hoistCmp.factory({
    displayName: 'AppBanner',
    model: uses(BannerModel),

    render({model}) {
        const {icon, message, intent, onClick, className, category, enableClose, onClose} = model;

        return banner({
            className: classNames('xh-app-banner', className),
            testId: `xh-banner-${category}`,
            icon: icon ?? null,
            message,
            intent,
            filled: true,
            actionButtonProps: model.actionButtonProps,
            onClick: onClick ? () => onClick(model) : null,
            onClose: enableClose
                ? () => {
                      XH.hideBanner(category);
                      onClose?.(model);
                  }
                : null
        });
    }
});
