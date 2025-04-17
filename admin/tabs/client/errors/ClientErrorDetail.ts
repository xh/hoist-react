/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {correlationId, instance} from '@xh/hoist/admin/columns';
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
        className: 'xh-admin-client-errors-detail',
        modelConfig: {
            side: 'bottom',
            defaultSize: 370
        },
        item: form({
            fieldDefaults: {inline: true, readonlyRenderer: valOrNa},
            item: hframe(
                div({
                    className: 'xh-admin-client-errors-detail__form',
                    style: {width: '400px'},
                    items: [
                        h3(Icon.info(), 'Error Info'),
                        formField({
                            field: 'username',
                            readonlyRenderer: username => {
                                if (!username) return naSpan();
                                const {impersonating} = formModel.values,
                                    impSpan = impersonating
                                        ? span({
                                              className: 'xh-text-color-accent',
                                              item: ` (impersonating ${impersonating})`
                                          })
                                        : null;
                                return span(username, impSpan);
                            }
                        }),
                        formField({
                            field: 'appVersion',
                            readonlyRenderer: appVersion => {
                                if (!appVersion) return naSpan();
                                const {appEnvironment} = formModel.values;
                                return `${appVersion} (${appEnvironment})`;
                            }
                        }),
                        formField({
                            field: 'userAlerted',
                            label: 'User Alerted?'
                        }),
                        formField({
                            field: 'url',
                            readonlyRenderer: hyperlinkVal
                        }),
                        formField({
                            field: 'instance',
                            readonlyRenderer: v => instance.renderer(v, null)
                        }),
                        formField({
                            field: 'correlationId',
                            readonlyRenderer: v => correlationId.renderer(v, null)
                        }),
                        formField({
                            field: 'dateCreated',
                            readonlyRenderer: v => fmtDateTimeSec(v)
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
const hyperlinkVal = v => (v ? a({href: v, item: v, target: '_blank'}) : '-');
