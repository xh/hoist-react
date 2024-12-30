/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {MessageSourceModel} from '@xh/hoist/appcontainer/MessageSourceModel';
import {fragment} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {message} from './Message';

/**
 *  Support for hosting multiple global Messages in the DOM.
 *  @internal
 */
export const messageSource = hoistCmp.factory({
    displayName: 'MessageSource',
    model: uses(MessageSourceModel),

    render({model}) {
        const models = model.msgModels,
            children = models.map(m => message({model: m}));
        return children.length ? fragment(...children) : null;
    }
});
