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
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {fmtDateTime} from '@xh/hoist/format';
import {dialog} from '@xh/hoist/desktop/cmp/dialog';

export const clientErrorDetail = hoistCmp.factory(
    ({model}) => dialog({
        title: 'Error Details'
    })
);

export const detail = hoistCmp.factory(
    ({model}) => {
        const {data} = model.detailRecord;
        return panel({
            items: [
                table({
                    className: 'xh-admin-error-detail',
                    items: [
                        tbody(
                            tr(th('User:'), td(data.username)),
                            tr(th('Message:'), td(data.msg || 'None provided')),
                            tr(th('User Alerted:'), td(`${data.userAlerted}`)),
                            tr(th('Device/Browser:'), td(`${data.device}/${data.browser}`)),
                            tr(th('Agent:'), td(data.userAgent)),
                            tr(th('App Version:'), td(data.appVersion)),
                            tr(th('Environment:'), td(data.appEnvironment)),
                            tr(th('Date:'), td(fmtDateTime(data.dateCreated)))
                        )
                    ]
                }),
                jsonInput({
                    value: data.error,
                    disabled: true,
                    height: '100%',
                    width: '100%',
                    editorProps: {lineWrapping: true}
                })
            ],
            bbar: toolbar(
                filler(),
                clipboardButton({
                    getCopyText: () => data.error,
                    successMessage: 'Error details copied to clipboard.'
                }),
                button({
                    text: 'Close',
                    intent: 'primary',
                    onClick: () => model.closeDetail()
                })
            )
        });
    }
);
