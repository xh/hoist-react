import type {CardModel} from '@xh/hoist/cmp/card/CardModel';
import {div, legend} from '@xh/hoist/cmp/layout';
import {tooltip as tooltipCmp} from '@xh/hoist/cmp/tooltip';
import {hoistCmp} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import type {ReactNode} from 'react';

/**
 * Desktop implementation of CardHeader.
 * @internal
 */
export const cardHeaderImpl = hoistCmp.factory<CardModel>({
    render({icon, intent, title, tooltip, model}, ref) {
        let header: ReactNode = null;

        if (model.collapsible) {
            header = button({
                className: `xh-card__collapsible-header xh-card__collapsible-header--intent-${intent ?? 'none'}`,
                icon,
                intent,
                text: title,
                onClick: () => model.setCollapsed(!model.collapsed),
                rightIcon: model.collapsed ? Icon.angleDown() : Icon.angleUp(),
                ref
            });
        } else if (icon || title) {
            header = div({
                className: `xh-card__header xh-card__header--intent-${intent ?? 'none'}`,
                children: [icon, title]
            });
        }

        return (
            header &&
            legend(
                tooltip
                    ? tooltipCmp({
                          children: header,
                          content: tooltip,
                          intent
                      })
                    : header
            )
        );
    }
});
