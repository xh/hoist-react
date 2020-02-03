import {hbox, span, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon/Icon';
import {PinPadModel} from '@xh/hoist/mobile/cmp/auth/PinPadModel';
import './PinPad.scss';
import {button} from '@xh/hoist/mobile/cmp/button';
import {mask} from '@xh/hoist/mobile/cmp/mask';
import {isNumber} from 'lodash';

export const pinPad = hoistCmp.factory({

    model: uses(PinPadModel),

    render({model}) {
        return vbox({
            className: 'xh-auth-pinpad',
            items: [
                pinPadDisplay(),
                pinPadKeyboard(),
                mask({
                    isDisplayed: model.disabled,
                    message: model.errorText,
                    spinner: false
                })
            ]
        });
    }
});

const pinPadDisplay = hoistCmp.factory({
    render({model}) {
        return hbox({
            className: 'xh-auth-pinpad__display',
            items: model.displayedDigits.map(
                i => digit({num: i})
            )
        });
    }
});

const digit = hoistCmp.factory({
    render({num}) {
        return span({
            className: 'xh-auth-pinpad__display__digit',
            item: num
        });
    }
});

const pinPadKeyboard = hoistCmp.factory({
    render({model}) {
        return vbox({
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
        });
    }
});

const keypadRow = hoistCmp.factory({
    render({keys, model}) {
        return hbox(
            keys.map(
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
        );
    }
});