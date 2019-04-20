/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {div, vbox, vspacer} from '@xh/hoist/cmp/layout';
import {PendingTaskModel} from '@xh/hoist/utils/async';
import {progressCircular} from '@xh/hoist/kit/onsen';
import {withDefault} from '@xh/hoist/utils/js';

import './Mask.scss';

/**
 * Mask with optional spinner and text.
 *
 * The mask can be explicitly shown or reactively bound to a PendingTaskModel.
 */
@HoistComponent
export class Mask extends Component {

    static modelClass = PendingTaskModel;

    static propTypes = {
        /** True to display the mask. */
        isDisplayed: PT.bool,

        /** Text to be displayed under the loading spinner image */
        message: PT.string,

        /** True (default) to display a spinning image. */
        spinner: PT.bool,

        /** Click handler **/
        onClick: PT.func
    };

    baseClassName = 'xh-mask';

    render() {
        const {props} = this,
            {model} = props,
            isDisplayed = withDefault(props.isDisplayed, model && model.isPending, false);

        if (!isDisplayed) return null;

        const message = withDefault(props.message, model && model.message),
            showSpinner = withDefault(props.spinner, false),
            onClick = props.onClick;

        return div({
            onClick,
            className: this.getClassName(),
            item: vbox({
                className: 'xh-mask-body',
                items: [
                    showSpinner ? progressCircular({indeterminate: true}) : null,
                    showSpinner ? vspacer(10) : null,
                    message ? div({className: 'xh-mask-text', item: message}) : null
                ]
            })
        });
    }
}
export const mask = elemFactory(Mask);