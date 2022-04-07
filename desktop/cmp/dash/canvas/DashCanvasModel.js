import {HoistModel, managed, PersistenceProvider, XH} from '@xh/hoist/core';
import {required} from '@xh/hoist/data';
import {DashCanvasViewModel, DashCanvasViewSpec} from '@xh/hoist/desktop/cmp/dash';
import {Icon} from '@xh/hoist/icon';
import {action, bindable, makeObservable, observable} from '@xh/hoist/mobx';
import {debounced, ensureUniqueBy} from '@xh/hoist/utils/js';
import {defaultsDeep, map} from 'lodash';
import {computed} from 'mobx';
import {createRef} from 'react';

/**
 * Model for a DashCanvas, representing its contents and layout state.
 *
 * ---------- !! NOTE: THIS COMPONENT IS CURRENTLY IN BETA !! ----------
 * -- Model API is under development and subject to breaking changes --
 *
 * This model provides support for managing DashCanvass, adding new views on the fly,
 * and tracking / loading state.
 *
 * State should be structured as an object containing 2 members:
 *       + [] layout - contains position params and a unique viewSpec ID (i) for each view
 *       + {Object} viewState - contains title, viewSpecId, and viewState for each view under a
 *          unique viewSpec ID key (referenced under the variable name 'i' in layout objects)
 *
 * Note that loading state will destroy and reinitialize all components. Therefore,
 * it is recommended you do so sparingly.
 *
 * e.g.
 *
 * {
 *     layout: [
 *         {w: 5, h: 2, x: 0, y: 0, i: 'xh-id-4', moved: false, static: false}
 *     ],
 *     viewState: {
 *         'xh-id-4': {
 *             title: 'Buttons',
 *             viewSpecId: 'buttons',
 *             viewState: {value: 'Button 3'}
 *         }
 *     }
 * }
 *
 * @Beta
 */
export class DashCanvasModel extends HoistModel {

    //---------------------------
    // Observable Persisted State
    //---------------------------
    /** @member {Object} */
    @computed
    get state() {
        return {
            layout: this.layout,
            viewState: this.viewState
        };
    }

    //-----------------------------
    // Observable Transient State
    //------------------------------
    /** @member {Object[]} */
    @managed @observable.ref viewModels = [];
    /** @member {Object[]} */
    @observable.ref layout = [];
    /** @member {boolean} */
    @bindable layoutLocked;
    /** @member {boolean} */
    @bindable contentLocked;
    /** @member {boolean} */
    @bindable renameLocked;
    /** @member {number} */
    @bindable columns;
    /** @member {number} */
    @bindable rowHeight;
    /** @member {boolean} */
    @bindable compact;
    /** @member {number[]} - [marginX, marginY] */
    @bindable margin;
    /** @member {number[]} - [paddingX, paddingY] */
    @bindable containerPadding;

    //------------------------
    // Immutable public properties
    //------------------------
    /** @member {DashCanvasViewSpec[]} */
    viewSpecs = [];
    /** @member {Object} */
    initialState;

    //------------------------
    // Implementation properties
    //------------------------
    /** @member {DOMElement} */
    ref = createRef();

