/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {creates, hoistCmp} from '@xh/hoist/core';
import {hframe, hbox, vbox, filler} from '@xh/hoist/cmp/layout';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {form} from '@xh/hoist/cmp/form';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {dateInput, select, switchInput, textInput, textArea} from '@xh/hoist/desktop/cmp/input';
import {button} from '@xh/hoist/desktop/cmp/button';
import {banner} from '@xh/hoist/desktop/appcontainer/Banner';
import {dateTimeRenderer} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {LocalDate} from '@xh/hoist/utils/datetime';
import './AlertBannerPanel.scss';
import {AlertBannerModel} from './AlertBannerModel';

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
        const {formModel, loadModel} = model;
        return panel({
            title: 'Settings',
            icon: Icon.gear(),
            compactHeader: true,
            className: 'xh-alert-banner-panel__form-panel',
            item: form({
                fieldDefaults: {
                    inline: true,
                    minimal: true,
                    commitOnChange: true,
                    labelWidth: 100
                },
                items: [
                    vbox({
                        className: 'xh-alert-banner-panel__form-panel__fields',
                        items: [
                            formField({
                                field: 'active',
                                item: switchInput()
                            }),
                            formField({
                                field: 'message',
                                item: textArea({height: 100})
                            }),
                            formField({
                                field: 'intent',
                                item: select({
                                    options: model.intentOptions
                                })
                            }),
                            formField({
                                field: 'iconName',
                                item: select({
                                    enableClear: true,
                                    options: model.iconOptions,
                                    optionRenderer: (opt) => iconOption({opt})
                                })
                            }),
                            formField({
                                field: 'enableClose',
                                item: switchInput()
                            }),
                            formField({
                                field: 'expires',
                                item: dateInput({
                                    enableClear: true,
                                    minDate: LocalDate.today().date,
                                    timePrecision: 'minute'
                                })
                            }),
                            formField({
                                omit: !formModel.values.updated,
                                field: 'updated',
                                item: textInput(),
                                readonlyRenderer: dateTimeRenderer({})
                            }),
                            formField({
                                omit: !formModel.values.updatedBy,
                                field: 'updatedBy',
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
                    onClick: () => model.resetForm()
                }),
                button({
                    text: 'Save',
                    icon: Icon.check(),
                    intent: 'success',
                    disabled: !formModel.isValid,
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
            item: banner({
                omit: !bannerModel,
                key: bannerModel?.xhId,
                model: bannerModel
            })
        });
    }
);

const iconOption = hoistCmp.factory(
    ({opt}) => hbox(
        Icon.icon({
            iconName: opt.value,
            style: {width: 30, marginRight: 5}
        }),
        opt.label
    )
);
