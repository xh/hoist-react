/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {form} from '@xh/hoist/cmp/form';
import {div, h3, hframe, span, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {jsonInput, switchInput, textInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {dateTimeRenderer} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';

export const clientErrorDetail = hoistCmp.factory(
    ({model}) => {
        const {selectedRecord, formattedErrorJson, formModel} = model,
            userMsg = formModel.values.msg;

        if (!selectedRecord) return null;

        return panel({
            className: 'xh-admin-activity-detail',
            model: {
                side: 'bottom',
                defaultSize: 370
            },
            item: form({
                fieldDefaults: {inline: true},
                item: hframe(
                    div({
                        className: 'xh-admin-activity-detail__form',
                        style: {width: '400px'},
                        items: [
                            h3(Icon.info(), 'Error Info'),
                            formField({
                                field: 'username',
                                item: textInput(),
                                readonlyRenderer: valOrNa
                            }),
                            formField({
                                field: 'dateCreated',
                                item: textInput(),
                                readonlyRenderer: dateTimeRenderer({})
                            }),
                            formField({
                                field: 'appVersion',
                                item: textInput(),
                                readonlyRenderer: valOrNa
                            }),
                            formField({
                                field: 'userAlerted',
                                label: 'User Alerted?',
                                item: switchInput()
                            }),
                            formField({
                                field: 'id',
                                item: textInput(),
                                readonlyRenderer: valOrNa
                            }),
                            h3(Icon.desktop(), 'Device / Browser'),
                            formField({
                                field: 'device',
                                item: textInput(),
                                readonlyRenderer: valOrNa
                            }),
                            formField({
                                field: 'browser',
                                item: textInput(),
                                readonlyRenderer: valOrNa
                            }),
                            formField({
                                field: 'userAgent',
                                item: textInput(),
                                readonlyRenderer: valOrNa
                            })
                        ]
                    }),
                    vbox({
                        flex: 1,
                        className: 'xh-border-left',
                        items: [
                            panel({
                                height: 100,
                                className: 'xh-border-bottom',
                                items: [
                                    h3(Icon.comment(), 'User Message'),
                                    div({
                                        className: `xh-admin-activity-detail__message`,
                                        item: userMsg
                                    })
                                ],
                                omit: !userMsg
                            }),
                            panel({
                                flex: 1,
                                items: [
                                    h3(Icon.json(), 'Additional Data'),
                                    jsonInput({
                                        readonly: true,
                                        width: '100%',
                                        height: '100%',
                                        showCopyButton: true,
                                        value: formattedErrorJson ?? '{}'
                                    })
                                ]
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
