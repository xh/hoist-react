import {library} from '@fortawesome/fontawesome-svg-core';
import {
    faEquals,
    faGreaterThan,
    faGreaterThanEqual,
    faLessThan,
    faLessThanEqual,
    faNotEqual
} from '@fortawesome/pro-regular-svg-icons';
import {hbox, hspacer, label, span, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {dateInput, numberInput, select, textInput} from '@xh/hoist/desktop/cmp/input';
import {Icon} from '@xh/hoist/icon';

library.add(faGreaterThanEqual, faGreaterThan, faLessThanEqual, faLessThan, faEquals, faNotEqual);

export const customFilter = hoistCmp.factory({
    render({model}) {
        const {type} = model,
            props = {bind: 'inputVal', enableClear: true, width: 150};
        let cmp;
        switch (type) {
            case 'number':
            case 'int':
                cmp = numberInput({...props, enableShorthandUnits: true});
                break;
            case 'localDate':
            case 'date':
                cmp = dateInput({...props, valueType: type});
                break;
            default:
                cmp = textInput(props);
        }

        return vbox({
            className: 'custom-filter',
            items: [
                hbox({
                    className: 'custom-filter__operator-label',
                    items: [
                        label('Where'),
                        select({
                            width: 50,
                            enableFilter: false,
                            hideDropdownIndicator: true,
                            hideSelectedOptionCheck: true,
                            options: ['any', 'every']
                        }),
                        label(':')
                    ]
                }),
                hbox({
                    className: 'custom-filter__input',
                    items: [
                        select({
                            width: 45,
                            bind: 'op',
                            enableFilter: false,
                            hideDropdownIndicator: true,
                            optionRenderer: (opt) => hbox(getOpIcon(opt.value)),
                            options: ['number', 'int', 'localDate', 'date'].includes(type) ?
                                ['=', '!=', '>', '>=', '<', '<=']
                                    .map(value => ({label: getOpIcon(value), value})) :
                                ['=', '!=', 'like']
                                    .map(value => ({label: getOpIcon(value), value}))
                        }),
                        hspacer(5),
                        cmp,
                        button({
                            icon: Icon.add(),
                            title: 'Add condition'
                        })
                    ]
                })
            ]
        });
    }
});

function getOpIcon(op) {
    switch (op) {
        case '=':
            return Icon.icon({iconName: 'equals'});
        case '!=':
            return Icon.icon({iconName: 'not-equal'});
        case '>':
            return Icon.icon({iconName: 'greater-than'});
        case '>=':
            return Icon.icon({iconName: 'greater-than-equal'});
        case '<':
            return Icon.icon({iconName: 'less-than'});
        case '<=':
            return Icon.icon({iconName: 'less-than-equal'});
        case 'like':
            return span({className: 'op-label', item: 'like'});
        case 'notLike':
            return span({className: 'op-label', item: 'not like'});
    }
}
