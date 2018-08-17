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
import {PendingTaskModel} from '@xh/hoist/promise';
import {Classes, overlay, spinner} from '@xh/hoist/kit/blueprint';
import {withDefault, withDefaultTrue} from '@xh/hoist/utils/JsUtils';


import './Mask.scss';

/**
 * Mask with spinner. The mask can be explicitly shown or reactively bound to a PendingTaskModel.
 */
@HoistComponent()
export class LoadMask extends Component {

    static propTypes = {
        /** True to display mask. */
        isDisplayed: PT.bool,
        /** Text to be displayed under the loading spinner image. */
        text: PT.string,
        /** Dictates if this mask should be contained within its parent, if set to false will fill the viewport. */
        inline: PT.bool,
        /** Model to govern behavior of mask.  Use as an alternative to setting props above. */
        model: PT.instanceOf(PendingTaskModel)
    };

    baseClassName = 'xh-mask';
    
    render() {
        const {props} = this,
            {model} = props,
            isDisplayed = withDefault(props.isDisplayed, model && model.isPending, false);

        if (!isDisplayed) return null;

        const text = withDefault(props.text, model && model.message),
            inline = withDefaultTrue(props.inline);
        return overlay({
            className: this.getClassName(Classes.OVERLAY_SCROLL_CONTAINER),
            autoFocus: false,
            isOpen: true,
            canEscapeKeyClose: false,
            usePortal: !inline,
            enforceFocus: !inline,
            item: vbox({
                className: 'xh-mask-body',
                items: [
                    spinner(),
                    vspacer(10),
                    text ? box({className: 'xh-mask-text', item: text}) : null
                ]
            })
        });
    }
}
export const loadMask = elemFactory(LoadMask);


