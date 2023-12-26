import {div} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps} from '@xh/hoist/core';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import './WarningBanner.scss';

export interface WarningBannerProps extends HoistProps {
    compact?: boolean;
    message: string;
}

export const warningBanner = hoistCmp.factory<WarningBannerProps>({
    className: 'xh-admin-warning-banner',
    displayName: 'WarningBanner',
    model: false,
    render({className, compact, message}) {
        return toolbar({
            className,
            compact,
            items: [
                Icon.warning({
                    className: `${className}__icon`
                }),
                div({
                    className: `${className}__message`,
                    item: message,
                    title: message
                })
            ]
        });
    }
});
