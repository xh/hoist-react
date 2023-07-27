import {HoistModel, creates, hoistCmp, lookup, managed} from '@xh/hoist/core';
import {div, hbox, vbox} from '@xh/hoist/cmp/layout';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {form} from '@xh/hoist/cmp/form';
import {dateInput, textInput} from '@xh/hoist/desktop/cmp/input';
import {InspectorTabModel} from '../InspectorTab';
import {makeObservable} from 'mobx';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {FormModel} from '@xh/hoist/cmp/form';

class RoleDetailsModel extends HoistModel {
    @lookup(() => InspectorTabModel) mainGrid: InspectorTabModel;

    @managed
    formModel = new FormModel({
        fields: [
            {
                name: 'name',
                initialValue: 'Testing'
            },
            {
                name: 'group',
                initialValue: 'QA'
            },
            {
                name: 'lastUpdated',
                initialValue: LocalDate.today()
            },
            {
                name: 'lastUpdatedBy',
                initialValue: 'Joe'
            },
            {
                name: 'notes'
            },
            {
                name: 'inherits'
            }
        ]
    });

    constructor() {
        super();
        makeObservable(this);
    }
}

export const roleDetails = hoistCmp.factory({
    model: creates(RoleDetailsModel),

    render() {
        return div({
            item: form({
                item: vbox(
                    hbox({
                        flex: 'none',
                        items: [
                            vbox({
                                flex: 1,
                                items: [
                                    formField({field: 'name', item: textInput()}),
                                    formField({field: 'group', item: textInput()})
                                ]
                            }),
                            vbox({
                                flex: 1,
                                items: [
                                    formField({
                                        field: 'lastUpdated',
                                        item: dateInput()
                                    }),
                                    formField({field: 'lastUpdatedBy', item: textInput()})
                                ]
                            })
                        ]
                    }),
                    formField({field: 'notes', item: textInput()}),
                    formField({field: 'inherits', item: textInput()})
                )
            }),
            style: {
                padding: '0.5em'
            }
        });
    }
});
