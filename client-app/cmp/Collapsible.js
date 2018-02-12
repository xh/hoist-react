/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import './Collapsible.css';
import {elemFactory} from 'hoist';
import {Component} from 'react';
import {observer, observable, action} from 'hoist/mobx';
import {box, hbox, vbox} from 'hoist/layout';
import {button} from 'hoist/kit/semantic';


// TODO: Make this usable as controlled component.
@observer
export class Collapsible extends Component {

    @observable isOpen = true;
    isLazyMode = true

    render() {
        const {isOpen} = this;
        if (isOpen) this.isLazyMode = false;
        return hbox({
            flex: 'none',
            items: [
                this.isLazyMode ? null : this.renderChild(),
                vbox({
                    width: 10,
                    style: {background: '#959b9e'},
                    justifyContent: 'center',
                    alignItems: 'center',
                    item: button({
                        size: 'small',
                        cls: 'resizer',
                        compact: true,
                        icon: {name: `${isOpen ? 'left' : 'right'} chevron`, color: 'blue'},
                        style: {
                            margin: 0,
                            padding: 0,
                            width: '10px',
                            height: '70px'
                        },
                        onClick: this.onButtonClick
                    })
                })
            ]
        });
    }

    //------------------
    // Implementation
    //------------------
    renderChild() {
        const {props, isOpen} = this;
        return box({
            width: isOpen ? props.contentWidth : 0,
            items: props.children
        });
    }

    @action
    onButtonClick = () => {
        this.isOpen = !this.isOpen;
    }
}
export const collapsible = elemFactory(Collapsible);