import {grid, GridModel} from '@xh/hoist/cmp/grid';
import {filler, hbox} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {
    hoistCmp,
    HoistModel,
    HoistProps,
    lookup,
    managed,
    useLocalModel,
    uses
} from '@xh/hoist/core';
import {RecordActionSpec} from '@xh/hoist/data';
import {actionCol, calcActionColWidth} from '@xh/hoist/desktop/cmp/grid';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {persistenceSaveButton} from '@xh/hoist/desktop/cmp/persistenceManager';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {popover} from '@xh/hoist/kit/blueprint';
import {capitalize, isEmpty, isNull} from 'lodash';
import {button} from '@xh/hoist/desktop/cmp/button';
import {PersistenceManagerModel} from '@xh/hoist/core/persist/persistenceManager';

export interface PersistenceGridPopoverProps extends HoistProps<PersistenceManagerModel> {
    /** True (default) to render a save button alongside the primary menu button when dirty. */
    omitTopLevelSaveButton?: boolean;
    /** True to omit the default menu component. Should be used when creating custom app-specific component */
    omitDefaultGridComponent?: boolean;
}

export const [PersistenceGridPopover, persistenceGridPopover] =
    hoistCmp.withFactory<PersistenceGridPopoverProps>({
        displayName: 'PersistenceGridPopover',
        className: 'xh-persistence-manager__menu',
        model: uses(PersistenceManagerModel),

        render({
            model,
            omitDefaultGridComponent = false,
            omitTopLevelSaveButton = false
        }: PersistenceGridPopoverProps) {
            const impl = useLocalModel(PersistenceGridPopoverModel),
                {store} = impl.gridModel;
            if (omitDefaultGridComponent) return null;
            const {selectedView, isShared, entity} = model,
                displayName = entity.displayName;
            return hbox({
                items: [
                    popover({
                        placement: 'bottom-end',
                        item: button({
                            text:
                                model.getHierarchyDisplayName(selectedView?.name) ??
                                `Default ${capitalize(displayName)}`,
                            icon: isShared ? Icon.users() : Icon.bookmark(),
                            rightIcon: Icon.chevronDown(),
                            outlined: true
                        }),
                        content: panel({
                            className: 'xh-persistence-manager',
                            compactHeader: true,
                            style: {minHeight: 100, width: 500},
                            item: grid({
                                model: impl.gridModel,
                                agOptions: {domLayout: 'autoHeight'}
                            }),
                            bbar: bbar({store})
                        })
                    }),
                    persistenceSaveButton({omit: omitTopLevelSaveButton || !model.canSave})
                ]
            });
        }
    });

const bbar = hoistCmp.factory<PersistenceManagerModel>({
    render({model, store}) {
        return toolbar(
            storeFilterField({store}),
            filler(),
            button({
                icon: Icon.home(),
                intent: 'primary',
                omit: !model.enableDefault,
                disabled: isNull(model.selectedToken),
                onClick: () => model.selectAsync(null)
            }),
            button({
                icon: Icon.gear(),
                disabled: isEmpty(model.views),
                onClick: () => model.openManageDialog()
            }),
            '-',
            button({
                tooltip: `Revert ${capitalize(model.entity.displayName)}`,
                icon: Icon.reset(),
                disabled: !model.isDirty || !model.selectedView,
                onClick: () => model.resetAsync()
            }),
            button({
                text: 'Save as...',
                icon: Icon.copy(),
                disabled: !model.selectedView,
                onClick: () => model.saveAsAsync()
            }),
            button({
                text: 'Save',
                icon: Icon.save(),
                intent: 'primary',
                disabled: !model.canSave,
                onClick: () => model.saveAsync()
            })
        );
    }
});

class PersistenceGridPopoverModel extends HoistModel {
    @lookup(PersistenceManagerModel)
    persistenceManagerModel: PersistenceManagerModel;

    @managed gridModel = this.createGridModel();

    override onLinked() {
        const {persistenceManagerModel} = this;
        this.addReaction(
            {
                track: () => this.gridModel.selectedRecord,
                run: record => {
                    if (record) {
                        persistenceManagerModel.selectAsync(record.data.token);
                    }
                }
            },
            {
                track: () => [
                    persistenceManagerModel.favorites,
                    persistenceManagerModel.selectedToken,
                    persistenceManagerModel.views
                ],
                run: () => this.loadGrid(),
                fireImmediately: true
            }
        );
    }

    private createGridModel(): GridModel {
        return new GridModel({
            groupBy: 'group',
            autosizeOptions: {mode: 'managed'},
            selModel: 'single',
            store: {fields: ['token']},
            showHover: true,
            groupSortFn: (aVal, bVal, groupField) => {
                return groupField === 'Favorites' ? -1 : aVal.localeCompare(bVal);
            },
            cellBorders: true,
            columns: [
                {
                    field: 'id',
                    renderer: v => {
                        let id = v;
                        if (typeof id === 'string') {
                            id = +id.replace('-favorite', '');
                        }
                        return this.persistenceManagerModel.selectedView?.id === id
                            ? Icon.check()
                            : null;
                    }
                },
                {field: 'name'},
                {field: 'group', hidden: true},
                {field: 'description', flex: 1},
                {
                    ...actionCol,
                    width: calcActionColWidth(1),
                    actions: [this.favoriteAction()],
                    colId: 'favAction'
                }
            ],
            hideHeaders: true,
            showGroupRowCounts: false
        });
    }

    private favoriteAction(): RecordActionSpec {
        return {
            icon: Icon.star(),
            tooltip: 'Click to add to favorites',
            displayFn: ({record}) => {
                const {favorites} = this.persistenceManagerModel;
                return {
                    className: `xh-persistence-manager__menu-item-fav ${favorites.includes(record.data.token) ? 'xh-persistence-manager__menu-item-fav--active' : ''}`,
                    icon: favorites.includes(record.data.token)
                        ? Icon.star({prefix: 'fas'})
                        : Icon.star({prefix: 'far'})
                };
            },
            actionFn: ({record}) => {
                this.persistenceManagerModel.toggleFavorite(record.data.token);
            }
        };
    }

    private loadGrid() {
        const favoriteViews = this.persistenceManagerModel.favoritedViews.map(it => ({
            ...it,
            id: `${it.id}-favorite`,
            group: 'Favorites'
        }));
        this.gridModel.loadData([...favoriteViews, ...this.persistenceManagerModel.views]);
        this.gridModel.agApi?.redrawRows();
    }
}
