/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {button, dialog} from 'hoist/kit/blueprint';
import {filler} from 'hoist/layout';
import {toolbar} from 'hoist/cmp';

import {Icon} from 'hoist/icon';

import './Differ.scss';

@hoistComponent()
export class ConfigDifferDetail extends Component {

    render() {
        const model = this.model;
        return dialog({
            title: 'Detail',
            isOpen: model.isOpen,
            onClose: this.onCloseClick,
            items: [
                model.renderDiffTable(),
                toolbar(
                    filler(),
                    button({
                        text: 'Close',
                        icon: Icon.close(),
                        intent: 'danger',
                        onClick: this.onCloseClick
                    }),
                    button({
                        text: 'Accept Remote',
                        icon: Icon.check(),
                        intent: 'success',
                        onClick: this.onAcceptRemoteClick
                    })
                )
            ]
        });
    }
    
    onAcceptRemoteClick = () => {
        const model = this.model,
            differModel = model.parent;

        differModel.confirmApplyRemote(model.record);
    }

    onCloseClick = () => {
        this.model.setIsOpen(false);
    }
}

export const configDifferDetail= elemFactory(ConfigDifferDetail);