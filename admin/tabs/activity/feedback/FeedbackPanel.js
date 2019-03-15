/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {hoistComponent, useLocalModel} from '@xh/hoist/core';
import {restGrid} from '@xh/hoist/desktop/cmp/rest';
import {FeedbackPanelModel} from './FeedbackPanelModel';

export const [FeedbackPanel, feedbackPanel] = hoistComponent({
    render() {
        const model = useLocalModel(FeedbackPanelModel);
        return restGrid({model: model.gridModel});
    }
});