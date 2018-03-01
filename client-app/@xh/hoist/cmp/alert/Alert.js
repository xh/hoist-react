/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {filler} from 'hoist/layout';
import {button, alert as bpAlert} from 'hoist/kit/blueprint';

/**
 * A wrapper around Blueprint Alert to support imperative alert/confirm.
 */
@hoistComponent()
class Alert extends Component {

    render() {
        const model = this.model,
            isOpen = model && model.isOpen;

        if (!isOpen) return null;

        const config = {
            isOpen: true,
            title: model.title,
            confirmButtonText: model.confirmText,
            onConfirm: this.onConfirm,
            
            onCancel: this.onCancel,
            cls: this.darkTheme ? 'xh-dark' : '',
            item: model.message,
            ...this.props
        }


        return bpAlert();
    }

    onConfirm = () =>   {this.model.doConfirm()}
    onCancel = () =>    {this.model.doCancel()}
}
export const alert = elemFactory(Alert);