/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/kit/blueprint';

import {hbox, vbox} from '../../index';

import './Collapser.scss';

/** This is an implementation class private to Hoist
 * @private
 */
@HoistComponent()
export class Collapser extends Component {

    static propTypes = {
        /** Position of collapse border in relation to resizable component */
        side: PT.oneOf(['top', 'right', 'bottom', 'left']).isRequired,
        isOpen: PT.bool,
        onClick: PT.func
    };

    get side()                  {return this.props.side}
    get isOpen()                {return this.props.isOpen}
    get isVertical()            {return this.side === 'top' || this.side === 'bottom'}
    get isContentFirst()        {return this.side === 'right' || this.side === 'bottom'}

    render() {
        const {isVertical} = this;

        const cmp = isVertical ? hbox : vbox,
            cfg = {
                cls: `xh-resizable-collapser ${isVertical ? 'vertical' : 'horizontal'}`,
                item: button({
                    cls: 'xh-resizable-collapser-btn',
                    icon: Icon[this.getChevron()](),
                    onClick: this.props.onClick
                })
            };

        return cmp(cfg);
    }

    getChevron() {
        const {isVertical, isContentFirst, isOpen} = this,
            directions = [['chevronUp', 'chevronDown'], ['chevronLeft', 'chevronRight']],
            type = isVertical ? 0 : 1,
            idx = isContentFirst ? 0 : 1;

        return isOpen ? directions[type][idx] : directions[type][1 - idx];
    }
}
export const collapser = elemFactory(Collapser);