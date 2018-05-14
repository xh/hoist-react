/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {PropTypes as PT} from 'prop-types';
import {Component} from 'react';
import {HoistComponent, elemFactory} from 'hoist/core';
import {vbox, box} from 'hoist/layout';
import {Classes, overlay, spinner} from 'hoist/kit/blueprint';

import './LoadMask.scss';

/**
 * Simple LoadMask.
 *
 * The mask can be explicitly shown, or reactively bound to a PromiseModel.
 */
@HoistComponent()
export class LoadMask extends Component {

    static propTypes = {
        isDisplayed: PT.bool,
        /** PromiseModel instance. If provided, loadMask will show while promise is pending */
        model: PT.object,
        /** Dictates if this mask should be contained within its parent, if set to false will fill the viewport */
        inline: PT.bool,
        /** A text to be displayed under the loading spinner image */
        text: PT.string
    };
    
    render() {
        let {isDisplayed, model, inline, text} = this.props,
            isInline = inline !== false;

        if (!(isDisplayed || (model && model.isPending))) return null;
        text = text ? box({cls: 'xh-mask-text', item: text}) : null;

        return overlay({
            cls: `xh-mask ${Classes.OVERLAY_SCROLL_CONTAINER}`,
            autoFocus: false,
            isOpen: true,
            canEscapeKeyClose: false,
            hasBackdrop: true,
            usePortal: !isInline,
            item: this.getLoadWrapper(text)
        });
    }

    //-----------------
    // Implementation
    //-----------------
    getLoadWrapper(text) {
        return vbox({
            cls: 'xh-mask-body',
            alignItems: 'center',
            justifyContent: 'center',
            item: [spinner(), text]
        });
    }
}
export const loadMask = elemFactory(LoadMask);


