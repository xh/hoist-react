/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {castArray, isEmpty} from 'lodash';
import type {ReactElement, ReactNode} from 'react';

import {div, legend, span} from '@xh/hoist/cmp/layout';
import {isBlankNode} from '@xh/hoist/utils/react';

/**
 * The muted text after a card's title, or null if the card has none.
 * @internal
 */
export function cardSubtitle(subtitle: ReactNode): ReactElement {
    return isBlankNode(subtitle) ? null : span({className: 'xh-card__subtitle', item: subtitle});
}

/**
 * The header items of a card that have content to show.
 * @internal
 */
export function cardHeaderItems(headerItems: ReactNode[]): ReactNode[] {
    return isBlankNode(headerItems) ? [] : castArray(headerItems).filter(it => !isBlankNode(it));
}

/**
 * The legend of a card: its header, then any header items at the far end. A legend with header
 * items spans the card, so it draws the stretch of border between the two itself. Null for a card
 * with neither.
 *
 * A fieldset takes its accessible name from all of its legend. With header items, the header is
 * wrapped in an element with `headerId`, so that the card can name itself by its header alone.
 * @internal
 */
export function cardLegend(
    header: ReactNode,
    headerItems: ReactNode[],
    headerId: string
): ReactElement {
    if (isEmpty(headerItems)) return header ? legend(header) : null;

    return legend({
        className: 'xh-card__legend',
        items: [
            header ? div({id: headerId, className: 'xh-card__legend-header', item: header}) : null,
            div({className: 'xh-card__header-rule'}),
            div({className: 'xh-card__header-items', items: headerItems})
        ]
    });
}
