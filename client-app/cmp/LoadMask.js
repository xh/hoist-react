/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {elemFactory} from 'hoist';
import {viewport, frame} from 'hoist/layout';
import {observer} from 'hoist/mobx';

import {overlay, spinner} from 'hoist/kit/blueprint';

/**
 * Simple LoadMask.
 *
 * This Mask currently will occupy the entire viewport.
 * Localized masking will be provided by a future option.
 *
 * The mask can be explicitly shown, or reactively bound to a PromiseModel.
 */
@observer
export class LoadMask extends Component {

    BACKGROUND = 'rgba(0,0,0, 0.25)';

    static defaultProps = {
        isDisplayed: false,
        model: null
    };
    
    render() {
        const {isDisplayed, model, inline} = this.props;
        return overlay({
            isOpen: isDisplayed || (model && model.isPending),
            canEscapeKeyClose: false,
            backdropProps: {
                style: {backgroundColor: this.BACKGROUND}
            },
            style: {display: 'flex'},
            inline: inline,
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


