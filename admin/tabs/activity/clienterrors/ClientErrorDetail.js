/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {div, filler, h3, hframe, table, tbody, td, th, tr} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import {clipboardButton} from '@xh/hoist/desktop/cmp/clipboard';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {fmtDateTime} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';

export const clientErrorDetail = hoistCmp.factory(
    ({model}) => {
        const {selectedRecord, formattedErrorJson} = model;
        if (!selectedRecord) return null;

        const {data} = selectedRecord;
        return panel({
            className: 'xh-admin-client-errors__detail',
            model: {
                side: 'bottom',
                defaultSize: 300
            },
            item: hframe(
                table(
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
                ),
                panel({
                    flex: 1,
                    className: 'xh-border-left',
                    items: [
                        h3(Icon.json(), 'Additional Data'),
                        div({
                            className: `xh-admin-activity-detail__json ${formattedErrorJson ? '' : 'xh-admin-activity-detail__json--empty'}`,
                            item: formattedErrorJson ?? 'No additional details available.'
                        })
                    ],
                    bbar: [
                        filler(),
                        clipboardButton({
                            getCopyText: () => formattedErrorJson,
                            successMessage: 'Error data copied to clipboard.',
                            disabled: !formattedErrorJson,
                            outlined: true
                        })
                    ]
                })
            )
        });
    }
);
