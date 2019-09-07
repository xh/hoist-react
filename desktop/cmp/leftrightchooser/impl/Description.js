/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {hoistCmpFactory, useModel} from '@xh/hoist/core';
import {callout} from '@xh/hoist/kit/blueprint';
import {LeftRightChooserModel} from '../LeftRightChooserModel';

/** @private */
export const description = hoistCmpFactory(() => {
    const model = useModel(LeftRightChooserModel),
        {hasDescription, leftModel, rightModel} = model,
        selected = leftModel.selectedRecord || rightModel.selectedRecord;

    if (!hasDescription || !(selected && selected.description)) return null;

    return callout({
        title: selected.text,
        className: 'xh-lr-chooser__description',
        intent: 'primary',
        icon: null,
        item: selected.description
    });
});
