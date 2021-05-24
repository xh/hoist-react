import {vbox, vspacer} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import {dateInput, numberInput, select, textInput} from '@xh/hoist/desktop/cmp/input';

export const customFilter = hoistCmp.factory({
    render({model}) {
        const {type} = model;
        let cmp;
        switch (type) {
            case 'number':
            case 'int':
                cmp = numberInput({
                    bind: 'inputVal',
                    enableShorthandUnits: true,
                    enableClear: true
                });
                break;
            case 'localDate':
            case 'date':
                cmp = dateInput({
                    bind: 'inputVal',
                    valueType: type,
                    enableClear: true
                });
                break;
            default:
                cmp = textInput({bind: 'inputVal', enableClear: true});
        }

        return vbox({
            alignItems: 'center',
            justifyContent: 'center',
            items: [
                select({
                    bind: 'op',
                    options:
                        ['number', 'int', 'localDate', 'date'].includes(type) ?
                            [
                                {label: 'Equals', value: '='},
                                {label: 'Not Equals', value: '!='},
                                {label: 'Greater Than', value: '>'},
                                {label: 'Greater Than Or Equal to', value: '>='},
                                {label: 'Less Than', value: '<'},
                                {label: 'Less Than or Equal to', value: '<='}
                            ] :
                            [
                                {label: 'Equals', value: '='},
                                {label: 'Not Equals', value: '!='},
                                {label: 'Contains', value: 'like'}
                            ]
                }),
                vspacer(),
                cmp
            ],
            height: 250,
            width: 240
        });
    }
});
