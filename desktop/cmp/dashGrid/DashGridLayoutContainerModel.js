import {Icon} from '@xh/hoist/icon';
import {action, bindable, makeObservable, observable} from '@xh/hoist/mobx';
import {defaultsDeep, forEach, isNil} from 'lodash';
import {createRef} from 'react';
import {HoistModel, PersistenceProvider, XH} from '../../../core';
import {debounced, ensureUniqueBy} from '../../../utils/js';
import {DashGridLayoutViewSpec, DashGridLayoutViewModel} from '@xh/hoist/desktop/cmp/dashGrid';

export class DashGridLayoutContainerModel extends HoistModel {
    @observable.ref layout = [];
    @observable.ref viewModels = [];
    @bindable columns;
    @bindable rowHeight;
    @bindable isDraggable;
    @bindable isResizable;
    @bindable compact;

    /** @member {DashGridLayoutViewSpec[]} */
    viewSpecs = [];

    /** @member {[]} */
    initialViews;

    /** @member {DOMElement} */
    ref = createRef()

    /** @member {Object} Position for next added item **/
    nextPosition = {x: 0, y: 0};

    constructor({
        viewSpecDefaults,
        viewSpecs,
        initialViews = [],
        columns = 8,
        rowHeight = 50,
        isDraggable = true,
        isResizable = true,
        compact = true,
        persistWith = null
    }) {
        super();
        makeObservable(this);

        this.columns = columns;
        this.rowHeight = rowHeight;
        this.isDraggable = isDraggable;
        this.isResizable = isResizable;
        this.compact = compact;
        this.initialViews = initialViews;
        this.restoreState = {initialViews, columns, rowHeight};
        this.maxRows = Infinity;
        this.margin = [10, 10];
        this.containerPadding = null;


        viewSpecs = viewSpecs.filter(it => !it.omit);
        ensureUniqueBy(viewSpecs, 'id');
        this.viewSpecs = viewSpecs.map(cfg => {
            return new DashGridLayoutViewSpec(defaultsDeep({}, cfg, viewSpecDefaults));
        });

        // Read state from provider -- fail gently
        let persistState = null;
        if (persistWith) {
            try {
                this.provider = PersistenceProvider.create({path: 'dashContainer', ...persistWith});
                persistState = this.provider.read();
            } catch (e) {
                console.error(e);
                XH.safeDestroy(this.provider);
                this.provider = null;
            }
        }

        const state = persistState?.state ?? {layout: []};
        this.setState(state);

        // If no persisted state, default to the initial views
        if (!persistState?.state) this.setInitialViews();

        this.addReaction({
            track: () => [this.layout, this.viewState],
            run: () => this.publishState()
        });
    }

    get state() {
        return {
            layout: this.layout,
            viewState: this.viewState,
            columns: this.columns,
            rowHeight: this.rowHeight,
            isDraggable: this.isDraggable,
            isResizable: this.isResizable,
            compact: this.compact
        };
    }

    @action
    setState(state) {
        const {
            layout = {},
            viewState = {},
            columns,
            rowHeight,
            isDraggable,
            isResizable,
            compact
        } = state;

        if (!isNil(columns)) this.columns = columns;
        if (!isNil(rowHeight)) this.rowHeight = rowHeight;
        if (!isNil(isDraggable)) this.isDraggable = isDraggable;
        if (!isNil(isResizable)) this.isResizable = isResizable;
        if (!isNil(compact)) this.compact = compact;

        this.setLayout(layout);
        this.setViewState(viewState);
    }

    @debounced(1000)
    @action
    publishState() {
        const {state} = this;
        this.provider?.write({state});
    }

    @action
    setLayout(layout) {
        this.layout = layout;
    }

    get viewState() {
        const ret = {};
        this.viewModels.map(({id, viewSpec, icon, title, viewState}) => {
            ret[id] = {
                // icon: icon ? convertIconToHtml(icon) : null, TODO
                viewSpecId: viewSpec.id,
                title,
                viewState
            };
        });
        return ret;
    }

