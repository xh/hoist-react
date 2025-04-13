/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {correlationId, instance} from '@xh/hoist/admin/columns';
import {form} from '@xh/hoist/cmp/form';
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {a, div, filler, h3, hframe, placeholder, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, creates} from '@xh/hoist/core';
import {colChooserButton, exportButton} from '@xh/hoist/desktop/cmp/button';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {gridFindField} from '@xh/hoist/desktop/cmp/grid';
import {jsonInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {dateTimeSecRenderer, numberRenderer} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon/Icon';
import {ActivityDetailModel} from './ActivityDetailModel';

export const activityDetailView = hoistCmp.factory({
    model: creates(ActivityDetailModel),

    render({model, ...props}) {
        return panel({
            title: 'Track Log Entries',
            icon: Icon.list(),
            className: 'xh-admin-activity-detail',
            compactHeader: true,
            items: [grid({flex: 1}), detailRecPanel()],
            tbar: tbar(),
            ...props
        });
    }
});

const tbar = hoistCmp.factory(({model}) => {
    return toolbar(
        filler(),
        gridCountLabel({unit: 'entry'}),
        gridFindField(),
        colChooserButton(),
        exportButton()
    );
});

// Discrete outer panel to retain sizing across master/detail selection changes.
const detailRecPanel = hoistCmp.factory<ActivityDetailModel>(({model}) => {
    return panel({
        modelConfig: {
            side: 'bottom',
            defaultSize: 370
        },
        item: detailRecForm()
    });
});

const detailRecForm = hoistCmp.factory<ActivityDetailModel>(({model}) => {
    const {hasSelection, formModel} = model;
    return hasSelection
        ? form({
              fieldDefaults: {inline: true, readonlyRenderer: valOrNa},
              item: hframe(
                  div({
                      className: 'xh-admin-activity-detail__form',
                      style: {flex: 1},
                      items: [
                          h3(Icon.info(), 'Activity'),
                          formField({
                              field: 'username',
                              readonlyRenderer: username => {
                                  if (!username) return naSpan();
                                  const {impersonating} = formModel.values,
                                      impSpan = impersonating
                                          ? span({
                                                className: 'xh-text-color-accent',
                                                item: ` (impersonating ${impersonating})`
                                            })
                                          : null;
                                  return span(username, impSpan);
                              }
                          }),
                          formField({field: 'category'}),
                          formField({field: 'msg'}),
                          formField({
                              field: 'appVersion',
                              readonlyRenderer: appVersion => {
                                  if (!appVersion) return naSpan();
                                  const {appEnvironment} = formModel.values;
                                  return `${appVersion} (${appEnvironment})`;
                              }
                          }),
                          formField({
                              field: 'loadId'
                          }),
                          formField({
                              field: 'tabId'
                          }),
                          formField({
                              field: 'url',
                              readonlyRenderer: hyperlinkVal
                          }),
                          formField({
                              field: 'instance',
                              readonlyRenderer: v => instance.renderer(v, null)
                          }),
                          formField({
                              field: 'correlationId',
                              readonlyRenderer: v => correlationId.renderer(v, null)
                          }),
                          formField({
                              field: 'elapsed',
                              readonlyRenderer: numberRenderer({
                                  label: 'ms',
                                  nullDisplay: '-',
                                  formatConfig: {thousandSeparated: false, mantissa: 0}
                              })
                          }),
                          formField({
                              field: 'dateCreated',
                              readonlyRenderer: dateTimeSecRenderer({})
                          }),
                          h3(Icon.desktop(), 'Device / Browser'),
                          formField({field: 'device'}),
                          formField({field: 'browser'}),
                          formField({field: 'userAgent'})
                      ]
                  }),
                  panel({
                      flex: 1,
                      className: 'xh-border-left',
                      items: [h3(Icon.json(), 'Additional Data'), additionalDataJsonInput()]
                  })
              )
          })
        : placeholder('Select an activity tracking record to view details.');
});

const additionalDataJsonInput = hoistCmp.factory<ActivityDetailModel>(({model}) => {
    return jsonInput({
        readonly: true,
        width: '100%',
        height: '100%',
        showCopyButton: true,
        value: model.formattedData
    });
});

const valOrNa = v => (v != null ? v : naSpan());
const naSpan = () => span({item: 'N/A', className: 'xh-text-color-muted'});
const hyperlinkVal = v => (v ? a({href: v, item: v, target: '_blank'}) : '-');
