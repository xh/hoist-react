/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {callout} from 'hoist/kit/blueprint';

@hoistComponent()
class LeftRightChooserDescription extends Component {
    render() {
        const model = this.model,
            {descriptionEnabled, descriptionTitle, leftModel, rightModel} = model,
            selected = leftModel.selection.singleRecord || rightModel.selection.singleRecord;


        if (!descriptionEnabled || !(selected && selected.description)) return null;

        return callout({
            title: descriptionTitle,
            intent: 'primary',
            icon: null,
            item: selected.description

        });
    }
}

export const leftRightChooserDescription = elemFactory(LeftRightChooserDescription);