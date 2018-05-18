/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {HoistComponent, elemFactory} from 'hoist/core';
import {box} from 'hoist/cmp/layout';
import {Classes, overlay} from 'hoist/kit/blueprint';

import './Mask.scss';

/**
 * Mask for disabled or inactive components.
 * Note: Mask is built into Panel via its masked prop.
 */
@HoistComponent()
export class Mask extends Component {

    static propTypes = {
        isDisplayed: PT.bool,
        text: PT.string
    };

    render() {
        let {isDisplayed, text} = this.props;
        if (!isDisplayed) return null;

        return overlay({
            cls: `xh-mask ${Classes.OVERLAY_SCROLL_CONTAINER}`,
            autoFocus: false,
            isOpen: true,
            canEscapeKeyClose: false,
            usePortal: false,
            item: box({
                cls: 'xh-mask-body',
                item: text ? box({cls: 'xh-mask-text', item: text}) : null
            })
        });
    }
}
export const mask = elemFactory(Mask);