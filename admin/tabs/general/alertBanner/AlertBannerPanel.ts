/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {AppModel} from '@xh/hoist/admin/AppModel';
import {form} from '@xh/hoist/cmp/form';
import {code, div, filler, hframe, p, placeholder, span, vbox} from '@xh/hoist/cmp/layout';
import {getRelativeTimestamp, relativeTimestamp} from '@xh/hoist/cmp/relativetimestamp';
import {creates, hoistCmp, XH} from '@xh/hoist/core';
import {banner} from '@xh/hoist/desktop/appcontainer/Banner';
import {button} from '@xh/hoist/desktop/cmp/button';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {buttonGroupInput, dateInput, switchInput, textArea} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {dateTimeRenderer} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {menu, menuDivider, menuItem, popover} from '@xh/hoist/kit/blueprint';
import {LocalDate, SECONDS} from '@xh/hoist/utils/datetime';
import {isEmpty, truncate} from 'lodash';
import {AlertBannerModel} from './AlertBannerModel';
import './AlertBannerPanel.scss';

export const alertBannerPanel = hoistCmp.factory({
    model: creates(AlertBannerModel),

    render() {
        return panel({
            className: 'xh-alert-banner-panel',
            mask: 'onLoad',
            item: hframe(formPanel(), previewPanel())
        });
    }
});

const formPanel = hoistCmp.factory<AlertBannerModel>(({model}) => {
    const {formModel} = model,
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
                XH.alertBannerService.enabled
                    ? div({
                          className: 'xh-alert-banner-panel__intro',
                          items: [
                              p(`Show an alert banner to all ${XH.appName} users.`),
                              p(
                                  `Configure and preview below. Presets can be saved and loaded via bottom bar menu. Banner will appear to all users within ${
                                      XH.alertBannerService.interval / SECONDS
                                  }s once marked Active and saved.`
                              )
                          ]
                      })
                    : div({
                          className: 'xh-alert-banner-panel__disabled-warning',
                          items: [
                              p(
                                  'Feature currently disabled via ',
                                  code('xhAlertBannerConfig'),
                                  '.'
                              ),
                              p(
                                  'Banners can be configured and previewed here, but they will not be shown to any app users.'
                              ),
                              p(
                                  'To enable, update or create the config above. Note that users (including you!) will need to reload this app in their browser to pick up the config change. Contact support@xh.io for assistance.'
                              )
                          ]
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
                                items: model.intentOptions.map(intent =>
                                    button({
                                        intent,
                                        minimal: false,
                                        // Opacity solution to account for Icon.placeholder() causing label to move when primary deselected
                                        icon: Icon.check({
                                            opacity: formModel.values.intent === intent ? 1 : 0
                                        }),
                                        value: intent
                                    })
                                )
                            })
                        }),
                        formField({
                            field: 'iconName',
                            item: buttonGroupInput({
                                enableClear: true,
                                outlined: true,
                                items: model.iconOptions.map(iconName =>
                                    button({
                                        icon: Icon.icon({iconName}),
                                        value: iconName
                                    })
                                )
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
                                    emptyResult:
                                        'Set a date & time to automatically hide this banner.'
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
                            readonlyRenderer: dateTimeRenderer({})
                        }),
                        formField({
                            omit: !formModel.values.updatedBy,
                            field: 'updatedBy',
                            className: 'xh-alert-banner-panel__form-panel__fields--ro'
                        })
                    ]
                })
            ]
        }),
        bbar: toolbar({
            items: [
                popover({
                    target: button({
                        icon: Icon.bookmark(),
                        text: 'Presets',
                        outlined: true
                    }),
                    content: presetMenu()
                }),
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
                    onClick: () => model.saveAsync()
                })
            ],
            omit: AppModel.readonly
        })
    });
});

const previewPanel = hoistCmp.factory<AlertBannerModel>(({model}) => {
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
});

//------------------
// Preset Menu
//------------------
const presetMenu = hoistCmp.factory<AlertBannerModel>({
    render({model}) {
        const {savedPresets} = model,
            items = [];

        if (isEmpty(savedPresets)) {
            items.push(menuItem({text: 'No presets saved...', disabled: true}));
        } else {
            items.push(...savedPresets.map(preset => presetMenuItem({preset})));
        }

        items.push(
            menuDivider(),
            menuItem({
                icon: Icon.add({intent: 'success'}),
                disabled: !model.formModel.fields.message.value || model.currentValuesSavedAsPreset,
                text: 'Add current',
                onClick: e => {
                    model.addPreset();
                    e.stopPropagation();
                }
            })
        );

        return menu({items, style: {maxHeight: '400px', overflowY: 'auto'}});
    }
});

const presetMenuItem = hoistCmp.factory<AlertBannerModel>({
    render({model, preset}) {
        const {iconName, intent, message, dateCreated, createdBy} = preset;
        return menuItem({
            icon: iconName
                ? Icon.icon({iconName, intent, prefix: 'fas', size: 'lg'})
                : Icon.placeholder({size: 'lg'}),
            text: vbox({
                items: [
                    truncate(message, {length: 50}),
                    span({
                        item: `Saved by ${createdBy} ${getRelativeTimestamp(dateCreated)}`,
                        className: 'xh-font-size-small xh-text-color-muted'
                    })
                ]
            }),
            multiline: true,
            onClick: () => model.loadPreset(preset),
            labelElement: button({
                icon: Icon.delete(),
                intent: 'danger',
                onClick: e => {
                    model.removePreset(preset);
                    e.stopPropagation();
                }
            })
        });
    }
});
