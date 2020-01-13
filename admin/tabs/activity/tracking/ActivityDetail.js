/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {filler, fragment, table, tbody, td, th, tr} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {jsonInput} from '@xh/hoist/desktop/cmp/input';
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
        const rec = model.detailRecord,
            {impersonating, username} = rec.data,
            user = impersonating ? `${username} as ${impersonating}` : username;

        return fragment(
            table({
                className: 'xh-admin-activity-detail',
                items: [
                    tbody(
                        tr(th('User:'), td(user)),
                        tr(th('Message:'), td(rec.get('msg'))),
                        tr(th('Category:'), td(rec.get('category'))),
                        tr(th('Device/Browser:'), td(`${rec.get('device')}/${rec.get('browser')}`)),
                        tr(th('Agent:'), td(rec.get('userAgent'))),
                        tr(th('Elapsed (ms):'), td(`${rec.get('elapsed') || ''}`)),
                        tr(th('Date:'), td(fmtDateTime(rec.get('dateCreated'))))
                    )
                ]
            }),
            jsonInput({
                omit: !rec.get('data'),
                value: rec.get('data'),
                disabled: true,
                height: 100,
                width: '100%',
                editorProps: {lineWrapping: true}
            }),
            toolbar(
                filler(),
                button({
                    text: 'Close',
                    intent: 'primary',
                    onClick: () => model.closeDetail()
                })
            )
        );
    }
);
