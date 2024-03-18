/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {DetailsModel} from '@xh/hoist/admin/tabs/cluster/services/DetailsModel';
import {placeholder} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp, XH} from '@xh/hoist/core';
import {errorMessage} from '@xh/hoist/desktop/cmp/error';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {jsonInput} from '@xh/hoist/desktop/cmp/input';
import {Icon} from '@xh/hoist/icon';

export const detailsPanel = hoistCmp.factory({
    model: creates(DetailsModel),

    render({model}) {
        const {svcName} = model;
        return panel({
            title: svcName ? `Stats: ${svcName}` : 'Stats',
            mask: 'onLoad',
            icon: Icon.info(),
            compactHeader: true,
            modelConfig: {
                side: 'right',
                defaultSize: 450
            },
            item: svcName ? stats() : placeholder(Icon.gears(), 'Select a service.')
        });
    }
});

const stats = hoistCmp.factory<DetailsModel>({
    render({model}) {
        const {stats, lastLoadException, loadModel} = model;

        if (!loadModel.isPending && lastLoadException) {
            return errorMessage({
                error: lastLoadException,
                detailsFn: e => XH.exceptionHandler.showExceptionDetails(e)
            });
        }

        if (stats == null) return null;

        return panel(
            jsonInput({
                readonly: true,
                width: '100%',
                height: '100%',
                enableSearch: true,
                showFullscreenButton: false,
                editorProps: {lineNumbers: false},
                value: model.parent.fmtStats(stats)
            })
        );
    }
});
