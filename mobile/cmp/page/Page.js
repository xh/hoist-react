/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {fragment} from '@xh/hoist/cmp/layout';
import {page as onsenPage} from '@xh/hoist/kit/onsen';
import {loadMask} from '@xh/hoist/mobile/cmp/mask';
import {castArray} from 'lodash';

/**
 * Wrapper around Onsen's Page component.
 * If provided with a loadModel, provides built in support for a full-page mask that prevents scrolling.
 */
@HoistComponent()
export class Page extends Component {

    render() {
        const {loadModel, className, children, ...rest} = this.props,
            noscrollCls = loadModel && loadModel.isPending ? 'xh-page-no-scroll' : null;

        return fragment(
            onsenPage({
                className: ['xh-page', className, noscrollCls].filter(Boolean).join(' '),
                items: [
                    ...castArray(children),
                    loadModel ? loadMask({model: loadModel}) : null
                ],
                ...rest
            }),
        );
    }

}
export const page = elemFactory(Page);