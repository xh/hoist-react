import {isEmpty} from 'lodash';
import {div, hbox} from '@xh/hoist/cmp/layout';
import './TagsRenderer.scss';

export function tagsRenderer(v) {
    if (isEmpty(v)) return null;

    return hbox({
        className: 'xh-tags-renderer',
        items: v.map(tag => div({className: 'xh-tags-renderer__tag', item: tag}))
    });
}