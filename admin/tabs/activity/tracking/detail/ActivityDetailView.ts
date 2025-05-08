/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {badgeRenderer} from '@xh/hoist/admin/columns';
import {form} from '@xh/hoist/cmp/form';
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {a, br, div, filler, h3, hframe, placeholder, span} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp} from '@xh/hoist/core';
import {colChooserButton, exportButton} from '@xh/hoist/desktop/cmp/button';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {gridFindField} from '@xh/hoist/desktop/cmp/grid';
import {jsonInput, textInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {dateTimeSecRenderer, numberRenderer} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon/Icon';
import {tooltip} from '@xh/hoist/kit/blueprint';
import {isNil} from 'lodash';
import {ActivityDetailModel} from './ActivityDetailModel';

export const activityDetailView = hoistCmp.factory({
    displayName: 'ActivityDetailView',
    model: creates(ActivityDetailModel),

    render({model, ...props}) {
        return panel({
            className: 'xh-admin-activity-detail',
            tbar: tbar(),
            items: [grid({flex: 1}), detailRecPanel()],
            ...props
        });
    }
});

const tbar = hoistCmp.factory<ActivityDetailModel>(({model}) => {
    const {gridModel} = model;
    return toolbar({
        compact: true,
        items: [
            filler(),
            gridCountLabel({gridModel, unit: 'entry'}),
            '-',
            gridFindField({gridModel, key: gridModel.xhId, width: 250}),
            colChooserButton({gridModel}),
            exportButton({gridModel})
        ]
    });
});

// Discrete outer panel to retain sizing across master/detail selection changes.
const detailRecPanel = hoistCmp.factory<ActivityDetailModel>(({model}) => {
    const {persistWith} = model;

    return panel({
        collapsedTitle: 'Activity Details',
        collapsedIcon: Icon.info(),
        compactHeader: true,
        modelConfig: {
            side: 'bottom',
            defaultSize: 400,
            persistWith: persistWith
                ? {...persistWith, path: `${persistWith.path}.singleActivityDetailPanel`}
                : null
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
                          formField({field: 'severity', label: 'Severity'}),
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
                              field: 'elapsed',
                              readonlyRenderer: numberRenderer({
                                  label: 'ms',
                                  nullDisplay: '-',
                                  formatConfig: {thousandSeparated: false, mantissa: 0}
                              }),
                              omit: isNil(formModel.values.elapsed)
                          }),
                          formField({
                              field: 'dateCreated',
                              readonlyRenderer: dateTimeSecRenderer({})
                          }),
                          formField({
                              field: 'correlationId',
                              readonlyRenderer: badgeRenderer,
                              omit: !formModel.values.correlationId
                          }),
                          h3(Icon.idBadge(), 'Session IDs'),
                          formField({
                              field: 'loadId',
                              readonlyRenderer: badgeRenderer,
                              omit: !formModel.values.loadId
                          }),
                          formField({
                              field: 'tabId',
                              readonlyRenderer: badgeRenderer,
                              omit: !formModel.values.tabId
                          }),
                          formField({
                              field: 'instance',
                              label: 'Server',
                              readonlyRenderer: badgeRenderer,
                              omit: !formModel.values.instance
                          }),

                          h3(Icon.desktop(), 'Client App / Browser'),
                          formField({
                              field: 'appVersion',
                              readonlyRenderer: appVersion => {
                                  if (!appVersion) return naSpan();
                                  const {appEnvironment} = formModel.values;
                                  return `${appVersion} (${appEnvironment})`;
                              }
                          }),
                          formField({field: 'device', label: 'Device'}),
                          formField({field: 'browser'}),
                          formField({field: 'userAgent'}),
                          formField({
                              field: 'url',
                              readonlyRenderer: hyperlinkVal
                          })
                      ]
                  }),
                  additionalDataPanel()
              )
          })
        : placeholder(Icon.detail(), 'Select an activity tracking record to view details.');
});

const additionalDataPanel = hoistCmp.factory<ActivityDetailModel>(({model}) => {
    const item = model.formattedData
        ? jsonInput({
              readonly: true,
              width: '100%',
              height: '100%',
              showCopyButton: true,
              value: model.formattedData
          })
        : placeholder({
              items: [
                  model.hasExtraTrackData ? Icon.filter() : null,
                  model.hasExtraTrackData
                      ? 'Additional data available, but hidden by path filter below.'
                      : 'No additional data available.'
              ]
          });

    return panel({
        flex: 1,
        className: 'xh-border-left',
        items: [
            h3(Icon.json(), 'Additional Data'),
            item,
            toolbar(
                textInput({
                    placeholder: 'Path filter(s)...',
                    leftIcon: Icon.filter({
                        intent: model.formattedDataFilterPath ? 'warning' : null
                    }),
                    commitOnChange: true,
                    enableClear: true,
                    flex: 1,
                    bind: 'formattedDataFilterPath'
                }),
                tooltip({
                    item: Icon.questionCircle({className: 'xh-margin-right'}),
                    content: span(
                        'Specify one or more dot-delimited paths to filter the JSON data displayed above.',
                        br(),
                        'Separate multiple paths that you wish to include with a | character.'
                    )
                })
            )
        ]
    });
});

const valOrNa = v => (v != null ? v : naSpan());
const naSpan = () => span({item: 'N/A', className: 'xh-text-color-muted'});
const hyperlinkVal = v => (v ? a({href: v, item: v, target: '_blank'}) : '-');
