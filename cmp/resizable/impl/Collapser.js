/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {elemFactory, hoistComponent} from 'hoist/core';
import {button} from 'hoist/kit/blueprint';
import {hbox, vbox} from 'hoist/layout';

import './Collapser.scss';

@hoistComponent()
export class Collapser extends Component {

    static propTypes = {
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
                    icon: this.getChevron(),
                    onClick: this.props.onClick
                })
            };

        return cmp(cfg);
    }

    getChevron() {
        const {isVertical, isContentFirst, isOpen} = this,
            directions = [['chevron-up', 'chevron-down'], ['chevron-left', 'chevron-right']],
            type = isVertical ? 0 : 1,
            idx = isContentFirst ? 0 : 1;

        return isOpen ? directions[type][idx] : directions[type][1 - idx];
    }
}
export const collapser = elemFactory(Collapser);