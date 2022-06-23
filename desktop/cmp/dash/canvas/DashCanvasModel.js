import {HoistModel, managed, PersistenceProvider, XH} from '@xh/hoist/core';
import {required} from '@xh/hoist/data';
import {DashCanvasViewModel, DashCanvasViewSpec} from '@xh/hoist/desktop/cmp/dash';
import {Icon} from '@xh/hoist/icon';
import {action, bindable, makeObservable, observable} from '@xh/hoist/mobx';
import {ensureUniqueBy, throwIf} from '@xh/hoist/utils/js';
import {createObservableRef} from '@xh/hoist/utils/react';
import {defaultsDeep, find, isEqual, times, without} from 'lodash';
import {computed} from 'mobx';

/**
 * Model for {@see DashCanvas}, managing all configurable options for the component and publishing
 * the observable state of its current widgets and their layout.
 */
export class DashCanvasModel extends HoistModel {

    //---------------------------
    // Observable Persisted State
    //---------------------------
    /** @member {DashCanvasItemState[]} */
    @observable.ref state;

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

    /** @returns {number} - current number of rows in canvas */
    get rows() {
        return this.layout.reduce((prev, cur) => Math.max(prev, cur.y + cur.h), 0);
    }

    //------------------------
    // Immutable public properties
    //------------------------
    /** @member {DashCanvasViewSpec[]} */
    viewSpecs = [];
    /** @member {string} */
    emptyText;
    /** @member {string} */
    addViewButtonText;


    //------------------------
    // Implementation properties
    //------------------------
    /** @member {RefObject<DOMElement>} */
    ref = createObservableRef();
    /** @member {boolean} */
    scrollbarVisible;

    /**
     * @param {Object} c - DashCanvasModel configuration.
     * @param {DashCanvasViewSpec[]} c.viewSpecs - A collection of viewSpecs, each describing a
     *      type of view that can be displayed in this container
     * @param {Object} [c.viewSpecDefaults] - Properties to be set on all viewSpecs. Merges deeply.
     * @param {DashCanvasItemState[]} [c.initialState] - Default state for this container.
     * @param {boolean} [c.layoutLocked] - Prevent re-arranging views by dragging and dropping.
     * @param {boolean} [c.contentLocked] - Prevent adding and removing views.
     * @param {boolean} [c.renameLocked] - Prevent renaming views.
     * @param {PersistOptions} [c.persistWith] - Options governing persistence
     * @param {number} c.columns - Total number of columns (x coordinates for views correspond with column numbers)
     * @param {number} c.rowHeight - Height of each row in pixels (y coordinates for views correspond with row numbers)
     * @param {boolean} c.compact - Whether views should "compact" vertically to condense vertical space
     * @param {number[]} c.margin - Between items [x,y] in pixels
     * @param {number} c.maxRows - Maximum number of rows permitted for this container
     * @param {number[]} c.containerPadding - Padding inside the container [x, y] in pixels
     * @param {string} [c.emptyText] - text to display when the container is empty
     * @param {string} [c.addViewButtonText] - text to display on the add view button
     * @param {Array} [c.extraMenuItems] - Array of RecordActions, configs or token strings, with
     *      which to create additional context menu items. Extra menu items will appear
     *      in the container's context menu below the 'Add' action, and in the 'Options' context
     *      menus for individual views within the container
     */
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

        this.restoreState = {
            initialState, layoutLocked, contentLocked, renameLocked, columns,
            rowHeight, compact, margin, maxRows, containerPadding
        };
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
        this.emptyText = emptyText;
        this.addViewButtonText = addViewButtonText;
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

        this.loadState(persistState?.state ?? initialState);
        this.state = this.buildState();

        this.addReaction({
            track: () => [this.viewState, this.layout],
            run: () => this.publishState()
        });

