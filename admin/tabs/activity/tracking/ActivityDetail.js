/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {filler, table, tbody, td, th, tr} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {jsonInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {fmtDateTime} from '@xh/hoist/format';
import {dialog} from '@xh/hoist/kit/blueprint';

export const activityDetail = hoistCmp.factory(
    ({model}) => {
        const rec = model.detailRecord;

        if (!rec) return null;

        return dialog({
            title: 'Activity Details',
            style: {width: 600},
            isOpen: model.detailRecord,
            onClose: () => model.closeDetail(),
            item: detail()
        });
    }
);


const detail = hoistCmp.factory(
    ({model}) => {
        const {data} = model.detailRecord,
            {impersonating, username} = data,
            user = impersonating ? `${username} as ${impersonating}` : username;

        return panel({
            items: [
                table({
                    className: 'xh-admin-activity-detail',
                    items: [
                        tbody(
                            tr(th('User:'), td(user)),
                            tr(th('Message:'), td(data.msg)),
                            tr(th('Category:'), td(data.category)),
                            tr(th('Device/Browser:'), td(`${data.device}/${data.browser}`)),
                            tr(th('Agent:'), td(data.userAgent)),
                            tr(th('Elapsed (ms):'), td(`${data.elapsed || ''}`)),
                            tr(th('Date:'), td(fmtDateTime(data.dateCreated)))
                        )
                    ]
                }),
                jsonInput({
                    omit: !data.data,
                    value: data.data,
                    disabled: true,
                    height: 100,
                    width: '100%',
                    editorProps: {lineWrapping: true}
                })
            ],
            bbar: toolbar(
                filler(),
                button({
                    text: 'Close',
                    intent: 'primary',
                    onClick: () => model.closeDetail()
                })
            )
        });
    }
);
