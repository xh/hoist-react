import {hoistCmp, uses} from '@xh/hoist/core';
import {div, table, tbody, tr, th, td} from '@xh/hoist/cmp/layout';
import {jsonInput} from '@xh/hoist/desktop/cmp/input';

import {ActivityModel} from '../ActivityModel';

export const activityDetailTable = hoistCmp.factory({
    model: uses(ActivityModel),

    render({model}) {
        const record = model.gridModel.selectedRecord;
        if (!record) return null;

        const {username, day, category, device, browser, userAgent, elapsed, msg, data} = record.data;

        return div({
            className: 'xh-admin-activity-detail',
            items: [
                table(
                    tbody(
                        tr(th('User'), td(username)),
                        tr(th('Day'), td(model.dateRangeRenderer(day))),
                        tr(th('Msg'), td(msg)),
                        tr(th('Category'), td(category)),
                        tr(th('Device'), td(device)),
                        tr(th('Browser'), td(browser)),
                        tr(th('Agent'), td(userAgent)),
                        tr(th('Elapsed (ms)'), td(elapsed))
                    )
                ),
                jsonInput({
                    omit: !data,
                    value: JSON.stringify(JSON.parse(data), null, 2),
                    height: 'fit-content',
                    maxHeight: 300,
                    width: '100%',
                    disabled: true,
                    editorProps: {lineWrapping: true}
                })
            ]
        });
    }
});