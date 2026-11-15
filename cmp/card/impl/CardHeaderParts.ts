/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {isEmpty} from 'lodash';
import type {ReactElement, ReactNode} from 'react';

import {div, legend, span} from '@xh/hoist/cmp/layout';

/**
 * The muted text after a card's title, or null if the card has none.
 * @internal
 */
export function cardSubtitle(subtitle: ReactNode): ReactElement {
    return subtitle == null ? null : span({className: 'xh-card__subtitle', item: subtitle});
}

/**
 * The legend of a card: its header, then any header items at the far end. A legend with header
 * items spans the card, so it draws the stretch of border between the two itself. Null for a card
 * with neither.
 * @internal
 */
export function cardLegend(header: ReactNode, headerItems: ReactNode[]): ReactElement {
    if (isEmpty(headerItems)) return header ? legend(header) : null;

    return legend({
        className: 'xh-card__legend',
        items: [
            header,
            div({className: 'xh-card__header-rule'}),
            div({className: 'xh-card__header-items', items: headerItems})
        ]
    });
}
