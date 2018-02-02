/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {viewport} from 'hoist/layout';
import {observer} from 'hoist/mobx';

import {overlay, spinner} from 'hoist/kit/blueprint';
import {dimmer, loader} from 'hoist/kit/semantic';
import {hoistAppModel} from 'hoist/app/HoistAppModel';

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
        return hoistAppModel.useSemantic ? this.renderSemantic() : this.renderBlueprint();
    }

    renderBlueprint() {
        const {isDisplayed, model} = this.props;
        return overlay({
            isOpen: isDisplayed || model.isPending,
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

    renderSemantic() {
        const {isDisplayed, model} = this.props;
        return dimmer({
            active: isDisplayed || model.isPending,
            page: true,
            items: loader()
        });
    }
}
