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
import {Classes, overlay, spinner} from '@xh/hoist/kit/blueprint';

import './Mask.scss';

/**
 * Mask with spinner. The mask can be explicitly shown or reactively bound to a PromiseModel.
 */
@HoistComponent()
export class LoadMask extends Component {

    static propTypes = {
        isDisplayed: PT.bool,
        /** PromiseModel instance. If provided, loadMask will show while promise is pending */
        model: PT.object,
        /** Dictates if this mask should be contained within its parent, if set to false will fill the viewport */
        inline: PT.bool,
        /** Text to be displayed under the loading spinner image */
        text: PT.string
    };
    
    render() {
        let {isDisplayed, model, inline, text} = this.props,
            isInline = inline !== false;

        if (!(isDisplayed || (model && model.isPending))) return null;

        return overlay({
            cls: `xh-mask ${Classes.OVERLAY_SCROLL_CONTAINER}`,
            autoFocus: false,
            isOpen: true,
            canEscapeKeyClose: false,
            usePortal: !isInline,
            enforceFocus: !isInline,
            item: vbox({
                cls: 'xh-mask-body',
                items: [
                    spinner(),
                    vspacer(10),
                    text ? box({cls: 'xh-mask-text', item: text}) : null
                ]
            })
        });
    }

}
export const loadMask = elemFactory(LoadMask);


