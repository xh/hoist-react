/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {hoistComponentFactory, useProvidedModel} from '@xh/hoist/core';
import {fragment} from '@xh/hoist/cmp/layout';
import {message} from './Message';
import {MessageSourceModel} from '@xh/hoist/core/appcontainer/MessageSourceModel';

/**
 *  Support for publishing multiple Messages in the DOM.
 *
 *  @private
 */
export const messageSource = hoistComponentFactory(
    (props) => {
        const model = useProvidedModel(MessageSourceModel, props),
            models = model.msgModels,
            children = models.map(model => message({model, key: model.xhId}));
        return children.length ? fragment(...children) : null;
    }
);
