/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {fragment, strong, p, span} from '@xh/hoist/cmp/layout';
import {
    ExceptionHandlerOptions,
    HoistModel,
    LoadSpec,
    PlainObject,
    TaskObserver,
    Thunkable,
    XH
} from '@xh/hoist/core';
import type {ViewManagerProvider, ReactionSpec} from '@xh/hoist/core';
import {genDisplayName} from '@xh/hoist/data';
import {fmtDateTime} from '@xh/hoist/format';
import {action, bindable, makeObservable, observable, comparer, runInAction} from '@xh/hoist/mobx';
import {olderThan, SECONDS} from '@xh/hoist/utils/datetime';
import {executeIfFunction, pluralize, throwIf} from '@xh/hoist/utils/js';
import {find, isEqual, isNil, isNull, isUndefined, lowerCase} from 'lodash';
import {ReactNode} from 'react';
import {ViewInfo} from './ViewInfo';
import {View} from './View';
import {DataAccess, ViewCreateSpec, ViewUpdateSpec, ViewUserState} from './DataAccess';

export interface ViewManagerConfig {
    /**
     * True (default) to allow user to opt in to automatically saving changes to their current view.
     */
    enableAutoSave?: boolean;

    /**
     * True (default) to allow the user to select a "Default" option that restores all persisted
     * objects to their in-code defaults. If not enabled, at least one saved view should be created
     * in advance, so that there is a clear initial selection for users without any private views.
     */
    enableDefault?: boolean;

    /**
     * True (default) to enable "global" views - i.e. views that are not owned by a user and are
     * available to all.
     */
    enableGlobal?: boolean;

    /**
     * True (default) to allow users to share their views with other users.
     */
    enableSharing?: boolean;

    /**
     * Function to determine the initial view for a user, when no view has already been persisted.
     * Will be passed a list of views available to the current user.  Implementations where
     * enableDefault is set false should typically return some view, if any views are
     * available.  If no view is returned, the control will be forced to fall back on the default.
     *
     * Must be set when enableDefault is false.
     */
    initialViewSpec?: (views: ViewInfo[]) => ViewInfo;

    /**
     * Delay (in ms) to wait after state has been set on associated components before listening for
     * further state changes. The long default wait 1000ms is intended to avoid a false positive
     * dirty indicator when linking to complex components such as dashboards or grids that can
     * report immediate changes to state due to internal processing or rendering.
     */
    settleTime?: number;

    /**
     * True to allow the user to publish or edit the global views. Apps are expected to
     * commonly set this based on user roles - e.g. `XH.getUser().hasRole('MANAGE_GRID_VIEWS')`.
     */
    manageGlobal?: Thunkable<boolean>;

    /**
     * Required discriminator for the particular class of views to be loaded and managed by this
     * model. Set to something descriptive and specific enough to be identifiable and allow for
     * different viewManagers to be added to your app in the future - e.g. `portfolioGridView` or
     * `tradeBlotterDashboard`.
     */
    type: string;

    /**
     * Optional sub-discriminator for the particular location in your app this instance of the
     * view manager appears in. A particular currentView and pendingValue will be maintained by
     * instance, but all other options, and the available library of views will be shared by type.
     */
    instance?: string;

    /**
     * Optional user-facing display name for the view type, displayed in the ViewManager menu
     * and associated management dialogs and prompts. Defaulted from `type` if not provided.
     */
    typeDisplayName?: string;

    /**
     * Optional user-facing display name for describing global views. Defaults to 'global'
     */
    globalDisplayName?: string;
}

/**
 *  ViewManagerModel coordinates the loading, saving, and management of user-defined bundles of
 *  {@link Persistable} component/model state.
 *
 *  - Models to be persisted are bound to this model via their `persistWith` config. One or more
 *    models can be bound to a single ViewManagerModel, allowing a single view to capture the state
 *    of multiple components - e.g. grouping and filtering options along with grid state.
 *  - Views are persisted back to the server as JsonBlob objects.
 *  - Views can be private to their owner, or optionally enabled for sharing to (all) other users.
 *  - Views can be marked as pinned for quick access.
 *  - See the desktop {@link ViewManager} component - the initial Hoist UI for this model.
 */
