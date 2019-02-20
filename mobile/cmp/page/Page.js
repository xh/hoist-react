/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {page as onsenPage} from '@xh/hoist/kit/onsen';
import {panel, Panel} from '@xh/hoist/mobile/cmp/panel';
import {mask} from '@xh/hoist/mobile/cmp/mask';
import {PendingTaskModel} from '@xh/hoist/utils/async';
import {isReactElement} from '@xh/hoist/utils/react';
import {castArray} from 'lodash';

import './Page.scss';

/**
 * Wraps a Panel in an Onsen Page, suitable for inclusion in the navigator.
 */
@HoistComponent
export class Page extends Component {

    static propTypes = {
        ...Panel.propTypes,

        /** Custom classes that will be applied to this page */
        className: PT.string,

        /**
         * Mask to render on this page. Set to:
         *   + a ReactElement specifying a Mask instance - or -
         *   + a PendingTaskModel for a default loading mask w/spinner bound to that model - or -
         *   + true for a simple default mask.
         */
        mask: PT.oneOfType([PT.element, PT.instanceOf(PendingTaskModel), PT.bool])
    };

    baseClassName = 'xh-page';

    render() {
        const {
            className,
            mask: maskProp,
            children,
            ...rest
        } = this.props;

        // The page itself takes the mask and className.
        // All other props are passed to the Panel.
        let maskElem = null;
        if (maskProp === true) {
            maskElem = mask({isDisplayed: true});
        } else if (maskProp instanceof PendingTaskModel) {
            maskElem = mask({model: maskProp, spinner: true});
        } else if (isReactElement(maskProp)) {
            maskElem = maskProp;
        }

        return onsenPage({
            items: [
                panel({
                    items: castArray(children),
                    ...rest
                }),
                maskElem
            ],
            ...rest,
            className: this.getClassName(className)
        });
    }
}

export const page = elemFactory(Page);