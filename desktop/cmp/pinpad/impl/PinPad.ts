/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import composeRefs from '@seznam/compose-react-refs';
import {div, frame, h1, hbox, p, span, vbox, vframe} from '@xh/hoist/cmp/layout';
import {PinPadModel, PinPadProps} from '@xh/hoist/cmp/pinpad';
import {hoistCmp, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon/Icon';
import {isNumber} from 'lodash';

import './PinPad.scss';

/**
 * Desktop Implementation of PinPad.
 *
 * @internal
 */
export const pinPadImpl = hoistCmp.factory<PinPadProps>({
    model: uses(PinPadModel),
    render({model, testId}, ref) {
        return frame({
            ref: composeRefs(model.ref, ref),
            item: vframe({
                className: 'xh-pinpad__frame',
                items: [header(), display(), errorDisplay(), keypad()],
                testId
            })
        });
    }
});

const header = hoistCmp.factory<PinPadModel>(({model}) =>
    div({
        className: 'xh-pinpad__header',
        items: [h1(model.headerText), p(model.subHeaderText)]
    })
);

const display = hoistCmp.factory<PinPadModel>(({model}) =>
    hbox({
        className: 'xh-pinpad__display',
        items: model.displayedDigits.map((num, index) => digit({num, index}))
    })
);

const digit = hoistCmp.factory<PinPadModel>(({num, index, model}) => {
    const isActive = index === model.activeIndex;
    let className = 'xh-pinpad__display__digit';
    if (model.disabled) className += ' disabled';
    if (isActive) className += ' active';
    return span({
        className,
        item: `${num}`
    });
});

const errorDisplay = hoistCmp.factory<PinPadModel>(({model}) =>
    div({
        className: 'xh-pinpad__error',
        item: p(model.errorText)
    })
);

const keypad = hoistCmp.factory<PinPadModel>(({model}) =>
    vbox({
        className: 'xh-pinpad__keyboard',
        items: [
            keypadRow({keys: [1, 2, 3]}),
            keypadRow({keys: [4, 5, 6]}),
            keypadRow({keys: [7, 8, 9]}),
            keypadRow({
                keys: [
                    {text: 'Clear', onClick: () => model.clear()},
                    0,
                    {icon: Icon.arrowLeft(), onClick: () => model.deleteDigit()}
                ]
            })
        ]
    })
);

const keypadRow = hoistCmp.factory<PinPadModel>(({keys, model}) =>
    hbox({
        className: 'xh-pinpad__keyboard__row',
        items: keys.map(key =>
            button({
                className: 'xh-pinpad__keyboard__key',
                disabled: model.disabled,
                ...(isNumber(key)
                    ? {
                          text: `${key}`,
                          onClick: () => model.enterDigit(key)
                      }
                    : key)
            })
        )
    })
);
