/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {DetailsModel} from '@xh/hoist/admin/tabs/cluster/instances/services/DetailsModel';
import {placeholder} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp, XH} from '@xh/hoist/core';
import {errorMessage} from '@xh/hoist/cmp/error';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {jsonInput} from '@xh/hoist/desktop/cmp/input';
import {Icon} from '@xh/hoist/icon';
import {isEmpty} from 'lodash';
import {fmtJson, timestampReplacer} from '@xh/hoist/format';

export const detailsPanel = hoistCmp.factory({
    model: creates(DetailsModel),

    render({model}) {
        const {svcName} = model;
        return panel({
            title: svcName ?? 'Stats',
            mask: 'onLoad',
            icon: Icon.info(),
            compactHeader: true,
            modelConfig: {
                side: 'right',
                defaultSize: 450
            },
            item: svcName ? stats() : placeholder(Icon.gears(), 'Select a service')
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

        return isEmpty(stats)
            ? placeholder(
                  ...(loadModel.isPending
                      ? []
                      : [Icon.questionCircle(), 'This service does not report any admin stats.'])
              )
            : panel(
                  jsonInput({
                      readonly: true,
                      width: '100%',
                      height: '100%',
                      enableSearch: true,
                      showFullscreenButton: false,
                      lineNumbers: false,
                      value: fmtJson(stats, {replacer: timestampReplacer()})
                  })
              );
    }
});
