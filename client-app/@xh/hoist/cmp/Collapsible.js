/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {elemFactory} from 'hoist/react';
import {observer, observable, action} from 'hoist/mobx';
import {box, hbox, vbox} from 'hoist/layout';
import {button} from 'hoist/kit/blueprint';
import {isNil} from 'lodash';

@observer
export class Collapsible extends Component {

    @observable isOpen;
    isLazyState = true;

    static defaultProps = {
        side: 'left',
        defaultIsOpen: true
    };

    constructor(props) {
        super(props);
        const {defaultIsOpen} = this.props;
        if (!isNil(defaultIsOpen)) this.isOpen = defaultIsOpen;
    }

    render() {
        // Turn off lazy rendering once opened
        if (this.isOpen) this.isLazyState = false;

        const {side} = this.props,
            vertical = this.isVertical(),
            resizerFirst = side === 'right' || side === 'bottom',
            child = this.isLazyState ? null : this.renderChild(),
            items = resizerFirst ? [this.getResizer(), child] : [child, this.getResizer()],
            cmp = vertical ? vbox : hbox;

        return cmp({
            flex: 'none',
            items: items
        });
    }

    //------------------
    // Implementation
    //------------------
    renderChild() {
        const {props, isOpen} = this,
            {contentSize, children} = props,
            vertical = this.isVertical(),
            size = isOpen ? contentSize : 0;

        return vertical ?
            box({height: size, items: children}) :
            box({width: size, items: children});
    }

    getResizer() {
        const {props, isOpen} = this,
            {side} = props,
            vertical = this.isVertical(),
            chevronClose = vertical ? (side === 'top' ? 'up' : 'down') : (side === 'left' ? 'left' : 'right'),
            chevronOpen = vertical ? (side === 'top' ? 'down' : 'up') : (side === 'left' ? 'right' : 'left'),
            cmp = vertical ? hbox : vbox,
            cfg = {
                style: {background: '#959b9e'},
                justifyContent: 'center',
                alignItems: 'center',
                item: button({
                    icon:  `chevron-${isOpen ? chevronClose : chevronOpen}`,
                    style: {
                        margin: 0,
                        padding: 0,
                        width: vertical ? '70px' : '10px',
                        height: vertical ? '10px' : '70px'
                    },
                    onClick: this.onButtonClick
                })
            };

        cfg[vertical ? 'height' : 'width'] = 8;

        return cmp(cfg);
    }

    @action
    onButtonClick = () => {
        this.isOpen = !this.isOpen;
    }

    isVertical() {
        const side = this.props.side;
        return side === 'top' || side === 'bottom';
    }

}

export const collapsible = elemFactory(Collapsible);