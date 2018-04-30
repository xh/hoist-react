/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {viewport, frame} from 'hoist/layout';
import {overlay, spinner} from 'hoist/kit/blueprint';

import './LoadMask.scss';

/**
 * Simple LoadMask.
 *
 * This Mask currently will occupy the entire viewport.
 * Localized masking will be provided by a future option.
 *
 * The mask can be explicitly shown, or reactively bound to a PromiseModel.
 */
@hoistComponent()
export class LoadMask extends Component {

    BACKGROUND = 'rgba(0,0,0, 0.25)';

    static defaultProps = {
        isDisplayed: false,
        model: null,
        inline: true
    };
    
    render() {
        let {isDisplayed, model, inline} = this.props;

        if (!(isDisplayed || (model && model.isPending))) return null;
        return overlay({
            cls: 'xh-mask',
            autoFocus: false,
            isOpen: true,
            canEscapeKeyClose: false,
            backdropProps: {
                style: {backgroundColor: this.BACKGROUND}
            },
            usePortal: !inline,
            item: inline ? this.getInlineChild() : this.getViewportChild()
        });
    }

    //-----------------
    // Implementation
    //-----------------
    getInlineChild() {
        return frame({
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            item: spinner()
        });
    }

    getViewportChild() {
        return viewport({
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            item: spinner()
        });
    }
}
export const loadMask = elemFactory(LoadMask);


