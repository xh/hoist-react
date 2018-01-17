/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2017 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {div} from 'hoist/layout';
import {overlay, spinner} from 'hoist/blueprint';

export class LoadMask extends Component {

    static defaultProps = {isShowing: false};

    render() {
        return overlay({
            isOpen: this.props.isShowing,
            inline: true,
            items: div({
                style: {
                    display: 'flex',
                    width: '100%',
                    height: '100%',
                    justifyContent: 'center',
                    alignItems: 'center'
                },
                items: spinner()
            })
        });
    }
}