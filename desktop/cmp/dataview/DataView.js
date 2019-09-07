/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {useLayoutProps, useModel, providedModel, hoistCmpAndFactory} from '@xh/hoist/core';
import {grid} from '@xh/hoist/cmp/grid';
import {getClassName} from '@xh/hoist/utils/react';
import {DataViewModel} from './DataViewModel';

/**
 * A DataView is a specialized version of the Grid component. It displays its data within a
 * single column, using a configured component for rendering each item.
 */
export const [DataView, dataView] = hoistCmpAndFactory({
    displayName: 'DataView',
    model: providedModel(DataViewModel),

    render(props) {
        const model = useModel(),
            [layoutProps] = useLayoutProps(props),
            className = getClassName('xh-data-view', props),
            {rowCls, itemHeight, onRowDoubleClicked} = props;

        return grid({
            ...layoutProps,
            className,
            model: model.gridModel,
            agOptions: {
                headerHeight: 0,
                rowClass: rowCls,
                getRowHeight: () => itemHeight
            },
            onRowDoubleClicked
        });
    }
});
DataView.propTypes = {
    /** Primary component model instance. */
    model: PT.oneOfType([PT.instanceOf(DataViewModel), PT.object])
};
