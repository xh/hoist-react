/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {form} from '@xh/hoist/cmp/form';
import {a, div, h3, hframe, span, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {jsonInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {fmtDateTimeSec} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {isNil} from 'lodash';
import {ClientErrorsModel} from './ClientErrorsModel';

export const clientErrorDetail = hoistCmp.factory<ClientErrorsModel>(({model}) => {
    const {selectedRecord, formattedErrorJson, formModel} = model,
        userMsg = formModel.values.msg;

    if (!selectedRecord) return null;

    return panel({
        className: 'xh-admin-activity-detail',
        modelConfig: {
            side: 'bottom',
            defaultSize: 370
        },
        item: form({
            fieldDefaults: {inline: true, readonlyRenderer: valOrNa},
            item: hframe(
                div({
                    className: 'xh-admin-activity-detail__form',
                    style: {width: '400px'},
                    items: [
                        h3(Icon.info(), 'Error Info'),
                        formField({field: 'username'}),
                        formField({
                            field: 'dateCreated',
                            readonlyRenderer: v => fmtDateTimeSec(v)
                        }),
                        formField({field: 'appVersion'}),
                        formField({
                            field: 'userAlerted',
                            label: 'User Alerted?'
                        }),
                        formField({field: 'id'}),
                        formField({field: 'correlationId'}),
                        formField({
                            field: 'url',
                            readonlyRenderer: hyperlinkVal
                        }),
                        h3(Icon.desktop(), 'Device / Browser'),
                        formField({field: 'device'}),
                        formField({field: 'browser'}),
                        formField({field: 'userAgent'})
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
});

const valOrNa = v => (!isNil(v) ? v.toString() : naSpan());
const naSpan = () => span({item: 'N/A', className: 'xh-text-color-muted'});
const hyperlinkVal = v => a({href: v, item: v, target: '_blank'});
