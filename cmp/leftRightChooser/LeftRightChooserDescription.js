/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';

@hoistComponent()
class LeftRightChooserDescription extends Component {
    render() {
        const model = this.model;

        if (!model._descriptionEnabled) return null;
    }
}

export const leftRightChooserDescription = elemFactory(LeftRightChooserDescription);