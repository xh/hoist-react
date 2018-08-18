/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {fragment} from '@xh/hoist/cmp/layout';
import {page as onsenPage} from '@xh/hoist/kit/onsen';
import {mask} from '@xh/hoist/mobile/cmp/mask';
import {PendingTaskModel} from '@xh/hoist/utils/async';
import {castArray} from 'lodash';


/**
 * Wrapper around Onsen's Page component.
 */
@HoistComponent()
export class Page extends Component {

    static propTypes = {

        // TODO:  This should should probably be the mask itself, mirroring the Panel API.

        /** If provided, will be bound to a mask that can be used to prevent scrolling.  */
        loadModel: PT.instanceOf(PendingTaskModel)
    };


    render() {
        const {loadModel, className, children, ...rest} = this.props,
            noscrollCls = loadModel && loadModel.isPending ? 'xh-page-no-scroll' : null;

        return fragment(
            onsenPage({
                className: ['xh-page', className, noscrollCls].filter(Boolean).join(' '),
                items: [
                    ...castArray(children),
                    loadModel ? mask({model: loadModel, spinner: true}) : null
                ],
                ...rest
            })
        );
    }
}
export const page = elemFactory(Page);