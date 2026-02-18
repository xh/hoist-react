/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {isEmpty} from 'lodash';
import {div, hbox} from '@xh/hoist/cmp/layout';
import './TagsRenderer.scss';
import {ReactNode} from 'react';

export function tagsRenderer(v): ReactNode {
    if (isEmpty(v)) return null;

    return hbox({
        className: 'xh-tags-renderer',
        items: v.map(tag => div({className: 'xh-tags-renderer__tag', item: tag}))
    });
}
