import {form} from '@xh/hoist/cmp/form';
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {div, filler, h3, hframe, span} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {hoistCmp, uses} from '@xh/hoist/core';
import {colChooserButton, exportButton} from '@xh/hoist/desktop/cmp/button';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {jsonInput, textArea, textInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {dateTimeRenderer, numberRenderer} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon/Icon';
import {ActivityDetailModel} from './ActivityDetailModel';

export const activityDetailView = hoistCmp.factory({
    model: uses(ActivityDetailModel),

    render({model, ...props}) {
        return panel({
            title: 'Track Log Entries',
            icon: Icon.list(),
            className: 'xh-admin-activity-detail',
            compactHeader: true,
            items: [
                grid({flex: 1}),
                detailRecForm()
            ],
            tbar: tbar(),
            ...props
        });
    }
});

const tbar = hoistCmp.factory(
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
        const {formattedData, gridModel, formModel} = model;
        if (!gridModel.selectedRecord) return null;

        return panel({
            model: {
                side: 'bottom',
                defaultSize: 370
            },
            item: form({
                fieldDefaults: {inline: true, readonlyRenderer: valOrNa},
                item: hframe(
                    div({
                        className: 'xh-admin-activity-detail__form',
                        style: {flex: 1},
                        items: [
                            h3(Icon.info(), 'Activity'),
                            formField({
                                field: 'username',
                                item: textInput(),
                                readonlyRenderer: (username) => {
                                    if (!username) return naSpan();
                                    const {impersonating} = formModel.values,
                                        impSpan = impersonating ? span({className: 'xh-text-color-accent', item: ` (impersonating ${impersonating})`}) : null;
                                    return span(username, impSpan);
                                }
                            }),
                            formField({
                                field: 'category',
                                item: textInput()
                            }),
                            formField({
                                field: 'msg',
                                item: textArea()
                            }),
                            formField({
                                field: 'dateCreated',
                                item: textInput(),
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
                            formField({
                                field: 'id',
                                item: textInput()
                            }),
                            h3(Icon.desktop(), 'Device / Browser'),
                            formField({
                                field: 'device',
                                item: textInput()
                            }),
                            formField({
                                field: 'browser',
                                item: textInput()
                            }),
                            formField({
                                field: 'userAgent',
                                item: textInput()
                            })
                        ]
                    }),
                    panel({
                        flex: 1,
                        className: 'xh-border-left',
                        items: [
                            h3(Icon.json(), 'Additional Data'),
                            jsonInput({
                                readonly: true,
                                width: '100%',
                                height: '100%',
                                showCopyButton: true,
                                value: formattedData ?? '{}'
                            })
                        ]
                    })
                )
            })
        });
    }
);

const valOrNa = v => v != null ? v : naSpan();
const naSpan = () => span({item: 'N/A', className: 'xh-text-color-muted'});
