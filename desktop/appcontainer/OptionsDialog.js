/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {dialog} from '@xh/hoist/kit/blueprint';
import {HoistComponent, elemFactory, elem} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {filler} from '@xh/hoist/cmp/layout';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {button} from '@xh/hoist/desktop/cmp/button';

/**
 * A dialog component to manage user preferences from directly within the application.
 *
 * @private
 */
@HoistComponent
export class OptionsDialog extends Component {

    render() {
        const {model} = this;
        if (!model.isOpen) return null;

        console.log(model.controls);

        return dialog({
            title: 'Options',
            icon: Icon.gear(),
            style: {width: 450},
            isOpen: true,
            onClose: this.onCloseClick,
            canOutsideClickClose: false,
            items: [
                ...model.controls.map(it => this.renderControl(it)),
                toolbar(
                    filler(),
                    button({
                        text: 'Cancel',
                        onClick: this.onCloseClick
                    }),
                    button({
                        text: 'Send',
                        intent: 'success',
                        onClick: this.onSendClick
                    })
                )
            ]
        });
    }

    renderControl(cfg) {
        const {control, prefName} = cfg;

        return elem(control, {
            model: this.model,
            field: prefName
        });
    }

    onSendClick = () => {

    }

    onCloseClick = () => {
        this.model.hide();
    }
}

export const optionsDialog = elemFactory(OptionsDialog);
