/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {form} from '@xh/hoist/cmp/form';
import {code, div, filler, hframe, p, placeholder, vbox} from '@xh/hoist/cmp/layout';
import {relativeTimestamp} from '@xh/hoist/cmp/relativetimestamp';
import {creates, hoistCmp, XH} from '@xh/hoist/core';
import {banner} from '@xh/hoist/desktop/appcontainer/Banner';
import {button} from '@xh/hoist/desktop/cmp/button';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {
    buttonGroupInput,
    dateInput,
    switchInput,
    textArea,
    textInput
} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {dateTimeRenderer} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {LocalDate, SECONDS} from '@xh/hoist/utils/datetime';
import {AlertBannerModel} from './AlertBannerModel';
import './AlertBannerPanel.scss';

export const alertBannerPanel = hoistCmp.factory({
    model: creates(AlertBannerModel),

    render() {
        return panel({
            className: 'xh-alert-banner-panel',
            mask: 'onLoad',
            item: hframe(
                formPanel(),
                previewPanel()
            )
        });
    }
});

const formPanel = hoistCmp.factory(
    ({model}) => {
        const {formModel, loadModel} = model,
            {isDirty, isValid} = formModel;

        return panel({
            title: 'Settings',
            icon: Icon.gear(),
            compactHeader: true,
            className: 'xh-alert-banner-panel__form-panel',
            item: form({
                fieldDefaults: {
                    inline: true,
                    commitOnChange: true,
                    labelWidth: 100
                },
                items: [
                    div({
                        className: 'xh-alert-banner-panel__disabled-warning',
                        items: [
                            p('Feature currently disabled via ', code('xhAlertBannerConfig'), '.'),
                            p('Banners can be configured and previewed here, but they will not be shown to any app users.'),
                            p('To enable, update or create the config above. Note that users (including you!) will need to reload this app in their browser to pick up the config change. Contact support@xh.io for assistance.')
                        ],
                        omit: XH.alertBannerService.enabled
                    }),
                    div({
                        className: 'xh-alert-banner-panel__intro',
                        items: [
                            p(`Show an alert banner to all ${XH.appName} users.`),
                            p(`Configure and preview below. Banner will appear to all users within ${XH.alertBannerService.interval/SECONDS}s once marked Active and saved.`)
                        ],
                        omit: !XH.alertBannerService.enabled
                    }),
                    div({
                        className: 'xh-alert-banner-panel__form-panel__fields',
                        items: [
                            formField({
                                field: 'message',
                                item: textArea({
                                    flex: 'none',
                                    height: 150,
                                    placeholder: 'Enter a brief message here.'
                                }),
                                info: 'First line shown in banner / any additional in pop-up.'
                            }),
                            formField({
                                field: 'intent',
                                item: buttonGroupInput({
                                    items: model.intentOptions.map(intent => button({
                                        intent,
                                        minimal: false,
                                        icon: formModel.values.intent === intent ? Icon.check() : Icon.placeholder(),
                                        value: intent
                                    }))
                                })
                            }),
                            formField({
                                field: 'iconName',
                                item: buttonGroupInput({
                                    enableClear: true,
                                    outlined: true,
                                    items: model.iconOptions.map(iconName => button({
                                        icon: Icon.icon({iconName}),
                                        value: iconName
                                    }))
                                })
                            }),
                            formField({
                                field: 'enableClose',
                                info: 'Allow users to close and hide this banner.',
                                item: switchInput()
                            }),
                            formField({
                                field: 'expires',
                                info: relativeTimestamp({
                                    timestamp: formModel.values.expires,
                                    options: {
                                        allowFuture: true,
                                        emptyResult: 'Set a date & time to automatically hide this banner.'
                                    }
                                }),
                                item: dateInput({
                                    enableClear: true,
                                    minDate: LocalDate.today().date,
                                    timePrecision: 'minute'
                                })
                            }),
                            formField({
                                field: 'active',
                                info: 'Enable and save to show this banner to all users.',
                                item: switchInput()
                            }),
                            formField({
                                omit: !formModel.values.updated,
                                field: 'updated',
                                className: 'xh-alert-banner-panel__form-panel__fields--ro',
                                item: textInput(),
                                readonlyRenderer: dateTimeRenderer({})
                            }),
                            formField({
                                omit: !formModel.values.updatedBy,
                                field: 'updatedBy',
                                className: 'xh-alert-banner-panel__form-panel__fields--ro',
                                item: textInput()
                            })
                        ]
                    })
                ]
            }),
            bbar: [
                filler(),
                button({
                    text: 'Reset',
                    disabled: !isDirty,
                    onClick: () => model.resetForm()
                }),
                button({
                    text: 'Save',
                    icon: Icon.check(),
                    intent: 'success',
                    disabled: !isValid || !isDirty,
                    onClick: () => model.saveAsync().linkTo(loadModel)
                })
            ]
        });
    }
);

const previewPanel = hoistCmp.factory(
    ({model}) => {
        const {bannerModel} = model;
        return panel({
            title: 'Preview',
            compactHeader: true,
            className: 'xh-alert-banner-panel__preview-panel xh-tiled-bg',
            items: [
                banner({
                    omit: !bannerModel,
                    key: bannerModel?.xhId,
                    model: bannerModel
                }),
                placeholder(`${XH.appName} App UI`)
            ]
        });
    }
);
