/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core/index';
import {callout} from 'hoist/kit/blueprint/index';

/**
 * Description for the LeftRightChooser.
 */
@hoistComponent()
class Description extends Component {

    render() {
        const model = this.model,
            {hasDescription, descriptionTitle, leftModel, rightModel} = model,
            selected = leftModel.selection.singleRecord || rightModel.selection.singleRecord;


        if (!hasDescription || !(selected && selected.description)) return null;

        return callout({
            title: descriptionTitle,
            intent: 'primary',
            icon: null,
            item: selected.description
        });
    }
}
export const description = elemFactory(Description);