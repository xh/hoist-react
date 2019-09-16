/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {hoistCmp, uses} from '@xh/hoist/core';
import {fragment} from '@xh/hoist/cmp/layout';
import {message} from './Message';

import {MessageSourceModel} from '@xh/hoist/appcontainer/MessageSourceModel';

/**
 *  Support for hosting multiple global Messages in the DOM.
 *
 *  @private
 */
export const messageSource = hoistCmp.factory({
    displayName: 'MessageSource',
    model: uses(MessageSourceModel),

    render({model}) {
        const models = model.msgModels,
            children = models.map(m => message({model: m,  key: m.xhId}));
        return children.length ? fragment(...children) : null;
    }
});