/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {grid} from '@xh/hoist/cmp/grid';
import {placeholder} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp} from '@xh/hoist/core';
import {jsonInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {DetailModel} from './DetailModel';
import './ClusterObjects.scss';

export const detailPanel = hoistCmp.factory({
    model: creates(DetailModel),

    render({model}) {
        const {instanceName, selectedAdminStats, objectName, objectType} = model;
        if (!objectName) return placeholder(Icon.grip(), 'Select an object to view details...');

        return panel({
            title: `${objectType} - ${objectName}`,
            icon: getIcon(objectType),
            compactHeader: true,
            items: [
                grid({flex: 1}),
                panel({
                    title: `Instance - ${instanceName}`,
                    omit: !instanceName,
                    compactHeader: true,
                    modelConfig: {
                        side: 'bottom',
                        defaultSize: '80%',
                        collapsible: false
                    },
                    item: jsonInput({
                        readonly: true,
                        flex: 1,
                        width: '100%',
                        height: '100%',
                        showFullscreenButton: false,
                        editorProps: {lineNumbers: false},
                        value: model.fmtStats(selectedAdminStats)
                    })
                })
            ]
        });
    }
});

const getIcon = (objType: string) => {
    switch (objType) {
        case 'Service':
            return Icon.gears();
        case 'Topic':
            return Icon.mail();
    }

    return Icon.database();
};
