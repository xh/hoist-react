/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {div, box} from '@xh/hoist/layout';

import './Mask.scss';

/**
 * Mask for disabled or inactive components.
 */
@HoistComponent()
export class Mask extends Component {

    static propTypes = {
        isDisplayed: PT.bool,
        text: PT.string
    };

    render() {
        const {isDisplayed, text, onClick} = this.props;
        if (!isDisplayed) return null;

        return div({
            cls: 'xh-mask',
            onClick: onClick ? () => onClick() : null,
            item: box({
                cls: 'xh-mask-body',
                item: text ? box({cls: 'xh-mask-text', item: text}) : null
            })
        });
    }
}

export const mask = elemFactory(Mask);