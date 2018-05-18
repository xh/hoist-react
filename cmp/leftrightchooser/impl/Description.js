/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, HoistComponent} from 'hoist/core';
import {callout} from 'hoist/kit/blueprint';

/**
 * Description panel for the LeftRightChooser.
 * @private
 */
@HoistComponent()
class Description extends Component {

    render() {
        const model = this.model,
            {hasDescription, leftModel, rightModel} = model,
            selected = leftModel.selection.singleRecord || rightModel.selection.singleRecord;

        if (!hasDescription || !(selected && selected.description)) return null;

        return callout({
            title: selected.text,
            cls: 'xh-lr-chooser__description',
            intent: 'primary',
            icon: null,
            item: selected.description
        });
    }
}
export const description = elemFactory(Description);