export class ViewManagerModel<T = PlainObject> extends HoistModel {
    /**
     * Factory to create new instances of this model and await its initial load before binding to
     * any persistable component models. This ensures that bound models will have the expected
     * initial persisted state applied within their constructor, before their components have
     * rendered, and avoids thrashing of component state during initial load.
     *
     * To minimize the impact this async requirement has on the design and lifecycle of individual
     * components within an app, consider eagerly constructing any viewManagerModels required within
     * your `AppModel.initAsync` method and saving a reference to them there for component models
     * to then use when they are mounted. The VM model instances will then be "ready to go" and
     * usable within model constructors. (Initializing and referencing from one or more app
     * services would be another, similar option.)
     *
     * Note that this method may throw if the ViewManager cannot be initialized successfully,
     * but should generally fail quietly due to the early instantiation.
     */
    static async createAsync(config: ViewManagerConfig): Promise<ViewManagerModel> {
        const ret = new ViewManagerModel(config);
        await ret.initAsync();
        return ret;
    }

    /** Immutable configuration for this model. */
    readonly type: string;
    readonly instance: string;
    readonly typeDisplayName: string;
    readonly globalDisplayName: string;
    readonly enableAutoSave: boolean;
    readonly enableDefault: boolean;
    readonly enableGlobal: boolean;
    readonly enableSharing: boolean;
    readonly manageGlobal: boolean;
    readonly settleTime: number;
    readonly initialViewSpec: (views: ViewInfo[]) => ViewInfo;

    /** Current view. Will not include uncommitted changes */
    @observable.ref view: View<T> = null;
    /** Loaded saved view library - both private and global */
    @observable.ref views: ViewInfo[] = [];

    /**
     * Map of user's preferred pinned state for views.
     *
     * Note that the actual pinned state for the views is determined by this value, layered
     * over the default state of the views themselves.
     */
    @observable.ref userPinned: Record<string, boolean> = {};

    /**
     * True if user has opted-in to automatically saving changes to personal views (if auto-save
     * generally available as per `enableAutoSave`).
     */
    @bindable autoSave = false;

    /**
     * TaskObserver linked to {@link selectViewAsync}. If a change to the active view is likely to
     * require intensive layout/grid work, consider masking affected components with this task.
     */
    selectTask: TaskObserver;

    /** TaskObserver linked to {@link saveAsync}. */
    saveTask: TaskObserver;

    //-----------------------
    // Private, internal state.
    //-------------------------
    /** Unsaved changes on the current view.*/
    @observable.ref
    private pendingValue: PendingValue<T> = null;

    /**
     * Array of {@link ViewManagerProvider} instances bound to this model. Providers will
     * push themselves onto this array when constructed with a reference to this model. Used to
     * proactively push state to the target components when the model's selected `value` changes.
     * @internal
     */
    providers: ViewManagerProvider<any>[] = [];

    /** Data access for persisting views. */
    private dataAccess: DataAccess<T>;

    /** Last time changes were pushed to linked persistence providers */
    private lastPushed: number = null;

    //---------------
    // Getters
    //---------------
    get isValueDirty(): boolean {
        return !!this.pendingValue;
    }

    get isViewSavable(): boolean {
        const {view, manageGlobal} = this;
        return view.isOwned || (view.isGlobal && manageGlobal);
    }

    get isViewAutoSavable(): boolean {
        const {enableAutoSave, autoSave, view} = this;
        return enableAutoSave && autoSave && view.isOwned && !XH.identityService.isImpersonating;
    }

    get autoSaveUnavailableReason(): string {
        const {view, isViewAutoSavable, typeDisplayName, globalDisplayName} = this;
        if (isViewAutoSavable) return null;
        if (view.isGlobal) return `Cannot auto-save ${globalDisplayName} ${typeDisplayName}.`;
        if (view.isShared) return `Cannot auto-save shared ${typeDisplayName}.`;
        if (view.isDefault) return `Cannot auto-save default ${typeDisplayName}.`;
        if (XH.identityService.isImpersonating) return `Auto-save disabled during impersonation.`;
        return null;
    }

    get pinnedViews(): ViewInfo[] {
        return this.views.filter(it => it.isPinned);
    }

    /** Views owned by me */
    get ownedViews(): ViewInfo[] {
        return this.views.filter(it => it.isOwned);
    }

    /** Views shared *with* me */
    get sharedViews(): ViewInfo[] {
        return this.views.filter(it => it.isShared && !it.isOwned);
    }

