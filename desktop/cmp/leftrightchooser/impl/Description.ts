/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {div} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import {createElement} from 'react';
import type {LeftRightChooserModel} from '../LeftRightChooserModel';

/** @internal */
export const description = hoistCmp.factory<LeftRightChooserModel>(({model}) => {
    const {hasDescription, leftModel, rightModel} = model,
        selected = leftModel.selectedRecord ?? rightModel.selectedRecord,
        selDescription = selected?.data.description,
        selText = selected?.data.text;

    if (!hasDescription || !selDescription) return null;

    // Blueprint's callout class names are kept, so its styles and any app CSS still apply.
    return div({
        className:
            'xh-lr-chooser__description bp6-callout bp6-intent-primary bp6-callout-has-body-content',
        children: [
            selText ? createElement('h5', {className: 'bp6-heading'}, selText) : null,
            selDescription
        ]
    });
});
