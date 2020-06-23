import {form} from '@xh/hoist/cmp/form';
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {div, filler, hframe, vbox} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {hoistCmp, uses} from '@xh/hoist/core';
import {colChooserButton, exportButton} from '@xh/hoist/desktop/cmp/button';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {jsonInput, textArea, textInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon/Icon';
import {ActivityDetailModel} from './ActivityDetailModel';

export const activityDetailView = hoistCmp.factory({
    model: uses(ActivityDetailModel),

    render({model, ...props}) {
        return panel({
            title: 'Track Log Entries',
            icon: Icon.list(),
            items: [
                grid({flex: 1}),
                detailRecForm()
            ],
            tbar: bbar(),
            ...props
        });
    }
});

const bbar = hoistCmp.factory(
    ({model}) => {
        return toolbar(
            filler(),
            gridCountLabel({unit: 'entry'}),
            storeFilterField(),
            colChooserButton(),
            exportButton()
        );
    }
);

const detailRecForm = hoistCmp.factory(
    ({model}) => {
        return panel({
            title: 'Activity Detail',
            icon: Icon.detail(),
            model: {
                side: 'bottom',
                defaultSize: 300
            },
            item: form({
                fieldDefaults: {inline: true},
                item: hframe(
                    vbox({
                        width: 200,
                        items: [
                            formField({field: 'category', item: textInput()}),
                            formField({field: 'msg', item: textArea()}),
                            formField({field: 'elapsed', item: textArea()})
                        ]
                    }),
                    vbox({
                        width: 200,
                        items: [
                            formField({field: 'username', item: textInput()}),
                            formField({field: 'device', item: textInput()}),
                            formField({field: 'browser', item: textInput()}),
                            formField({field: 'userAgent', item: textInput()})
                        ]
                    }),
                    formField({
                        field: 'data',
                        label: null,
                        flex: 1,
                        item: jsonInput(),
                        readonlyRenderer: (v) => div({
                            className: `xh-admin-activity-panel__json ${v ? '' : 'xh-admin-activity-panel__json--empty'}`,
                            item: v ? JSON.stringify(JSON.parse(v), null, 2) : 'None'
                        })
                    })
                )
            })
        });
    }
);