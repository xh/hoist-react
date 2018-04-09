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
import {jsonField, toolbar} from 'hoist/cmp';
import {Icon} from 'hoist/icon';

@hoistComponent()
class ClientErrorDetail extends Component {

    render() {
        const model =  this.model,
            rec = model.detailRecord;

        if (!rec) return null;

        return dialog({
            title: 'Error Details',
            style: {width: 450},
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
                        tr(th('App Version:'), td(rec.appVersion)),
                        tr(th('Environment:'), td(rec.appEnvironment))
                    )
                ]
            }),
            jsonField({
                value: rec.error,
                disabled: true,
                lineWrapping: true,
                height: 300
            }),
            toolbar({
                cls: 'xh-toolbar',
                items: [
                    filler(),
                    button({
                        icon: Icon.close(),
                        text: 'Close',
                        intent: 'danger',
                        onClick: this.onCloseClick
                    })
                ]
            })
        ];
    }

    onCloseClick = () => {
        this.model.setDetailRecord(null);
    }
}
export const clientErrorDetail = elemFactory(ClientErrorDetail);