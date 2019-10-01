/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {hoistCmp} from '@xh/hoist/core';
import {page as onsenPage} from '@xh/hoist/kit/onsen';
import {panel, Panel} from '@xh/hoist/mobile/cmp/panel';
import {castArray} from 'lodash';

import './Page.scss';

/**
 * Wraps a Panel in an Onsen Page, suitable for inclusion in the navigator.
 */
export const [Page, page] = hoistCmp.withFactory({
    displayName: 'Page',
    className: 'xh-page',
    memo: false, model: false,

    render({children, className, ...props}) {

        return onsenPage({
            className,
            item: panel({
                items: castArray(children),
                ...props
            })
        });
    }
});
Page.propTypes = Panel.propTypes;