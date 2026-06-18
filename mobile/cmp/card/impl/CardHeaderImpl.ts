import {CardModel} from '@xh/hoist/cmp/card/CardModel';
import {div, fragment, legend} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/mobile/cmp/button';
import {warnIf} from '@xh/hoist/utils/js';
import {ReactNode} from 'react';

/**
 * Mobile implementation of CardHeader.
 * @internal
 */
export const cardHeaderImpl = hoistCmp.factory<CardModel>({
    render({icon, intent, title, tooltip, model}, ref) {
        warnIf(!!tooltip, 'Card tooltips are not supported on mobile - will be ignored.');

        let item: ReactNode = null;

        if (model.collapsible) {
            item = button({
                className: `xh-card__collapsible-header xh-card__collapsible-header--intent-${intent ?? 'none'}`,
                intent,
                text: fragment(title, model.collapsed ? Icon.angleDown() : Icon.angleUp()),
                minimal: true,
                onClick: () => model.setCollapsed(!model.collapsed),
                ref
            });
        } else if (icon || title) {
            item = div({
                className: `xh-card__header xh-card__header--intent-${intent ?? 'none'}`,
                items: [icon, title]
            });
        }

        return item && legend(item);
    }
});
