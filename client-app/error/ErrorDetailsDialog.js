/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {button, card, form, header, modal, modalActions, modalContent, textArea} from 'hoist/kit/semantic';
import Clipboard from 'clipboard';

import {errorTrackingService} from 'hoist';
import {stringifyErrorSafely} from 'hoist/error/Utils';
import {action, observable, observer, setter} from 'hoist/mobx';

@observer
export class ErrorDetailsDialog extends Component {

    @setter @observable msg = '';

    componentDidUpdate() {
        if (this.props.visManager.isVisible) {
            this.createCopier();
        }
    }

    render() {
        if (!this.props.visManager.isVisible) return null;

        this.errorString = stringifyErrorSafely(this.props.exception);


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
                            description: this.errorString
                        }),
                        form(textArea({
                            autoHeight: true,
                            rows: 3,
                            placeholder: 'Add message here...',
                            value: this.msg,
                            onChange: this.onTextAreaChange
                        }))
                    ]
                }),
                modalActions({
                    style: {textAlign: 'right'},
                    items: [
                        this.button({
                            icon: 'envelope',
                            content: 'Send',
                            onClick: this.onSendClick
                        }),
                        this.button({
                            cls: 'xh-exception-copy-btn',
                            icon: 'clipboard',
                            content: 'Copy'
                        }),
                        this.button({
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
    onTextAreaChange = (evt, data) => {
        this.setMsg(data.value);
    }

    onSendClick = () => {
        errorTrackingService.submitAsync({exception: this.props.exception, msg: this.msg})
            .then(() => this.onCloseClick());
    }

    @action
    onCloseClick = () => {
        this.setMsg('');
        this.clipboard.destroy();
        this.props.visManager.isVisible = false;
    }

    button(props) {return button({labelPosition: 'left', ...props})}

    createCopier() {
        this.clipboard = new Clipboard('.xh-exception-copy-btn', {
            text: () => this.errorString
        });
        this.clipboard.on('success', function(e) {
            // show toast
            e.clearSelection();
        });
    }


}