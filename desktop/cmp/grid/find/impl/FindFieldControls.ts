/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {hbox, span, vbox} from '@xh/hoist/cmp/layout';
import type {HoistProps} from '@xh/hoist/core';
import {hoistCmp} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';

/**
 * Model behind a grid find field's count label and previous / next buttons.
 * @internal
 */
export interface FindFieldControlsModel {
    hasFocus: boolean;
    hasQuery: boolean;
    hasResults: boolean;
    countLabel: string;
    selectPrev(): void;
    selectNext(): void;
}

interface FindFieldControlsProps extends HoistProps {
    impl: FindFieldControlsModel;
}

/**
 * Match count and previous / next buttons, shown beside the input of a grid find field.
 * @internal
 */
export const findFieldControls = hoistCmp.factory<FindFieldControlsProps>(({impl}) => {
    const {hasFocus, hasQuery, hasResults, countLabel} = impl;
    if (!hasFocus && !hasQuery) return null;
    return hbox({
        className: 'xh-grid-find-field__controls',
        children: [
            span({
                omit: !countLabel,
                className: 'xh-grid-find-field__count-label',
                children: countLabel
            }),
            vbox(
                button({
                    disabled: !hasResults,
                    icon: Icon.chevronUp(),
                    onClick: () => impl.selectPrev()
                }),
                button({
                    disabled: !hasResults,
                    icon: Icon.chevronDown(),
                    onClick: () => impl.selectNext()
                })
            )
        ]
    });
});