    /** Global views */
    get globalViews(): ViewInfo[] {
        return this.views.filter(it => it.isGlobal);
    }

    /** True if any async tasks are pending. */
    get isLoading(): boolean {
        const {loadModel, saveTask, selectTask} = this;
        return loadModel.isPending || saveTask.isPending || selectTask.isPending;
    }

    /**
     * Use the static {@link createAsync} factory to create an instance of this model and await its
     * initial load before binding to persistable components.
     */
    constructor({
        type,
        instance = 'default',
        typeDisplayName,
        globalDisplayName = 'global',
        manageGlobal = false,
        enableAutoSave = true,
        enableDefault = true,
        enableGlobal = true,
        enableSharing = true,
        settleTime = 1000,
        initialViewSpec = null
    }: ViewManagerConfig) {
        super();
        makeObservable(this);

        throwIf(
            !enableDefault && !initialViewSpec,
            "ViewManagerModel requires 'initialViewSpec' if `enableDefault` is false."
        );

        this.type = type;
        this.instance = instance;
        this.typeDisplayName = lowerCase(typeDisplayName ?? genDisplayName(type));
        this.globalDisplayName = globalDisplayName;
        this.manageGlobal = executeIfFunction(manageGlobal) ?? false;
        this.enableDefault = enableDefault;
        this.enableGlobal = enableGlobal;
        this.enableSharing = enableSharing;
        this.enableAutoSave = enableAutoSave;
        this.settleTime = settleTime;
        this.initialViewSpec = initialViewSpec;

        this.selectTask = TaskObserver.trackLast({
            message: `Updating ${this.typeDisplayName}...`
        });
        this.saveTask = TaskObserver.trackLast({
            message: `Saving ${this.typeDisplayName}...`
        });

        this.dataAccess = new DataAccess(this);
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        const {dataAccess, view} = this;
        try {
            // 1) Update views and related state
            const {views, state} = await dataAccess.fetchDataAsync();
            if (loadSpec.isStale) return;
            runInAction(() => {
                this.views = views;
                this.userPinned = state.userPinned;
                this.autoSave = state.autoSave;
            });

            // potentially fast-forward current view.
            if (!view.isDefault) {
                const latestInfo = find(views, {token: view.token});
                if (latestInfo && latestInfo.lastUpdated > view.lastUpdated) {
                    this.loadViewAsync(latestInfo, this.pendingValue);
                }
            }
        } catch (e) {
            if (loadSpec.isStale) return;
            this.handleException(e, {showAlert: false});
        }
    }

    async selectViewAsync(info: ViewInfo): Promise<void> {
        // ensure any pending auto-save gets completed
        if (this.isValueDirty && this.isViewAutoSavable) {
            await this.maybeAutoSaveAsync();
        }

        // if still dirty, require confirm
        if (this.isValueDirty && this.view.isOwned && !(await this.confirmDiscardChangesAsync())) {
            return;
        }

        await this.loadViewAsync(info).catch(e => this.handleException(e));
    }

    async saveAsAsync(spec: ViewCreateSpec): Promise<void> {
        const view = await this.dataAccess.createViewAsync({...spec, value: this.getValue()});
        this.noteSuccess(`Created ${view.typedName}`);
        this.userPin(view.info);
        this.setAsView(view);
    }

    //------------------------
    // Saving/resetting
    //------------------------
    async saveAsync(): Promise<void> {
        if (!this.pendingValue || !this.isViewSavable || this.isLoading) {
            this.logError('Unexpected conditions for call to save, skipping');
            return;
        }
        const {pendingValue, view, dataAccess} = this;
        try {
            if (!(await this.maybeConfirmSaveAsync(view, pendingValue))) {
                return;
            }
            const updated = await dataAccess
                .updateViewValueAsync(view, pendingValue.value)
                .linkTo(this.saveTask);

            this.setAsView(updated);
            this.noteSuccess(`Saved ${view.typedName}`);
        } catch (e) {
            this.handleException(e, {
                message: `Failed to save ${view.typedName}.  If this persists consider \`Save As...\`.`
            });
        }
        this.refreshAsync();
    }

    async resetAsync(): Promise<void> {
        await this.loadViewAsync(this.view.info).catch(e => this.handleException(e));
    }

    //--------------------------------
    // Access for Provider/Components
    //--------------------------------
    getValue(): Partial<T> {
        return this.pendingValue ? this.pendingValue.value : this.view.value;
    }

