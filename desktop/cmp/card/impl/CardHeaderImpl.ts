import type {CardModel} from '@xh/hoist/cmp/card/CardModel';
import {cardLegend, cardSubtitle} from '@xh/hoist/cmp/card/impl/CardHeaderParts';
import {div, fragment} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {tooltip as bpTooltip} from '@xh/hoist/kit/blueprint';
import type {ReactNode} from 'react';

/**
 * Desktop implementation of CardHeader.
 * @internal
 */
export const cardHeaderImpl = hoistCmp.factory<CardModel>({
    render({icon, intent, title, subtitle, headerItems, tooltip, model}, ref) {
        const subtitleEl = cardSubtitle(subtitle);
        let item: ReactNode = null;

        if (model.collapsible) {
            item = button({
                className: `xh-card__collapsible-header xh-card__collapsible-header--intent-${intent ?? 'none'}`,
                icon,
                intent,
                text: subtitleEl ? fragment(title, subtitleEl) : title,
                onClick: () => model.setCollapsed(!model.collapsed),
                rightIcon: model.collapsed ? Icon.angleDown() : Icon.angleUp(),
                ref
            });
        } else if (icon || title || subtitleEl) {
            item = div({
                className: `xh-card__header xh-card__header--intent-${intent ?? 'none'}`,
                items: [icon, title, subtitleEl]
            });
        }

        if (item && tooltip) item = bpTooltip({item, content: tooltip, intent});

        return cardLegend(item, headerItems);
    }
});
