import {roleGraph} from '@xh/hoist/admin/tabs/general/roles/graph/RoleGraph';
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler, fragment, hframe, vframe} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {errorMessage} from '@xh/hoist/desktop/cmp/error';
import {filterChooser} from '@xh/hoist/desktop/cmp/filter';
import {switchInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {recordActionBar} from '@xh/hoist/desktop/cmp/record';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {roleDetails} from './details/RoleDetails';
import {roleEditor} from './editor/RoleEditor';
import {RoleModel} from './RoleModel';

export const rolePanel = hoistCmp.factory({
    displayName: 'Roles',
    model: creates(RoleModel),
    render({className, model}) {
        const {moduleConfig} = model;
        if (!moduleConfig) return null;
        if (!moduleConfig.enabled) {
            return errorMessage({error: 'Default Role Module not enabled.'});
        }

        const {gridModel, isFilterChooserVisible, readonly} = model;
        return fragment(
            panel({
                className,
                mask: 'onLoad',
                tbar: [
                    recordActionBar({
                        actions: [model.addAction()],
                        gridModel,
                        omit: readonly,
                        selModel: gridModel.selModel
                    }),
                    filler(),
                    gridCountLabel({unit: 'role'}),
                    '-',
                    button({
                        icon: isFilterChooserVisible
                            ? Icon.filterSlash({prefix: 'fas'})
                            : Icon.filter(),
                        onClick: () => model.toggleFilterChooserVisibility()
                    }),
                    '-',
                    switchInput({
                        bind: 'groupByCategory',
                        label: 'Group By Category',
                        labelSide: 'left'
                    })
                ],
                items: [
                    toolbar({
                        omit: !isFilterChooserVisible,
                        items: [
                            filterChooser({enableClear: false, flex: 1}),
                            button({
                                icon: Icon.close(),
                                onClick: () => model.toggleFilterChooserVisibility()
                            })
                        ]
                    }),
                    hframe(vframe(grid(), roleGraph()), detailsPanel())
                ]
            }),
            roleEditor()
        );
    }
});

const detailsPanel = hoistCmp.factory<RoleModel>(({model}) =>
    panel({
        compactHeader: true,
        icon: Icon.idBadge(),
        title: model.selectedRole?.name ? `Details - ${model.selectedRole?.name}` : 'Details',
        item: roleDetails(),
        bbar: toolbar({
            items: [
                filler(),
                recordActionBar({
                    actions: [model.editAction()],
                    gridModel: model.gridModel,
                    selModel: model.gridModel.selModel,
                    omit: model.readonly
                })
            ],
            omit: !model.selectedRole
        }),
        modelConfig: {
            defaultSize: '30%',
            minSize: 550,
            modalSupport: true,
            persistWith: {...RoleModel.PERSIST_WITH, path: 'detailsPanel'},
            side: 'right'
        }
    })
);
