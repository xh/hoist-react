/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {elemFactory} from 'hoist';
import {hoistButton, card, form, header, modal, modalActions, modalContent, textArea} from 'hoist/kit/semantic';
import {observer} from 'hoist/mobx';
import {stringifyErrorSafely} from 'hoist/exception';

@observer
export class ErrorDialogDetails extends Component {

    render() {
        const model = this.model,
            {detailsVisible, exception} = model;

        if (!detailsVisible || !exception) return null;

        return modal({
            open: true,
            items: [
                header({
                    icon: 'search',
                    content: 'Error Details'
                }),
                modalContent({
                    items: [
                        card({
                            fluid: true,
                            description: stringifyErrorSafely(exception)
                        }),
                        form(
                            textArea({
                                autoHeight: true,
                                rows: 3,
                                placeholder: 'Add message here...',
                                value: model.msg,
                                onChange: this.onMessageChange
                            })
                        )
                    ]
                }),
                modalActions({
                    style: {textAlign: 'right'},
                    items: [
                        hoistButton({
                            icon: 'envelope',
                            content: 'Send',
                            onClick: this.onSendClick
                        }),
                        hoistButton({
                            icon: 'clipboard',
                            content: 'Copy',
                            onClick: this.onCopyClick
                        }),
                        hoistButton({
                            icon: 'close',
                            content: 'Close',
                            onClick: this.onCloseClick
                        })
                    ]
                })
            ]
        });
    }

    //--------------------------------
    // Implementation
    //--------------------------------
    get model() {return this.props.model}

    onMessageChange = (evt, data) => {
        this.model.setMsg(data.value);
    }

    onSendClick = () => {
        this.model.sendReport();
    }

    onCopyClick = () => {}

    onCloseClick = () => {
        this.model.close();
    }
}
export const errorDialogDetails = elemFactory(ErrorDialogDetails);
