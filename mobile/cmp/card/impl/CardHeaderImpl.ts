import type {CardModel} from '@xh/hoist/cmp/card/CardModel';
import {cardLegend, cardSubtitle} from '@xh/hoist/cmp/card/impl/CardHeaderParts';
import {div, fragment} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/mobile/cmp/button';
import {warnIf} from '@xh/hoist/utils/js';
import type {ReactNode} from 'react';

/**
 * Mobile implementation of CardHeader.
 * @internal
 */
export const cardHeaderImpl = hoistCmp.factory<CardModel>({
    render({icon, intent, title, subtitle, headerItems, tooltip, model}, ref) {
        warnIf(!!tooltip, 'Card tooltips are not supported on mobile - will be ignored.');

        const subtitleEl = cardSubtitle(subtitle);
        let item: ReactNode = null;

        if (model.collapsible) {
            item = button({
                className: `xh-card__collapsible-header xh-card__collapsible-header--intent-${intent ?? 'none'}`,
                intent,
                text: fragment(
                    title,
                    subtitleEl,
                    model.collapsed ? Icon.angleDown() : Icon.angleUp()
                ),
                minimal: true,
                onClick: () => model.setCollapsed(!model.collapsed),
                ref
            });
        } else if (icon || title || subtitleEl) {
            item = div({
                className: `xh-card__header xh-card__header--intent-${intent ?? 'none'}`,
                items: [icon, title, subtitleEl]
            });
        }

        return cardLegend(item, headerItems);
    }
});
