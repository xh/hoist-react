/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {Persistable, PersistableState, PersistenceProvider, XH} from '@xh/hoist/core';
import {required} from '@xh/hoist/data';
import {DashCanvasViewModel, DashCanvasViewSpec, DashConfig, DashViewState, DashModel} from '../';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {action, makeObservable, computed, observable, bindable} from '@xh/hoist/mobx';
import {ensureUniqueBy, throwIf} from '@xh/hoist/utils/js';
import {isOmitted} from '@xh/hoist/utils/impl';
import {createObservableRef} from '@xh/hoist/utils/react';
import {
    defaultsDeep,
    find,
    uniqBy,
    times,
    without,
    some,
    sortBy,
    pick,
    isEqual,
    startCase
} from 'lodash';

export interface DashCanvasConfig extends DashConfig<DashCanvasViewSpec, DashCanvasItemState> {
    /**
     * Total number of columns (x coordinates for views correspond with column numbers).
     * Default `12`.
     */
    columns?: number;

    /**
     * Height of each row in pixels (y coordinates for views correspond with row numbers).
     * Default `50`.
     */
    rowHeight?: number;

    /** Whether views should "compact" vertically to condense vertical space. Default `true`. */
    compact?: boolean;

    /** Between items [x,y] in pixels. Default `[10, 10]`. */
    margin?: [number, number];

    /** Maximum number of rows permitted for this container. Default `Infinity`. */
    maxRows?: number;

    /** Padding inside the container [x, y] in pixels. Defaults to same as `margin`. */
    containerPadding?: [number, number];
}

export interface DashCanvasItemState {
    layout: DashCanvasItemLayout;
    title?: string;
    viewSpecId: string;
    state?: DashViewState;
}

export interface DashCanvasItemLayout {
    x: number;
    y: number;
    w: number;
    h: number;
}

/**
 * Model for {@link DashCanvas}, managing all configurable options for the component and publishing
 * the observable state of its current widgets and their layout.
 */
