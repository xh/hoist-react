/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {DataFieldsEditorModel} from '@xh/hoist/admin/tabs/activity/tracking/datafields/DataFieldsEditorModel';
import {form, FormModel} from '@xh/hoist/cmp/form';
import {br, filler, hbox, hspacer, placeholder, span, vspacer} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {FieldType} from '@xh/hoist/data';
import {button, buttonGroup} from '@xh/hoist/desktop/cmp/button';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {checkbox, select, textInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {popover} from '@xh/hoist/kit/blueprint';
import {isEmpty} from 'lodash';

export const dataFieldsEditor = hoistCmp.factory({
    displayName: 'DataFieldsEditor',
    model: uses(DataFieldsEditorModel),

    render({model}) {
        const {showEditor, appliedDataFieldCount, hasAppliedDataFields} = model;

        return popover({
            isOpen: showEditor,
            item: button({
                text: `Extract Data Fields${appliedDataFieldCount ? ' (' + appliedDataFieldCount + ')' : ''}`,
                icon: Icon.json({prefix: hasAppliedDataFields ? 'fas' : 'far'}),
                intent: hasAppliedDataFields ? 'primary' : null,
                outlined: showEditor,
                onClick: () => model.show()
            }),
            content: formPanel(),
            popoverClassName: 'xh-popup xh-popup--framed',
            onClose: () => model.close()
        });
    }
});

const formPanel = hoistCmp.factory<DataFieldsEditorModel>(({model}) => {
    const {formModel, dataFields} = model;
    return panel({
        className: 'xh-admin-activity-panel__data-fields-editor',
        item: form({
            model: formModel,
            items: isEmpty(dataFields.value)
                ? emptyPlaceholder()
                : [
                      ...dataFields.value.map((dfModel: FormModel) => {
                          return form({
                              model: dfModel,
                              fieldDefaults: {label: null, commitOnChange: true},
                              item: hbox({
                                  className: 'xh-admin-activity-panel__data-fields-editor__row',
                                  alignItems: 'flex-start',
                                  flex: 'none',
                                  items: [
                                      formField({
                                          field: 'path',
                                          flex: 1,
                                          item: textInput({placeholder: 'Path (dot-delimited)'})
                                      }),
                                      formField({
                                          field: 'displayName',
                                          width: 180,
                                          item: textInput({placeholder: 'Display Name'})
                                      }),
                                      formField({
                                          field: 'type',
                                          width: 120,
                                          item: select({
                                              placeholder: 'Data Type',
                                              options: Object.values(FieldType).sort()
                                          })
                                      }),
                                      formField({
                                          field: 'aggregator',
                                          width: 120,
                                          item: select({
                                              placeholder: 'Aggregator',
                                              // TODO - cascade select with type?
                                              options: model.aggTokens,
                                              enableClear: true
                                          })
                                      }),
                                      formField({
                                          field: 'isDimension',
                                          marginTop: 8,
                                          item: checkbox({label: 'dimension'})
                                      }),
                                      buttonGroup({
                                          outlined: true,
                                          marginTop: 3,
                                          items: [
                                              button({
                                                  icon: Icon.copy(),
                                                  onClick: () => model.cloneField(dfModel)
                                              }),
                                              button({
                                                  icon: Icon.delete({intent: 'danger'}),
                                                  onClick: () => dataFields.remove(dfModel)
                                              })
                                          ]
                                      })
                                  ]
                              })
                          });
                      }),
                      hbox(filler(), addButton(), filler()),
                      filler({minHeight: 10})
                  ]
        }),
        bbar: [
            filler(),
            button({
                text: 'Cancel',
                onClick: () => model.close()
            }),
            hspacer(5),
            button({
                text: 'Apply + Reload',
                icon: Icon.check(),
                outlined: true,
                intent: 'success',
                disabled: !formModel.isValid,
                onClick: () => model.applyAndClose()
            })
        ]
    });
});

const emptyPlaceholder = hoistCmp.factory<DataFieldsEditorModel>(({model}) => {
    return placeholder(
        span(
            'Define fields to extract from the optional data payload on each activity record.',
            br(),
            'Extracted data can then be viewed on both aggregate and detail levels.'
        ),
        vspacer(),
        addButton()
    );
});

const addButton = hoistCmp.factory<DataFieldsEditorModel>(({model}) => {
    return button({
        text: 'Add field...',
        icon: Icon.add(),
        intent: 'primary',
        outlined: true,
        onClick: () => model.addField()
    });
});
