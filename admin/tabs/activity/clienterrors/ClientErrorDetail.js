/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {dialog} from '@xh/hoist/kit/blueprint';
import {hoistCmp} from '@xh/hoist/core';
import {filler, table, tbody, tr, th, td} from '@xh/hoist/cmp/layout';
import {clipboardButton} from '@xh/hoist/desktop/cmp/clipboard';
import {jsonInput} from '@xh/hoist/desktop/cmp/input';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {button} from '@xh/hoist/desktop/cmp/button';
import {fmtDateTime} from '@xh/hoist/format';

export const clientErrorDetail = hoistCmp.factory(
    ({model}) => {
        const rec = model.detailRecord;

        if (!rec) return null;

        return dialog({
            title: 'Error Details',
            style: {width: 1000},
            isOpen: true,
            onClose: () => model.closeDetail(),
            items: detail()
        });
    }
);

const detail = hoistCmp.factory(
    ({model}) => {
        const rec = model.detailRecord;
        return [
            table({
                className: 'xh-admin-error-detail',
                items: [
                    tbody(
                        tr(th('User:'), td(rec.username)),
                        tr(th('Message:'), td(rec.msg || 'None provided')),
                        tr(th('User Alerted:'), td(`${rec.userAlerted}`)),
                        tr(th('Device/Browser:'), td(`${rec.device}/${rec.browser}`)),
                        tr(th('Agent:'), td(rec.userAgent)),
                        tr(th('App Version:'), td(rec.appVersion)),
                        tr(th('Environment:'), td(rec.appEnvironment)),
                        tr(th('Date:'), td(fmtDateTime(rec.dateCreated)))
                    )
                ]
            }),
            jsonInput({
                value: rec.error,
                disabled: true,
                height: 450,
                width: '100%',
                editorProps: {lineWrapping: true}
            }),
            toolbar(
                filler(),
                clipboardButton({
                    getCopyText: () => rec.error,
                    successMessage: 'Error details copied to clipboard.'
                }),
                button({
                    text: 'Close',
                    intent: 'primary',
                    onClick: () => model.closeDetail()
                })
            )
        ];
    }
);