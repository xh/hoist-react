/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import {callout} from '@xh/hoist/kit/blueprint';

/** @private */
export const description = hoistCmp.factory(
    ({model}) => {
        const {hasDescription, leftModel, rightModel} = model,
            selected = leftModel.selectedRecord ?? rightModel.selectedRecord,
            selDescription = selected?.data.description,
            selText = selected?.data.text;

        if (!hasDescription || !selDescription) return null;

        return callout({
            title: selText,
            className: 'xh-lr-chooser__description',
            intent: 'primary',
            icon: null,
            item: selDescription
        });
    }
);
