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
import {ActivityDetailModel} from './ActivityDetailModel';

export const activityDetailView = hoistCmp.factory({
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
            gridCountLabel({unit: 'entry'}),
            '-',
            // TODO - these don't react properly to swapping out grid model
            gridFindField({gridModel}),
            colChooserButton({gridModel}),
            exportButton()
        ]
    });
});

// Discrete outer panel to retain sizing across master/detail selection changes.
const detailRecPanel = hoistCmp.factory<ActivityDetailModel>(({model}) => {
    return panel({
        collapsedTitle: 'Activity Details',
        collapsedIcon: Icon.info(),
        compactHeader: true,
        modelConfig: {
            side: 'bottom',
            defaultSize: 400,
            persistWith: {
                ...model.activityTrackingModel.persistWith,
                path: 'singleActivityDetailPanel'
            }
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
                              field: 'loadId',
                              readonlyRenderer: badgeRenderer
                          }),
                          formField({
                              field: 'tabId',
                              readonlyRenderer: badgeRenderer
                          }),
                          formField({
                              field: 'url',
                              readonlyRenderer: hyperlinkVal
                          }),
                          formField({
                              field: 'instance',
                              readonlyRenderer: badgeRenderer
                          }),
                          formField({
                              field: 'correlationId',
                              readonlyRenderer: badgeRenderer
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
                  additionalDataPanel()
              )
          })
        : placeholder(Icon.detail(), 'Select an activity tracking record to view details.');
});

const additionalDataPanel = hoistCmp.factory<ActivityDetailModel>(({model}) => {
    return panel({
        flex: 1,
        className: 'xh-border-left',
        items: [
            h3(Icon.json(), 'Additional Data'),
            jsonInput({
                readonly: true,
                width: '100%',
                height: '100%',
                showCopyButton: true,
                value: model.formattedData
            }),
            toolbar({
                compact: true,
                items: [
                    textInput({
                        placeholder: 'Path filter(s)...',
                        leftIcon: Icon.filter(),
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
                ]
            })
        ]
    });
});

const valOrNa = v => (v != null ? v : naSpan());
const naSpan = () => span({item: 'N/A', className: 'xh-text-color-muted'});
const hyperlinkVal = v => (v ? a({href: v, item: v, target: '_blank'}) : '-');
