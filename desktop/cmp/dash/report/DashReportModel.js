import {HoistModel, managed, PersistenceProvider, XH} from '@xh/hoist/core';
import {required} from '@xh/hoist/data';
import {DashReportViewModel, DashReportViewSpec} from '@xh/hoist/desktop/cmp/dash';
import {Icon} from '@xh/hoist/icon';
import {action, bindable, makeObservable, observable} from '@xh/hoist/mobx';
import {debounced, ensureUniqueBy} from '@xh/hoist/utils/js';
import {defaultsDeep, map} from 'lodash';
import {createRef} from 'react';

export class DashReportModel extends HoistModel {
    @observable.ref layout = [];
    @managed @observable.ref viewModels = [];
    @bindable columns;
    @bindable rowHeight;
    @bindable isDraggable;
    @bindable isResizable;
    @bindable compact;
    /** @member {number[]} - [marginX, marginY] */
    @bindable margin;
    /** @member {number[]} - [paddingX, paddingY] */
    @bindable containerPadding;

    /** @member {DashReportViewSpec[]} */
    viewSpecs = [];

    /** @member {[]} */
    initialViews;

    /** @member {DOMElement} */
    ref = createRef();


    constructor({
        viewSpecDefaults,
        viewSpecs,
        initialViews = [],
        columns = 8,
        rowHeight = 50,
        isDraggable = true,
        isResizable = true,
        compact = true,
        persistWith = null,
        margin = [10, 10],
        maxRows = Infinity,
        containerPadding = null,
        extraMenuItems
    }) {
        super();
        makeObservable(this);

        this.columns = columns;
        this.rowHeight = rowHeight;
        this.isDraggable = isDraggable;
        this.isResizable = isResizable;
        this.compact = compact;
        this.initialViews = initialViews;
        this.maxRows = maxRows;
        this.margin = margin;
        this.containerPadding = containerPadding;

        this.restoreState = {initialViews, columns, rowHeight};

        this.extraMenuItems = extraMenuItems;
        viewSpecs = viewSpecs.filter(it => !it.omit);
        ensureUniqueBy(viewSpecs, 'id');
        this.viewSpecs = viewSpecs.map(cfg => {
            return new DashReportViewSpec(defaultsDeep({}, cfg, viewSpecDefaults));
        });

        // Read state from provider -- fail gently
        let persistState = null;
        if (persistWith) {
            try {
                this.provider = PersistenceProvider.create({path: 'dashReport', ...persistWith});
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
        if (!persistState?.state) this.restoreInitialViews();

        this.addReaction({
            track: () => [this.layout, this.viewState],
            run: () => this.publishState()
        });
    }

    get state() {
        return {
            layout: this.layout,
            viewState: this.viewState
        };
    }

    @action
    setState(state) {
        const {layout = {}, viewState = {}} = state;
        this.setLayout(layout);
        this.setViewState(viewState);
    }

    @debounced(1000)
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
        this.viewModels.forEach(({id, viewSpec, title, viewState}) => {
            ret[id] = {
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

        this.viewModels = map(viewState, (state, id) => {
            const viewSpec = this.getViewSpec(state.viewSpecId);
            new DashReportViewModel({
                id,
                viewSpec,
                title: state.title ?? viewSpec.title,
                viewState: state.viewState,
                containerModel: this
            });
        });
    }

    /**
     * Adds a view to the DashReport
     * @param {string} viewSpecId
     * @param {number} x
     * @param {number} y
     * @param {number} [w]
     * @param {number} [h]
     * @param {Object} viewState
     * @param {string} title
     */
    @action
    addView(viewSpecId, {x, y, w, h, viewState, title} = {}) {
        const viewSpec = this.getViewSpec(viewSpecId),
            id = `${XH.genId()}_${Date.now()}`,
            model = new DashReportViewModel({
                id,
                viewSpec,
                viewState,
                title,
                containerModel: this
            });

        x = x ?? 0;
        y = y ?? 0;
        h = h ?? viewSpec.height;
        w = w ?? viewSpec.width;

        this.layout = [...this.layout, {i: id, x, y, h, w}];
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
        XH.safeDestroy(this.viewModels);
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
                initialValue: view.title,
                rules: [required]
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

    restoreInitialViews() {
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
        this.restoreInitialViews();
        this.provider?.clear();
    }
}
