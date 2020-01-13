/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {filler, table, tbody, td, th, tr} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {clipboardButton} from '@xh/hoist/desktop/cmp/clipboard';
import {jsonInput} from '@xh/hoist/desktop/cmp/input';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {fmtDateTime} from '@xh/hoist/format';
import {dialog} from '@xh/hoist/kit/blueprint';

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
                        tr(th('User:'), td(rec.get('username'))),
                        tr(th('Message:'), td(rec.get('msg') || 'None provided')),
                        tr(th('User Alerted:'), td(`${rec.get('userAlerted')}`)),
                        tr(th('Device/Browser:'), td(`${rec.get('device')}/${rec.get('browser')}`)),
                        tr(th('Agent:'), td(rec.get('userAgent'))),
                        tr(th('App Version:'), td(rec.get('appVersion'))),
                        tr(th('Environment:'), td(rec.get('appEnvironment'))),
                        tr(th('Date:'), td(fmtDateTime(rec.get('dateCreated'))))
                    )
                ]
            }),
            jsonInput({
                value: rec.get('error'),
                disabled: true,
                height: 450,
                width: '100%',
                editorProps: {lineWrapping: true}
            }),
            toolbar(
                filler(),
                clipboardButton({
                    getCopyText: () => rec.get('error'),
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