        this.addReaction({
            when: () => this.ref.current,
            run: () => {
                const {current: node} = this.ref;
                this.scrollbarVisible = node.offsetWidth > node.clientWidth;
            }
        });
    }

    /** @returns {boolean} */
    get isEmpty() {
        return this.layout.length === 0;
    }

    /** Removes all views from the canvas */
    @action
    clear() {
        const {viewModels} = this;
        this.viewModels = [];
        this.layout = [];

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
        this.provider?.clear();
    }

    /**
     * Adds a view to the DashCanvas
     * @param {string} specId - DashCanvasViewSpec id to add to the container
     * @param {string} [title] - title for the view
     * @param {string} [position] - 'first', 'last', 'nextAvailable', or 'previousViewId'
     * @param {Object} [state] - initial state for the view
     * @returns {DashCanvasViewModel}
     */
    @action
    addView(specId, {title, position = 'nextAvailable', state} = {}) {
        const layout = this.getLayoutFromPosition(position, specId);
        return this.addViewInternal(specId, {title, layout, state});
    }

    /**
     * Remove a view from the DashCanvas
     * @param {string} id - DashCanvasViewModel id to remove from the container
     */
    @action
    removeView(id) {
        const removeLayout = this.getLayout(id),
            removeView = this.getView(id);

        this.layouts = without(this.layouts, removeLayout);
        this.viewModels = without(this.viewModels, removeView);
        XH.destroy(removeView);
    }

    /**
     * Replace a view in the DashCanvas with a different view, keeping the existing layout
     * @param {string} id - id of view model to be replaced
     * @param {string} newSpecId - id of view spec to insert
     */
    @action
    replaceView(id, newSpecId) {
        const layout = this.getLayout(id);
        this.removeView(id);
        this.addViewInternal(newSpecId, {layout});
    }

    /**
     * Rename a view in the DashCanvas
     * @param {string} id
     */
    renameView(id) {
        const view = this.getView(id),
            allowRename = view?.viewSpec?.allowRename && !this.renameLocked;

        if (!allowRename) return;

        XH.prompt({
            message: `Rename '${view.title}' to`,
            title: 'Rename...',
            icon: Icon.edit(),
            input: {
                initialValue: view.title,
                rules: [required]
            }
        }).then(newName => {
            if (newName) view.setTitle(newName);
        });
    }

    /**
     * Scrolls a DashCanvasView into view
     * @param {string} id
     */
    ensureViewVisible(id) {
        this.getView(id)?.ensureVisible();
    }

    //------------------------
    // Implementation
    //------------------------
    getLayoutFromPosition(position, specId) {
        switch (position) {
            case 'first':
                return {x: 0, y: -1};
            case 'last':
                return {x: 0, y: this.rows};
            case 'nextAvailable':
                return this.getNextAvailablePosition(this.getSpec(specId));
            default: {
                const previousView = this.getView(position);
                throwIf(!previousView, `Position must be either 'first', 'last', 'nextAvailable' or a valid viewId`);
                const {x, y} = previousView;
                return {x, y};
            }
        }
    }


    @action
    addViewInternal(specId, {layout, title, state, previousViewId}) {
        const viewSpec = this.getSpec(specId),
            instances = this.getViewsBySpecId(specId);

        throwIf(!viewSpec,
            `Trying to add non-existent or omitted DashCanvasViewSpec. id=${specId}`
        );
        throwIf(!viewSpec.allowAdd,
            `Trying to add DashCanvasViewSpec with allowAdd=false. id=${specId}`
        );
        throwIf(viewSpec.unique && instances.length,
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
            prevLayout = previousViewId ? this.getLayout(previousViewId) : null,
            x = prevLayout?.x ?? layout?.x ?? 0,
            y = prevLayout?.y ?? layout?.y ?? this.rows,
            h = layout?.h ?? viewSpec.height ?? 1,
            w = layout?.w ?? viewSpec.width ?? 1;

        this.layout = [...this.layout, {i: id, x, y, h, w}];
        this.viewModels = [...this.viewModels, model];
        return model;
    }


    @action
    setLayout(layout) {
        // strip extra properties from react-grid
        layout = layout.map(({i, x, y, w, h}) => ({i, x, y, w, h}));
        if (!isEqual(this.layout, layout)) {
            this.layout = layout;

            // Check if scrollbar visibility has changed, and force resize event if so
            const {current: node} = this.ref,
                scrollbarVisible = node.offsetWidth > node.clientWidth;
            if (scrollbarVisible !== this.scrollbarVisible) {
                window.dispatchEvent(new Event('resize'));
                this.scrollbarVisible = scrollbarVisible;
            }
        }
    }

    @action
    loadState(state) {
        this.clear();
        state.forEach(state => this.addViewInternal(state.viewSpecId, state));
    }

    @action
    publishState() {
        this.state = this.buildState();
        this.provider?.write({state: this.state});
    }

    buildState() {
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

    genViewId() {
        return `${XH.genId()}_${Date.now()}`;
    }

    @computed
    get viewState() {
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

    getView(id) {
        return find(this.viewModels, {id});
    }

    getLayout(id) {
        return find(this.layout, {i: id});
    }

    getSpec(id) {
        return find(this.viewSpecs, {id});
    }

    getViewsBySpecId(id) {
        return this.viewModels.filter(it => it.viewSpec.id === id);
    }

    getNextAvailablePosition({width, height, startX = 0, startY = 0, defaultX = 0, endY = null}) {
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

/**
 * @typedef {Object} DashCanvasItemState
 * @property {DashCanvasItemLayout} layout
 * @property {string} title
 * @property {string} viewSpecId
 * @property {Object} state
 */

/**
 * @typedef {Object} DashCanvasItemLayout
 * @property {number} x
 * @property {number} y
 * @property {number} w
 * @property {number} h
 */