    @action
    setValue(value: Partial<T>) {
        const {view, pendingValue, lastPushed, settleTime} = this;
        if (!pendingValue && settleTime && !olderThan(lastPushed, settleTime)) {
            return;
        }

        value = this.cleanState(value);
        if (!isEqual(value, view.value)) {
            this.pendingValue = {
                token: pendingValue ? pendingValue.token : view.token,
                baseUpdated: pendingValue ? pendingValue.baseUpdated : view.lastUpdated,
                value
            };
        } else {
            this.pendingValue = null;
        }
    }

    //------------------
    // Pinning
    //------------------
    togglePinned(view: ViewInfo) {
        view.isPinned ? this.userUnpin(view) : this.userPin(view);
    }

    @action
    userPin(view: ViewInfo) {
        this.userPinned = {...this.userPinned, [view.token]: true};
    }

    @action
    userUnpin(view: ViewInfo) {
        this.userPinned = {...this.userPinned, [view.token]: false};
    }

    isUserPinned(view: ViewInfo): boolean | null {
        return this.userPinned[view.token];
    }

    //-----------------
    // Management
    //-----------------
    async validateViewNameAsync(name: string, existing: ViewInfo = null): Promise<string> {
        const maxLength = 50;
        name = name?.trim();
        if (!name) return 'Name is required';
        if (name.length > maxLength) {
            return `Name cannot be longer than ${maxLength} characters`;
        }
        if (this.ownedViews.some(view => view.name === name && view.token != existing?.token)) {
            return `A ${this.typeDisplayName} with name '${name}' already exists.`;
        }
        return null;
    }

    /** Update all aspects of a view's metadata.*/
    async updateViewInfoAsync(view: ViewInfo, updates: ViewUpdateSpec): Promise<View<T>> {
        return this.dataAccess.updateViewInfoAsync(view, updates);
    }

    /** Promote a view to global visibility/ownership status. */
    async makeViewGlobalAsync(view: ViewInfo): Promise<View<T>> {
        return this.dataAccess.makeViewGlobalAsync(view);
    }

    async deleteViewsAsync(toDelete: ViewInfo[]): Promise<void> {
        let exception;
        try {
            await this.dataAccess.deleteViewsAsync(toDelete);
        } catch (e) {
            exception = e;
        }

        await this.refreshAsync();
        const {views} = this;

        if (toDelete.some(view => view.isCurrentView) && !views.some(view => view.isCurrentView)) {
            await this.loadViewAsync(this.initialViewSpec?.(views));
        }

        if (exception) throw exception;
    }

    //------------------
    // Implementation
    //------------------
    private async initAsync() {
        let {dataAccess, pendingValueStorageKey} = this,
            initialState;

        try {
            // 1) Initialize views and related state
            const {views, state} = await dataAccess.fetchDataAsync();
            initialState = state;
            runInAction(() => {
                this.views = views;
                this.userPinned = state.userPinned;
                this.autoSave = state.autoSave;
                this.pendingValue = XH.sessionStorageService.get(pendingValueStorageKey);
            });

            // 2) Initialize/choose initial view.  Null is ok, and will yield default.
            let initialView,
                initialTkn = initialState.currentView;
            if (isUndefined(initialTkn)) {
                initialView = this.initialViewSpec?.(views);
            } else if (!isNull(initialTkn)) {
                initialView = find(views, {token: initialTkn}) ?? this.initialViewSpec?.(views);
            } else {
                initialView = null;
            }

            await this.loadViewAsync(initialView, this.pendingValue);
        } catch (e) {
            // Always ensure at least default view is installed (other state defaults are fine)
            this.loadViewAsync(null, this.pendingValue);
            this.handleException(e, {showAlert: false, logOnServer: true});
        }

        this.addReaction(
            this.pendingValueReaction(),
            this.autoSaveReaction(),
            ...this.stateReactions(initialState)
        );
    }

    private pendingValueReaction(): ReactionSpec {
        return {
            track: () => this.pendingValue,
            run: v => XH.sessionStorageService.set(this.pendingValueStorageKey, v)
        };
    }

    private autoSaveReaction(): ReactionSpec {
        return {
            track: () => [this.pendingValue, this.autoSave],
            run: () => this.maybeAutoSaveAsync(),
            debounce: 2 * SECONDS
        };
    }

