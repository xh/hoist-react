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
import {Icon} from 'hoist/icon';

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
                // might want to use omit here in the case of null values.
                // Test in Activity detail. Right now we have records returning the string 'null' making this a little tricky at the moment.
                items: [
                    tbody(
                        tr({
                            omit: !rec.username,
                            items: [th('User:'), td(rec.username)]
                        }),
                        tr({
                            omit: !rec.msg,
                            items: [th('Message:'), td(rec.msg)]
                        }),
                        tr({
                            omit: !rec.device && !rec.browser,
                            items: [th('Device/Browser:'), td(`${rec.device}/${rec.browser}`)]
                        }),
                        tr({
                            omit: !rec.userAgent,
                            items: [th('Agent:'), td(rec.userAgent)]
                        }),
                        tr({
                            omit: !rec.appVersion,
                            items: [th('App Version:'), td(rec.appVersion)]
                        }),
                        tr({
                            omit: !rec.appEnvironment,
                            items: [th('Environment:'), td(rec.appEnvironment)]
                        }),
                        tr({
                            omit: !rec.dateCreated,
                            items: [th('Date:'), td(fmtDateTime(rec.dateCreated))]
                        })
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
                    icon: Icon.clipboard(),
                    text: 'Copy',
                    clipboardSpec: {text: this.errorStr},
                    successMessage: 'Error details copied to clipboard.'
                }),
                button({
                    icon: Icon.close(),
                    text: 'Close',
                    intent: 'primary',
                    onClick: this.onCloseClick
                })
            )
        ];
    }

    onCloseClick = () => {
        this.model.setDetailRecord(null);
    }

    errorStr = () => {
        return this.model.detailRecord.error;
    }
}
export const clientErrorDetail = elemFactory(ClientErrorDetail);