import {form} from '@xh/hoist/cmp/form';
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {div, filler, h3, hframe, span} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {hoistCmp, uses} from '@xh/hoist/core';
import {colChooserButton, exportButton} from '@xh/hoist/desktop/cmp/button';
import {clipboardButton} from '@xh/hoist/desktop/cmp/clipboard';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {textArea, textInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {dateTimeRenderer, numberRenderer} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon/Icon';
import {ActivityDetailModel} from './ActivityDetailModel';
import './ActivityDetailView.scss';

export const activityDetailView = hoistCmp.factory({
    model: uses(ActivityDetailModel),

    render({model, ...props}) {
        return panel({
            title: 'Track Log Entries',
            className: 'xh-admin-activity-detail',
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
        const {formattedData, gridModel} = model;
        if (!gridModel.selectedRecord) return null;

        return panel({
            model: {
                side: 'bottom',
                defaultSize: 450
            },
            item: form({
                fieldDefaults: {inline: true},
                item: hframe(
                    div({
                        className: 'xh-admin-activity-detail__form',
                        items: [
                            h3(Icon.info(), 'Activity'),
                            formField({field: 'category', item: textInput(), readonlyRenderer: valOrNa}),
                            formField({field: 'msg', item: textArea(), readonlyRenderer: valOrNa}),
                            formField({
                                field: 'dateCreated',
                                item: textArea(),
                                readonlyRenderer: dateTimeRenderer({})
                            }),
                            formField({
                                field: 'elapsed',
                                item: textInput(),
                                readonlyRenderer: numberRenderer({
                                    label: 'ms',
                                    nullDisplay: '-',
                                    asElement: true,
                                    formatConfig: {thousandSeparated: false, mantissa: 0}
                                })
                            }),
                            formField({field: 'id', item: textInput(), readonlyRenderer: valOrNa}),
                            h3(Icon.user(), 'User'),
                            formField({field: 'username', item: textInput(), readonlyRenderer: valOrNa}),
                            formField({field: 'impersonating', item: textInput(), readonlyRenderer: valOrNa}),
                            h3(Icon.desktop(), 'Device / Browser'),
                            formField({field: 'device', item: textInput(), readonlyRenderer: valOrNa}),
                            formField({field: 'browser', item: textInput(), readonlyRenderer: valOrNa}),
                            formField({field: 'userAgent', item: textInput(), readonlyRenderer: valOrNa})
                        ]
                    }),
                    panel({
                        flex: 1,
                        className: 'xh-border-left',
                        items: [
                            h3(Icon.json(), 'Additional Data'),
                            div({
                                className: `xh-admin-activity-detail__json ${formattedData ? '' : 'xh-admin-activity-detail__json--empty'}`,
                                item: formattedData ?? 'No additional data tracked.'
                            })
                        ],
                        bbar: [
                            filler(),
                            clipboardButton({
                                getCopyText: () => formattedData,
                                successMessage: 'Additional tracking data copied to clipboard.',
                                disabled: !formattedData,
                                outlined: true
                            })
                        ]
                    })
                )
            })
        });
    }
);

const valOrNa = v => v != null ? v : span({item: 'N/A', className: 'xh-text-color-muted'});