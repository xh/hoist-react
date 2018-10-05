/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {Component} from 'react';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {box, vbox, vspacer} from '@xh/hoist/cmp/layout';
import {PendingTaskModel} from '@xh/hoist/utils/async';
import {Classes, overlay, spinner} from '@xh/hoist/kit/blueprint';
import {withDefault, withDefaultFalse, withDefaultTrue} from '@xh/hoist/utils/js';


import './Mask.scss';

/**
 * Mask with optional spinner and text - can be explicitly shown or bound to a PendingTaskModel.
 *
 * Note that the Panel component's `mask` prop provides a common and convenient method for masking
 * sections of the UI without needing to manually create or manage this component.
 */
@HoistComponent
export class Mask extends Component {

    static propTypes = {
        /** True to display mask. */
        isDisplayed: PT.bool,
        /** Optional text to be displayed. */
        message: PT.string,
        /** True to display a spinning image.  Default false. */
        spinner: PT.bool,
        /** If true (default) mask should be contained within its parent, if set to false it will fill the viewport. */
        inline: PT.bool,
        /** Click handler **/
        onClick: PT.func,
        /** Model to govern behavior of mask.  Use as an alternative to setting isDisplayed and message props. */
        model: PT.instanceOf(PendingTaskModel)
    };

    baseClassName = 'xh-mask';
    
    render() {
        const {props} = this,
            {model} = props,
            isDisplayed = withDefault(props.isDisplayed, model && model.isPending, false);

        if (!isDisplayed) return null;

        const message = withDefault(props.message, model && model.message),
            inline = withDefaultTrue(props.inline),
            showSpinner = withDefaultFalse(props.spinner),
            onClick = props.onClick;

        return overlay({
            className: this.getClassName(Classes.OVERLAY_SCROLL_CONTAINER),
            autoFocus: false,
            isOpen: true,
            canEscapeKeyClose: false,
            usePortal: !inline,
            enforceFocus: !inline,
            item: vbox({
                className: 'xh-mask-body',
                onClick,
                items: [
                    showSpinner ? spinner() : null,
                    showSpinner ? vspacer(10) : null,
                    message ? box({className: 'xh-mask-text', item: message}) : null
                ]
            })
        });
    }
}
export const mask = elemFactory(Mask);