    /**
     * ---------- !! NOTE: THIS COMPONENT IS CURRENTLY IN BETA !! ----------
     * -- Model API is under development and subject to breaking changes --
     *
     * @param {Object} c - DashCanvasModel configuration.
     * @param {DashCanvasViewSpec[]} c.viewSpecs - A collection of viewSpecs, each describing a type of view
     *      that can be displayed in this container
     * @param {Object} [c.viewSpecDefaults] - Properties to be set on all viewSpecs.  Merges deeply.
     * @param {Object} [c.initialState] - Default layout and view states for this container.
     * @param {boolean} [c.layoutLocked] - Prevent re-arranging views by dragging and dropping.
     * @param {boolean} [c.contentLocked] - Prevent adding and removing views.ocked
     * @param {boolean} [c.renameLocked] - Prevent renaming views.ked
     * @param {PersistOptions} [c.persistWith] - Options governing persistence
     * @param {number} c.columns - Total number of columns (x coordinates for views correspond with column numbers)
     * @param {number} c.rowHeight - Height of each row in pixels (y coordinates for views correspond with row numbers)
     * @param {boolean} c.compact - Whether views should "compact" vertically to condense vertical space
     * @param {number[]} c.margin - Between items [x,y] in pixels
     * @param {number} c.maxRows - Maximum number of rows permitted for this container
     * @param {number[]} c.containerPadding - Padding inside the container [x, y] in pixels
     * @param {Array} [c.extraMenuItems] - Array of RecordActions, configs or token strings, with
     *      which to create additional context menu items. Extra menu items will appear
     *      in the container's context menu below the 'Add' action, and in the 'Options' context
     *      menus for individual views within the container
     */
    constructor({
        viewSpecs,
        viewSpecDefaults,
        initialState = {layout: [], viewState: {}},
        layoutLocked = false,
        contentLocked = false,
        renameLocked = false,
        persistWith = null,
        columns = 8,
        rowHeight = 50,
        compact = true,
        margin = [10, 10],
        maxRows = Infinity,
        containerPadding = null,
        extraMenuItems
    }) {
        super();
        makeObservable(this);
        viewSpecs = viewSpecs.filter(it => !it.omit);
        ensureUniqueBy(viewSpecs, 'id');
        this.viewSpecs = viewSpecs.map(cfg => {
            return new DashCanvasViewSpec(defaultsDeep({}, cfg, viewSpecDefaults));
        });

        this.restoreState = {initialState, layoutLocked, contentLocked, renameLocked, columns,
            rowHeight, compact, margin, maxRows, containerPadding};
        this.layoutLocked = layoutLocked;
        this.contentLocked = contentLocked;
        this.renameLocked = renameLocked;
        this.columns = columns;
        this.rowHeight = rowHeight;
        this.maxRows = maxRows;
        this.containerPadding = containerPadding;
        this.maxRows = maxRows;
        this.margin = margin;
        this.containerPadding = containerPadding;
        this.compact = compact;
        this.extraMenuItems = extraMenuItems;

        // Read state from provider -- fail gently
        let persistState = null;
        if (persistWith) {
            try {
                this.provider = PersistenceProvider.create({path: 'dashCanvas', ...persistWith});
                persistState = this.provider.read();
            } catch (e) {
                console.error(e);
                XH.safeDestroy(this.provider);
                this.provider = null;
            }
        }

        this.setState(persistState?.state ?? initialState);

        this.addReaction({
            track: () => [this.state],
            run: () => this.publishState()
        });
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
        this.setColumns(restoreState.columns);
        this.setRowHeight(restoreState.rowHeight);
        this.setState(restoreState.initialState);
        this.provider?.clear();
    }

    /**
     * Adds a view to the DashCanvas
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
            model = new DashCanvasViewModel({
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

    /**
     * Remove a view from the DashCanvas
     * @param {string} id - DashCanvasViewModel id to remove from the container
     */
    @action
    removeView(id) {
        this.layout = this.layout.filter(it => it.i !== id);

        const viewModel = this.viewModels.find(it => it.id === id);
        XH.safeDestroy(viewModel);

        this.viewModels = this.viewModels.filter(it => it.id !== id);
    }

    /**
     * Rename a view in the DashCanvas
     * @param {string} id - DashCanvasViewModel id to remove from the container
     */
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

    //------------------------
    // Implementation
    //------------------------
    @action
    setState(state) {
        const {layout, viewState} = state;
        this.setLayout(layout);
        this.viewState = viewState;
    }

    @action
    setLayout(layout) {
        this.layout = layout;
    }

    @debounced(1000)
    @action
    publishState() {
        const {state} = this;
        this.provider?.write({state});
    }

    @computed
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

    set viewState(viewState) {
        XH.safeDestroy(this.viewModels);

        this.viewModels = map(viewState, (state, id) => {
            const viewSpec = this.getViewSpec(state.viewSpecId);
            return new DashCanvasViewModel({
                id,
                viewSpec,
                title: state.title ?? viewSpec.title,
                viewState: state.viewState,
                containerModel: this
            });
        });
    }

    getViewSpec(id) {
        return this.viewSpecs.find(it => it.id === id);
    }

    // Get all ViewModels with a given DashViewSpec.id
    getItemsBySpecId(id) {
        return this.viewModels.filter(it => it.viewSpec.id === id);
    }
}
