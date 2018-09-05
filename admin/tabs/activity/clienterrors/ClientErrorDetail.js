/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {dialog} from '@xh/hoist/kit/blueprint';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {filler, table, tbody, tr, th, td} from '@xh/hoist/cmp/layout';
import {clipboardButton} from '@xh/hoist/desktop/cmp/clipboard';
import {jsonField} from '@xh/hoist/desktop/cmp/form';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {button} from '@xh/hoist/desktop/cmp/button';
import {fmtDateTime} from '@xh/hoist/format';

@HoistComponent
export class ClientErrorDetail extends Component {

    render() {
        const {model} =  this,
            rec = model.detailRecord;

        if (!rec) return null;

        return dialog({
            title: 'Error Details',
            style: {width: 1000},
            isOpen: true,
            onClose: this.onCloseClick,
            items: this.renderDetail(rec)
        });
    }

    renderDetail(rec) {
        return [
            table({
                className: 'xh-admin-error-detail',
                items: [
                    tbody(
                        tr(th('User:'), td(rec.username)),
                        tr(th('Message:'), td(rec.msg)),
                        tr(th('User Alerted:'), td(rec.userAlerted.toString())),
                        tr(th('Device/Browser:'), td(`${rec.device}/${rec.browser}`)),
                        tr(th('Agent:'), td(rec.userAgent)),
                        tr(th('App Version:'), td(rec.appVersion)),
                        tr(th('Environment:'), td(rec.appEnvironment)),
                        tr(th('Date:'), td(fmtDateTime(rec.dateCreated)))
                    )
                ]
            }),
            jsonField({
                value: rec.error,
                disabled: true,
                height: 450,
                editorProps: {lineWrapping: true}
            }),
            toolbar(
                filler(),
                clipboardButton({
                    clipboardSpec: {text: this.getErrorStr},
                    successMessage: 'Error details copied to clipboard.'
                }),
                button({
                    text: 'Close',
                    intent: 'primary',
                    onClick: this.onCloseClick
                })
            )
        ];
    }

    onCloseClick = () => {
        this.model.closeDetail();
    }

    getErrorStr = () => {
        return this.model.detailRecord.error;
    }
}
export const clientErrorDetail = elemFactory(ClientErrorDetail);