    private stateReactions(initialState: ViewUserState): ReactionSpec[] {
        const {dataAccess} = this;
        return [
            {
                track: () => this.userPinned,
                run: userPinned => dataAccess.updateStateAsync({userPinned}),
                equals: comparer.structural,
                debounce: 2 * SECONDS
            },
            {
                track: () => this.autoSave,
                run: autoSave => dataAccess.updateStateAsync({autoSave})
            },
            {
                track: () => this.view?.token,
                run: tkn => dataAccess.updateStateAsync({currentView: tkn}),
                fireImmediately: this.view?.token !== initialState.currentView
            }
        ];
    }

    private async loadViewAsync(
        info: ViewInfo,
        pendingValue: PendingValue<T> = null
    ): Promise<void> {
        return this.dataAccess
            .fetchViewAsync(info)
            .thenAction(latest => {
                this.setAsView(latest, pendingValue?.token == info?.token ? pendingValue : null);
                this.providers.forEach(it => it.pushStateToTarget());
                this.lastPushed = Date.now();
            })
            .linkTo(this.selectTask);
    }

    private async maybeAutoSaveAsync() {
        const {pendingValue, isViewAutoSavable, view, dataAccess} = this;
        if (isViewAutoSavable && pendingValue) {
            try {
                const updated = await dataAccess
                    .updateViewValueAsync(view, pendingValue.value)
                    .linkTo(this.saveTask);

                this.setAsView(updated);
            } catch (e) {
                // TODO: How to alert but avoid for flaky or spam when user editing a deleted view
                // Keep count and alert server and user once at count n?
                XH.handleException(e, {
                    message: `Failing AutoSave for ${view.info.typedName}`,
                    showAlert: false,
                    logOnServer: false
                });
            }
        }
    }

    @action
    private setAsView(view: View<T>, pendingValue: PendingValue<T> = null) {
        this.view = view;
        this.pendingValue = pendingValue;
        // Ensure we update meta-data as well.
        if (!view.isDefault) {
            this.views = this.views.map(v => (v.token === view.token ? view.info : v));
        }
    }

    private handleException(e, opts: ExceptionHandlerOptions = {}) {
        XH.handleException(e, opts);
    }

    private noteSuccess(msg: string) {
        XH.successToast(msg);
    }

    private get pendingValueStorageKey(): string {
        return `${this.type}_${this.instance}`;
    }

    /**
     * Stringify and parse to ensure that any value set here is valid, serializable JSON.
     */
    private cleanState(state: Partial<T>): Partial<T> {
        if (isNil(state)) state = {};
        return JSON.parse(JSON.stringify(state));
    }

    private async confirmDiscardChangesAsync() {
        return XH.confirm({
            message: `You have unsaved changes. Discard them and continue to switch ${pluralize(this.typeDisplayName)}?`,
            confirmProps: {
                text: 'Discard changes',
                intent: 'danger'
            },
            cancelProps: {
                text: 'Cancel',
                autoFocus: true
            }
        });
    }

    private async maybeConfirmSaveAsync(view: View, pendingValue: PendingValue<T>) {
        // Get latest from server for reference
        const latest = await this.dataAccess.fetchViewAsync(view.info),
            isGlobal = latest.isGlobal,
            isStale = latest.lastUpdated > pendingValue.baseUpdated;
        if (!isStale && !isGlobal) return true;

        const latestInfo = latest.info,
            {typeDisplayName, globalDisplayName} = this,
            msgs: ReactNode[] = [`Save ${view.typedName}?`];
        if (isGlobal) {
            msgs.push(
                span(
                    `This is a ${globalDisplayName} ${typeDisplayName}. `,
                    strong('Changes will be visible to all users.')
                )
            );
        }
        if (isStale) {
            msgs.push(
                span(
                    `This ${typeDisplayName} was updated by ${latestInfo.lastUpdatedBy} on ${fmtDateTime(latestInfo.lastUpdated)}. `,
                    strong('Your change may override those changes.')
                )
            );
        }

        return XH.confirm({
            message: fragment(msgs.map(m => p(m))),
            confirmProps: {
                text: 'Yes, save changes',
                intent: 'primary',
                outlined: true,
                autoFocus: false
            },
            cancelProps: {
                text: 'Cancel'
            }
        });
    }
}

interface PendingValue<T> {
    token: string;
    baseUpdated: number;
    value: Partial<T>;
}