    @action
    setViewState(viewState) {
        XH.safeDestroy(this.viewModels);

        const models = [];
        forEach(viewState, (state, id) => {
            const viewSpec = this.getViewSpec(state.viewSpecId);
            models.push(new DashGridLayoutViewModel({
                id,
                viewSpec,
                // icon: state.icon ? deserializeIcon(state.icon) : viewSpec.icon, TODO
                title: state.title ?? viewSpec.title,
                viewState: state.viewState,
                containerModel: this
            }));
        });

        this.viewModels = models;
    }

    /**
     * Adds a view to the DashGridLayoutContainer
     * @param {string} viewSpecId
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     */
    @action
    addView(viewSpecId, {x, y, width, height} = {}) {
        const viewSpec = this.getViewSpec(viewSpecId),
            id = `${XH.genId()}_${Date.now()}`,
            model = new DashGridLayoutViewModel({
                id,
                viewSpec,
                containerModel: this
            }),
            h = height || viewSpec.initHeight,
            w = width || viewSpec.initWidth;
        this.layout = [...this.layout, {i: id, x: x || 0, y: y || 0, h, w}];
        this.viewModels = [...this.viewModels, model];
    }

    @action
    removeView(id) {
        this.layout = this.layout.filter(it => it.i !== id);

        const viewModel = this.viewModels.find(it => it.id === id);
        XH.safeDestroy(viewModel);

        this.viewModels = this.viewModels.filter(it => it.id !== id);
    }

    @action
    removeAllViews() {
        this.layout = [];
        for (let viewModel of this.viewModels) {
            XH.safeDestroy(viewModel);
        }
        this.viewModels = [];
    }

    async renameView(id) {
        const view = this.viewModels.find(it => it.id === id),
            allowRename = view?.viewSpec?.allowRename;
        if (!allowRename) return;
        const newName = await XH.prompt({
            message: `Rename '${view.title}' to`,
            title: 'Rename...',
            icon: Icon.edit(),
            input: {
                initialValue: view.title
            }
        });
        if (newName) view.setTitle(newName);
    }

    getViewSpec(id) {
        return this.viewSpecs.find(it => it.id === id);
    }

    // Get all ViewModels with a given DashViewSpec.id
    getItemsBySpecId(id) {
        return this.viewModels.filter(it => it.viewSpec.id === id);
    }

    setInitialViews() {
        this.removeAllViews();
        this.initialViews.forEach(view => {
            const {id, x, y, width, height} = view;
            this.addView(id, {x, y, width, height});
        });
    }

    /**
     * Restore the initial state as specified by the application at construction time. This is the
     * state without any persisted state or user changes applied.
     *
     * This method will clear the persistent state saved for this component, if any.
     */
    restoreDefaults() {
        const {columns, rowHeight} = this.restoreState;
        this.setColumns(columns);
        this.setRowHeight(rowHeight);
        this.setInitialViews();
        this.provider?.clear();
    }

    //------------------------
    // Implementation
    //------------------------
    /**
     * Used to set the {x, y} position for the next added item based on the mouse location when
     * context menu is triggered
     * @param {number} x - clientX position
     * @param {number} y - clientY position
     */
    setNextPosition(x, y) {
        const calcXY = (positionParams, top, left, w=0, h=0) => {
            const calcGridColWidth = (positionParams) => {
                const { margin, containerPadding, containerWidth, cols } = positionParams;
                return (
                    (containerWidth - margin[0] * (cols - 1) - containerPadding[0] * 2) / cols
                );
            };

            const clamp = (num, lowerBound, upperBound) =>
                Math.max(Math.min(num, upperBound), lowerBound);

            const {margin, cols, rowHeight, maxRows} = positionParams;
            const colWidth = calcGridColWidth(positionParams);
            let x = Math.round((left - margin[0]) / (colWidth + margin[0]));
            let y = Math.round((top - margin[1]) / (rowHeight + margin[1]));

            x = clamp(x, 0, cols - w);
            y = clamp(y, 0, maxRows - h);
            return { x, y };
        };

        const {margin, columns: cols, rowHeight, maxRows, ref, containerPadding} = this,
            containerPosition = ref.current.getBoundingClientRect(),
            {left: containerLeft, top: containerTop, width: containerWidth} = containerPosition,
            positionParams = {margin, cols, rowHeight, maxRows,
                containerPadding: containerPadding ?? margin, containerWidth},
            left = x - containerLeft,
            top = y - containerTop;

        this.nextPosition = calcXY(positionParams, top, left);
    }
}
