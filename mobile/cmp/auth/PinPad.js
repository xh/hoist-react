import {div, hbox, span, vbox, p, h1} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon/Icon';
import {PinPadModel} from '@xh/hoist/mobile/cmp/auth/PinPadModel';
import './PinPad.scss';
import {button} from '@xh/hoist/mobile/cmp/button';
import {isNumber} from 'lodash';

export const pinPad = hoistCmp.factory({

    model: uses(PinPadModel),

    render() {
        return vbox({
            className: 'xh-auth-pinpad',
            items: [
                header(),
                display(),
                errorDisplay(),
                keypad()
            ]
        });
    }
});

const header = hoistCmp.factory(
    ({model}) => div({
        className: 'xh-auth-pinpad__header',
        items: [
            h1(model.headerText),
            p(model.subHeaderText)
        ]
    })
);

const display = hoistCmp.factory(
    ({model}) => hbox({
        className: 'xh-auth-pinpad__display',
        items: model.displayedDigits.map(
            (num, index) => digit({num, index})
        )
    })
);

const digit = hoistCmp.factory(
    ({num, index, model}) => {
        const isActive = index === model.numEntered;
        return span({
            className: 'xh-auth-pinpad__display__digit' +
                (model.disabled ? ' disabled' : '') +
                (isActive ? ' active' : ''),
            item: num
        });
    }
);

const errorDisplay = hoistCmp.factory(
    ({model}) => div({
        className: 'xh-auth-pinpad__error',
        item: p(model.errorText)
    })
);

const keypad = hoistCmp.factory(
    ({model}) => vbox({
        className: 'xh-auth-pinpad__keyboard',
        items: [
            keypadRow({keys: [1, 2, 3]}),
            keypadRow({keys: [4, 5, 6]}),
            keypadRow({keys: [7, 8, 9]}),
            keypadRow({keys: [
                {text: 'clear', onClick: () => model.clear()},
                0,
                {icon: Icon.arrowLeft(), onClick: () => model.deleteDigit()}
            ]})
        ]
    })
);

const keypadRow = hoistCmp.factory(
    ({keys, model}) => hbox({
        className: 'xh-auth-pinpad__keyboard__row',
        items: keys.map(
            key => button({
                className: 'xh-auth-pinpad__keyboard__key',
                disabled: model.disabled,
                ...(isNumber(key) ?
                    {
                        text: `${key}`,
                        onClick: () => model.enterDigit(key)
                    } : key
                )
            })
        )
    })
);