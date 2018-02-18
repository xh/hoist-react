/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {elemFactory, environmentService} from 'hoist';
import {button, dialog, dialogBody, dialogFooter, dialogFooterActions, textArea} from 'hoist/kit/blueprint';
import {clipboardButton} from 'hoist/cmp';
import {pre, table, tbody, td, th, tr} from 'hoist/layout';
import {observer} from 'hoist/mobx';
import {stringifyErrorSafely} from 'hoist/exception';

@observer
export class ErrorDialogDetails extends Component {

    render() {
        const model = this.model,
            {detailsVisible, exception} = model,
            row = (label, data) => tr(th({item: `${label}:`, style: {textAlign: 'left'}}), td(data));

        if (!detailsVisible || !exception) return null;

        this.errorStr = stringifyErrorSafely(exception);
        const header = table(
            tbody(
                row('Name', exception.name),
                row('Message', exception.msg || exception.message),
                row('App Version', environmentService.get('appVersion'))
            )
        );

        return dialog({
            title: 'Error Details',
            icon: 'search',
            isOpen: true,
            onClose: this.onCloseClick,
            style: {height: 600},
            items: [
                dialogBody({
                    items: [
                        header,
                        pre({
                            style: {
                                border: '1px solid',
                                overflow: 'scroll',
                                height: 230,
                                fontSize: '.75em'
                            },
                            item: this.errorStr
                        }),
                        textArea({
                            style: {
                                height: 125, width: '100%'
                            },
                            placeholder: 'Add message here...',
                            value: model.msg,
                            onChange: this.onMessageChange
                        })]
                }),
                dialogFooter(
                    dialogFooterActions({
                        itemSpec: button,
                        items: [{
                            icon: 'envelope',
                            text: 'Send',
                            onClick: this.onSendClick
                        }, clipboardButton({
                            text: this.errorStr
                        }), {
                            icon: 'cross',
                            text: 'Close',
                            onClick: this.onCloseClick
                        }]
                    })
                )
            ]
        });
    }

    //--------------------------------
    // Implementation
    //--------------------------------
    get model() {return this.props.model}

    onMessageChange = (evt) => {
        this.model.setMsg(evt.target.value);
    }

    onSendClick = () => {
        this.model.sendReport();
    }

    onCloseClick = () => {
        this.model.close();
    }
}
export const errorDialogDetails = elemFactory(ErrorDialogDetails);
