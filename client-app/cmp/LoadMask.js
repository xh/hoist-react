/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {box} from 'hoist/layout';
import {circularProgress, modal} from 'hoist/mui';
import {overlay, spinner} from 'hoist/blueprint';
import {viewport} from 'hoist/layout';
import {observer} from 'hoist/mobx';


/**
 * Simple LoadMask.
 *
 * This Mask currently will occupy the entire viewport.
 * Localized masking will be provided by a future option.
 *
 * The mask can be explicitly shown, or reactively bound to a PromiseState.
 */
@observer
export class LoadMask extends Component {

    BACKGROUND = 'rgba(0,0,0, 0.25)';

    static defaultProps = {
        isDisplayed: false,
        promiseState: null
    };

    render() {
        return this.renderBlueprint();
    }

    renderBlueprint() {
        const {isDisplayed, promiseState} = this.props;
        return overlay({
            isOpen: isDisplayed || promiseState.isPending,
            canEscapeKeyClose: false,
            backdropProps: {
                style: {backgroundColor: this.BACKGROUND}
            },
            items: viewport({
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                items: spinner()
            })
        });
    }

    renderMui() {
        const {isDisplayed, promiseState} = this.props;
        return modal({
            open: isDisplayed || promiseState.isPending,
            disableEscapeKeyDown: true,
            BackdropProps: {
                style: {backgroundColor: this.BACKGROUND}
            },
            items: box({
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                items: circularProgress()
            })
        });
    }
}
