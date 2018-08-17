/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {div, vbox, vspacer, box} from '@xh/hoist/cmp/layout';
import {PendingTaskModel} from '@xh/hoist/promise';
import {progressCircular} from '@xh/hoist/kit/onsen';
import {withDefault} from '@xh/hoist/utils/JsUtils';

import './Mask.scss';

/**
 * Mask with spinner. The mask can be explicitly shown or reactively bound to a PendingTaskModel.
 */
@HoistComponent()
export class LoadMask extends Component {

    static propTypes = {
        /** True to display the mask. */
        isDisplayed: PT.bool,
        /** Text to be displayed under the loading spinner image */
        text: PT.string,
        /** Model to govern behavior of mask.  Use as an alternative to setting props above. */
        model: PT.instanceOf(PendingTaskModel)
    };

    render() {
        const {props} = this,
            {model} = props,
            isDisplayed = withDefault(props.isDisplayed, model && model.isPending, false);

        if (!isDisplayed) return null;

        const text = withDefault(props.text, model && model.message);
        return div({
            className: 'xh-mask',
            item: vbox({
                className: 'xh-mask-body',
                items: [
                    progressCircular({indeterminate: true}),
                    vspacer(10),
                    text ? box({className: 'xh-mask-text', item: text}) : null
                ]
            })
        });
    }

}

export const loadMask = elemFactory(LoadMask);