export class DashCanvasModel
    extends DashModel<DashCanvasViewSpec, DashCanvasItemState, DashCanvasViewModel>
    implements Persistable<{state: DashCanvasItemState[]}>
{
    //-----------------------------
    // Settable State
    //------------------------------
    @bindable columns: number;
    @bindable rowHeight: number;
    @bindable compact: boolean;
    @bindable.ref margin: [number, number]; // [x, y]
    @bindable.ref containerPadding: [number, number]; // [x, y]

    //-----------------------------
    // Public properties
    //-----------------------------
    maxRows: number;

    /** Current number of rows in canvas */
    get rows(): number {
        return this.layout.reduce((prev, cur) => Math.max(prev, cur.y + cur.h), 0);
    }

    get isEmpty(): boolean {
        return this.layout.length === 0;
    }

    //----------------------------
    // Implementation properties
    //----------------------------
    @observable.ref layout: any[] = [];
    ref = createObservableRef<HTMLElement>();
    isResizing: boolean;
    private isLoadingState: boolean;

    get rglLayout() {
        return this.layout.map(it => {
            const dashCanvasView = this.getView(it.i),
                {autoHeight, viewSpec} = dashCanvasView;

            return {
                ...it,
                resizeHandles: autoHeight
                    ? ['w', 'e']
                    : ['s', 'w', 'e', 'n', 'sw', 'nw', 'se', 'ne'],
                maxH: viewSpec.maxHeight,
                minH: viewSpec.minHeight,
                maxW: viewSpec.maxWidth,
                minW: viewSpec.minWidth
            };
        });
    }

    constructor({
        viewSpecs,
        viewSpecDefaults,
        initialState = [],
        layoutLocked = false,
        contentLocked = false,
        renameLocked = false,
        persistWith = null,
        emptyText = 'No views have been added.',
        addViewButtonText = 'Add View',
        columns = 12,
        rowHeight = 50,
        compact = true,
        margin = [10, 10],
        maxRows = Infinity,
        containerPadding = margin,
        extraMenuItems
    }: DashCanvasConfig) {
        super();
        makeObservable(this);
        viewSpecs = viewSpecs.filter(it => !isOmitted(it));
        ensureUniqueBy(viewSpecs, 'id');
        this.viewSpecs = viewSpecs.map(cfg => {
            return defaultsDeep({}, cfg, viewSpecDefaults, {
                title: startCase(cfg.id),
                omit: false,
                unique: false,
                allowAdd: true,
                allowDuplicate: true,
                allowRemove: true,
                allowRename: true,
                height: 5,
                width: 5,
                hidePanelHeader: false,
                hideMenuButton: false,
                autoHeight: false
            });
        });

        this.restoreState = {
            initialState,
            layoutLocked,
            contentLocked,
            renameLocked,
            columns,
            rowHeight,
            compact,
            margin,
            maxRows,
            containerPadding
        };
        this.layoutLocked = layoutLocked;
        this.contentLocked = contentLocked;
        this.renameLocked = renameLocked;
        this.columns = columns;
        this.rowHeight = rowHeight;
        this.maxRows = maxRows;
        this.containerPadding = containerPadding;
        this.margin = margin;
        this.containerPadding = containerPadding;
        this.compact = compact;
        this.emptyText = emptyText;
        this.addViewButtonText = addViewButtonText;
        this.extraMenuItems = extraMenuItems;

        this.loadState(initialState);
        this.state = this.buildState();

        if (persistWith) {
            PersistenceProvider.create({
                persistOptions: {
                    path: 'dashCanvas',
                    ...persistWith
                },
                target: this
            });
        }

        this.addReaction({
            track: () => this.viewState,
            run: () => (this.state = this.buildState())
        });
    }

    /** Removes all views from the canvas */
    @action
    clear() {
        const {viewModels} = this;
        this.viewModels = [];
        this.setLayout([]);

        XH.safeDestroy(viewModels);
    }

    /**
     * Restore the initial state as specified by the application at construction time. This is the
     * state without any persisted state or user changes applied.
     *
     * This method will clear the persistent state saved for this component, if any.
     */
    @action
    restoreDefaults() {
        const {restoreState} = this;
        this.layoutLocked = restoreState.layoutLocked;
        this.contentLocked = restoreState.contentLocked;
        this.renameLocked = restoreState.renameLocked;
        this.columns = restoreState.columns;
        this.rowHeight = restoreState.rowHeight;
        this.loadState(restoreState.initialState);
    }

    /**
     * Adds a view to the DashCanvas
     * @param specId - DashCanvasViewSpec id to add to the container
     * @param opts - additional options. Note `position` will accept another view's ID in addition
     *      to the enumerated values: the new view will be added in that view's current position.
     */
    @action
    addView(
        specId: string,
        opts: {
            title?: string;
            position?: 'first' | 'last' | 'nextAvailable' | string;
            state?: any;
            width?: number;
            height?: number;
        } = {}
    ): DashCanvasViewModel {
        const {title, position = 'nextAvailable', state, width, height} = opts;
        const layout = {
            ...this.getLayoutFromPosition(position, specId),
            w: width,
            h: height
        };
        return this.addViewInternal(specId, {title, layout, state});
    }

    /**
     * Remove a view from the DashCanvas
     * @param id - DashCanvasViewModel id to remove from the container
     */
    @action
    removeView(id: string) {
        const removeLayout = this.getViewLayout(id),
            removeView = this.getView(id);

        this.setLayout(without(this.layout, removeLayout));
        this.viewModels = without(this.viewModels, removeView);
        XH.safeDestroy(removeView);
    }

    /**
     * Replace a view in the DashCanvas with a different view, keeping the existing layout
     * @param id - id of view model to be replaced
     * @param newSpecId - id of view spec to insert
     */
    @action
    replaceView(id: string, newSpecId: string) {
        const layout = this.getViewLayout(id);
        this.removeView(id);
        this.addViewInternal(newSpecId, {layout});
    }

    /** Rename a view in the DashCanvas. */
    renameView(id: string) {
        const view = this.getView(id),
            allowRename = view?.viewSpec?.allowRename && !this.renameLocked;

        if (!allowRename) return;

        XH.prompt<string>({
            message: `Rename '${view.title}' to`,
            title: 'Rename...',
            icon: Icon.edit(),
            input: {
                initialValue: view.title,
                rules: [required]
            }
        }).then(newName => {
            if (newName) view.title = newName;
        });
    }

    /** Scrolls a DashCanvasView into view. */
    ensureViewVisible(id: string) {
        this.getView(id)?.ensureVisible();
    }

    //------------------------
    // Persistable Interface
    //------------------------
    getPersistableState(): PersistableState<{state: DashCanvasItemState[]}> {
        return new PersistableState({state: this.state});
    }

    setPersistableState(persistableState: PersistableState<{state: DashCanvasItemState[]}>) {
        const {state} = persistableState.value;
        if (state) this.loadState(state);
    }

    //------------------------
    // Implementation
    //------------------------
    private getLayoutFromPosition(position: string, specId: string) {
        switch (position) {
            case 'first':
                return {x: 0, y: -1};
            case 'last':
                return {x: 0, y: this.rows};
            case 'nextAvailable':
                return this.getNextAvailablePosition(this.getSpec(specId));
            default: {
                const previousView = this.getViewLayout(position);
                throwIf(
                    !previousView,
                    `Position must be either 'first', 'last', 'nextAvailable' or a valid viewId`
                );
                const {x, y} = previousView;
                return {x, y};
            }
        }
    }

    @action
    private addViewInternal(specId: string, {layout, title, state, previousViewId}: any) {
        const viewSpec = this.getSpec(specId),
            instances = this.getViewsBySpecId(specId);

        throwIf(
            !viewSpec,
            `Trying to add non-existent or omitted DashCanvasViewSpec. id=${specId}`
        );
        throwIf(
            !viewSpec.allowAdd,
            `Trying to add DashCanvasViewSpec with allowAdd=false. id=${specId}`
        );
        throwIf(
            viewSpec.unique && instances.length,
            `Trying to add multiple instances of a DashCanvasViewSpec with unique=true. id=${specId}`
        );

        const id = this.genViewId(),
            model = new DashCanvasViewModel({
                id,
                viewSpec,
                viewState: state,
                title: title ?? viewSpec.title,
                containerModel: this
            }),
            prevLayout = previousViewId ? this.getViewLayout(previousViewId) : null,
            x = prevLayout?.x ?? layout?.x ?? 0,
            y = prevLayout?.y ?? layout?.y ?? this.rows,
            h = layout?.h ?? viewSpec.height ?? viewSpec.minHeight ?? 1,
            w = layout?.w ?? viewSpec.width ?? viewSpec.minWidth ?? 1;

        this.setLayout([...this.layout, {i: id, x, y, h, w}]);
        this.viewModels = [...this.viewModels, model];
        return model;
    }

    onRglLayoutChange(rglLayout) {
        rglLayout = rglLayout.map(it => pick(it, ['i', 'x', 'y', 'w', 'h']));
        this.setLayout(rglLayout);
    }

    @action
    private setLayout(layout) {
        layout = sortBy(layout, 'i');
        const layoutChanged = !isEqual(layout, this.layout);
        if (!layoutChanged) return;

        this.layout = layout;
        if (!this.isLoadingState) this.state = this.buildState();
    }

    @action
    private loadState(state: DashCanvasItemState[]) {
        this.isLoadingState = true;
        try {
            this.clear();
            state.forEach(state => {
                // Fail gracefully on unknown viewSpecId - persisted state could ref. an obsolete widget.
                const {viewSpecId} = state;
                if (this.hasSpec(viewSpecId)) {
                    this.addViewInternal(viewSpecId, state);
                } else {
                    this.logWarn(`Unknown viewSpecId [${viewSpecId}] found in state - skipping.`);
                }
            });
        } finally {
            this.isLoadingState = false;
        }
    }

    private buildState(): DashCanvasItemState[] {
        const {viewState} = this;

        return this.layout.map(it => {
            const {i: viewId, x, y, w, h} = it,
                state = viewState[viewId];

            return {
                layout: {x, y, w, h},
                ...state
            };
        });
    }

    private genViewId() {
        return `${XH.genId()}_${Date.now()}`;
    }

    @computed.struct
    private get viewState() {
        const ret = {};
        this.viewModels.forEach(({id, viewSpec, title, viewState}) => {
            ret[id] = {
                viewSpecId: viewSpec.id,
                title,
                state: viewState
            };
        });
        return ret;
    }

    private getView(id: string) {
        return find(this.viewModels, {id});
    }

    private getViewLayout(id: string) {
        return find(this.layout, {i: id});
    }

    private setViewLayout(layout) {
        this.setLayout(uniqBy([layout, ...this.layout], 'i'));
    }

    private getSpec(id) {
        return find(this.viewSpecs, {id});
    }

    private hasSpec(id) {
        return some(this.viewSpecs, {id});
    }

    private getViewsBySpecId(id) {
        return this.viewModels.filter(it => it.viewSpec.id === id);
    }

    private getNextAvailablePosition({
        width,
        height,
        startX = 0,
        startY = 0,
        defaultX = 0,
        endY = null
    }: any) {
        const {rows, columns} = this,
            occupied = times(columns, () => Array(rows).fill(false));

        // Fill 2D array 'occupied' with true / false if coordinate is occupied
        for (let item of this.layout) {
            for (let y = item.y; y < item.y + item.h; y++) {
                for (let x = item.x; x < item.x + item.w; x++) {
                    occupied[x][y] = true;
                }
            }
        }
        const checkPosition = (originX, originY) => {
            for (let y = originY; y < originY + height; y++) {
                for (let x = originX; x < originX + width; x++) {
                    if (y === rows) return true;
                    if (occupied[x][y]) return false;
                }
            }
            return true;
        };

        // Traverse 2D array of coordinates, and check if view fits
        for (let y = startY; y < (endY ?? rows); y++) {
            for (let x = y === startY ? startX : 0; x < columns; x++) {
                if (x + width > columns) break;
                if (checkPosition(x, y)) {
                    return {x, y};
                }
            }
        }

        return {x: defaultX, y: endY ?? rows};
    }
}
