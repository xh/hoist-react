import {Icon} from '@xh/hoist/icon';
import {action, bindable, makeObservable, observable} from '@xh/hoist/mobx';
import {defaultsDeep, forEach, isNil} from 'lodash';
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

    constructor({
        viewSpecDefaults,
        viewSpecs,
        initialState = {},
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

        const state = persistState?.state ?? initialState;
        this.setState(state);

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

    @action
    addView(viewSpecId) {
        const viewSpec = this.getViewSpec(viewSpecId),
            id = `${XH.genId()}_${Date.now()}`,
            model = new DashGridLayoutViewModel({
                id,
                viewSpec,
                containerModel: this
            }),
            h = viewSpec.initHeight,
            w = viewSpec.initWidth;

        this.layout = [...this.layout, {i: id, x: 0, y: 0, h, w}];
        this.viewModels = [...this.viewModels, model];
    }

    @action
    removeView(id) {
        this.layout = this.layout.filter(it => it.i !== id);

        const viewModel = this.viewModels.find(it => it.id === id);
        XH.safeDestroy(viewModel);

        this.viewModels = this.viewModels.filter(it => it.id !== id);
    }

    async renameView(id) {
        const view = this.viewModels.find(it => it.id === id),
            allowRename = view?.viewSpec?.allowRename;
        if (!allowRename) return;
        const newName = await XH.prompt({
            message: `Rename '${view.title}' to`,
            title: 'Rename...',
            icon: Icon.edit()
        });
        if (newName) view.title = newName;
    }

    getViewSpec(id) {
        return this.viewSpecs.find(it => it.id === id);
    }

    // Get all ViewModels with a given DashViewSpec.id
    getItemsBySpecId(id) {
        return this.viewModels.filter(it => it.viewSpec.id === id);
    }
}
