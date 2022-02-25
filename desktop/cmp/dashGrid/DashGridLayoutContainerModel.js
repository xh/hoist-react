import {defaultsDeep, forEach} from 'lodash';
import {action, bindable, makeObservable, observable} from '@xh/hoist/mobx';
import {HoistModel, PersistenceProvider, XH} from '../../../core';
import {debounced, ensureUniqueBy} from '../../../utils/js';
import {DashViewSpec} from '../dash';
import {DashViewModel} from '../dash/DashViewModel';

export class DashGridLayoutContainerModel extends HoistModel {
    @observable.ref layout = [];
    @observable.ref viewModels = [];
    @bindable columns = 4;
    @bindable rowHeight = 50;

    /** @member {DashViewSpec[]} */
    viewSpecs = [];

    constructor({
        viewSpecDefaults,
        viewSpecs,
        persistWith = null
    }) {
        super();
        makeObservable(this);

        viewSpecs = viewSpecs.filter(it => !it.omit);
        ensureUniqueBy(viewSpecs, 'id');
        this.viewSpecs = viewSpecs.map(cfg => {
            return new DashViewSpec(defaultsDeep({}, cfg, viewSpecDefaults));
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

        if (persistState?.state) {
            const {layout, viewState} = persistState.state;
            this.layout = layout;

            const models = [];
            forEach(viewState, (state, id) => {
                const viewSpec = this.getViewSpec(state.viewSpecId);
                models.push(new DashViewModel({
                    id,
                    viewSpec,
                    // icon: state.icon ? deserializeIcon(state.icon) : viewSpec.icon, TODO
                    title: state.title ?? viewSpec.title,
                    viewState: state.viewState,
                    containerModel: this
                }));
            });
            this.viewModels = models;

            console.log('Loaded DashGridLayoutContainer state', persistState.state);
        }

        this.addReaction({
            track: () => [this.layout, this.viewState],
            run: () => this.publishState()
        });
    }

    @action
    setLayout(layout) {
        this.layout = layout;
    }

    @debounced(1000)
    @action
    publishState() {
        const {layout, viewState} = this;
        this.provider?.write({state: {layout, viewState}});
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
    addView(viewSpecId) {
        const viewSpec = this.getViewSpec(viewSpecId),
            id = `${XH.genId()}_${Date.now()}`,
            model = new DashViewModel({
                id,
                viewSpec,
                containerModel: this
            });

        this.layout = [...this.layout, {i: id, x: 0, y: 0, w: 1, h: 1}];
        this.viewModels = [...this.viewModels, model];
    }

    @action
    removeView(id) {
        this.layout = this.layout.filter(it => it.i !== id);
        this.viewModels = this.viewModels.filter(it => it.id !== id);
    }

    getViewSpec(id) {
        return this.viewSpecs.find(it => it.id === id);
    }

    // Get all ViewModels with a given DashViewSpec.id
    getItemsBySpecId(id) {
        return this.viewModels.filter(it => it.viewSpec.id === id);
    }
}
