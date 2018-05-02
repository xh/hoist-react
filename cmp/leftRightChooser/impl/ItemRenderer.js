/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {PropTypes as PT} from 'prop-types';
import {Component} from 'react';
import {div} from 'hoist/layout';
import {Icon} from 'hoist/icon';

/**
 * Render items in the LeftRightChooser.
 *
 * This is an implementation class private to Hoist
 * @private
 */
export class ItemRenderer extends Component {

    static propTypes = {
        /** cell value */
        value: PT.string,
        /** grid record */
        data: PT.object
    };

    render() {
        const {value, data} = this.props,
            lockedText = Icon.lock({cls: 'medium-gray', prefix: 'fal'});

        return div({
            cls: 'xh-lr-chooser__item-row',
            items: [
                value,
                data.locked ? lockedText : null
            ]
        });
    }

    refresh() {
        return false;
    }
}