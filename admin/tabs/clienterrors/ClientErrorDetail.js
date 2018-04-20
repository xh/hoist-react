/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {dialog, button} from 'hoist/kit/blueprint';
import {hoistComponent, elemFactory} from 'hoist/core';
import {filler, table, tbody, tr, th, td} from 'hoist/layout';
import {clipboardButton, jsonField, toolbar} from 'hoist/cmp';
import {fmtDateTime} from 'hoist/format';

@hoistComponent()
class ClientErrorDetail extends Component {

    render() {
        const model =  this.model,
            rec = model.detailRecord;

        if (!rec) return null;

        return dialog({
            title: 'Error Details',
            style: {width: 1000},
            isOpen: model.detailRecord,
            onClose: this.onCloseClick,
            items: this.renderDetail(rec)
        });
    }

    renderDetail(rec) {
        return [
            table({
                cls: 'xh-admin-error-detail',
                items: [
                    tbody(
                        tr(th('User:'), td(rec.username)),
                        tr(th('Message:'), td(rec.msg)),
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
                lineWrapping: true,
                height: 450
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