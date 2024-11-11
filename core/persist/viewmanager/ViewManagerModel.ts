import {
    HoistModel,
    LoadSpec,
    managed,
    Persistable,
    PersistableState,
    PersistenceProvider,
    PersistOptions,
    PlainObject,
    Thunkable,
    ViewManagerProvider,
    XH
} from '@xh/hoist/core';
import {action, bindable, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import {executeIfFunction, pluralize} from '@xh/hoist/utils/js';
import {capitalize, isEmpty, isEqual, isNil, isString, sortBy, startCase} from 'lodash';
import {runInAction} from 'mobx';
import {SaveDialogModel} from './impl/SaveDialogModel';
import {View, ViewTree} from './Types';

export interface ViewManagerConfig {
    /** Entity name or object for this model. */
    entity: string | Entity;
    /** Whether user can publish or edit globally shared objects. */
    enableSharing: Thunkable<boolean>;
    /** Used to persist the user's last selected + favorite views and autoSave preference. */
    persistWith?: PersistOptions;
    /**
     * True (default) to allow the user to select a "Default" option that restores all persisted
     * objects to their in-code defaults. If not enabled, at least one saved view is required.
     */
    enableDefault?: boolean;
    /** True (default) to allow user to autoSave changes to personal views - requires persistWith. */
    enableAutoSave?: boolean;
    /** True (default) to allow user to mark views as favorites - requires persistWith. */
    enableFavorites?: boolean;
}

/**
 *  TODO: Document this class.
 */
export class ViewManagerModel<T extends PlainObject = PlainObject>
    extends HoistModel
    implements Persistable<ViewManagerModelPersistState>
{
    static async createAsync(config: ViewManagerConfig): Promise<ViewManagerModel> {
        const ret = new ViewManagerModel(config);
        await ret.loadAsync();
        return ret;
    }

    /** Immutable configuration for this model. */
    readonly enableDefault: boolean;
    readonly enableAutoSave: boolean;
    readonly enableFavorites: boolean;
    readonly entity: Entity;

    /** Last selected, fully-persisted state of the active view. */
    @observable.ref value: T = {} as T;
    /** Current state of the active view, can include not-yet-persisted changes. */
    @observable.ref pendingValue: T = {} as T;
    /** Loaded saved view definitions - both private and shared. */
    @observable.ref views: View<T>[] = [];
    /** Token identifier for the currently selected view, or null if in default mode. */
    @bindable selectedToken: string = null;
    /** List of tokens for the user's favorite views. */
    @bindable favorites: string[] = [];
    /** True if user has elected to auto-save their personal views (if autoSave generally enabled). */
    @bindable autoSaveActive = false;

    @observable manageDialogOpen = false;
    @managed readonly saveDialogModel: SaveDialogModel;

    private readonly _enableSharing: Thunkable<boolean>;

    /**
     * Providers bound to this model. Note that any {@link ViewManagerProvider} will auto-push
     * itself onto this array when constructed with a reference to this model.
     */
    providers: ViewManagerProvider<any>[] = [];

    get enableSharing(): boolean {
        return executeIfFunction(this._enableSharing);
    }

    get selectedView(): View<T> {
        return this.views.find(it => it.token === this.selectedToken);
    }

    @computed
    get isSharedViewSelected(): boolean {
        return !!this.selectedView?.isShared;
    }

    @computed
    get canSave(): boolean {
        const {selectedView} = this;
        return (
            selectedView &&
            this.isDirty &&
            (this.enableSharing || !selectedView.isShared) &&
            !this.loadModel.isPending
        );
    }

    /**
     * True if displaying the save button is appropriate from the model's point of view, even if
     * that button might be disabled due to no changes having been made. Works in concert with the
     * desktop ViewManager component's `showSaveButton` prop.
     */
    @computed
    get canShowSaveButton(): boolean {
        const {selectedView} = this;
        return (
            selectedView &&
            (!this.enableAutoSave || !this.autoSaveActive) &&
            (this.enableSharing || !selectedView.isShared)
        );
    }

    @computed
    get enableAutoSaveToggle(): boolean {
        return this.selectedView && !this.isSharedViewSelected;
    }

    @computed
    get disabledAutoSaveReason(): string {
        const {displayName} = this;
        if (!this.selectedView) return `Cannot auto-save default ${displayName}.`;
        if (this.isSharedViewSelected) return `Cannot auto-save shared ${displayName}.`;
        return null;
    }

    @computed
    get isDirty(): boolean {
        return !isEqual(this.pendingValue, this.value);
    }

    get isShared(): boolean {
        return !!this.selectedView?.isShared;
    }

    get favoriteViews(): View<T>[] {
        return this.views.filter(it => it.isFavorite);
    }

    get sharedViews(): View<T>[] {
        return this.views.filter(it => it.isShared);
    }

    get privateViews(): View<T>[] {
        return this.views.filter(it => !it.isShared);
    }

    get sharedViewTree(): ViewTree[] {
        return this.buildViewTree(sortBy(this.sharedViews, 'name'));
    }

    get privateViewTree(): ViewTree[] {
        return this.buildViewTree(sortBy(this.privateViews, 'name'));
    }

    get displayName(): string {
        return this.entity.displayName;
    }

    get DisplayName(): string {
        return capitalize(this.displayName);
    }

    private constructor({
        entity,
        persistWith,
        enableSharing,
        enableDefault = true,
        enableAutoSave = true,
        enableFavorites = true
    }: ViewManagerConfig) {
        super();
        makeObservable(this);

        this.entity = this.parseEntity(entity);
        this._enableSharing = enableSharing;
        this.enableDefault = enableDefault;
        this.enableAutoSave = enableAutoSave && !!persistWith;
        this.enableFavorites = enableFavorites && !!persistWith;
        this.saveDialogModel = new SaveDialogModel(this.entity.name);

        if (persistWith) {
            PersistenceProvider.create({
                persistOptions: {
                    path: 'viewManager',
                    ...persistWith
                },
                target: this
            });
        }

        this.addReaction(
            {
                track: () => this.pendingValue,
                run: pValue => {
                    this.maybeAutoSaveAsync({skipToast: true});
                }
            },
            {
                track: () => this.autoSaveActive,
                run: () => this.maybeAutoSaveAsync({skipToast: false})
            },
            {
                track: () => this.favorites,
                run: () => this.onFavoritesChange()
            }
        );
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        const rawViews = await XH.jsonBlobService.listAsync({
            type: this.entity.name,
            includeValue: true,
            loadSpec
        });
        if (loadSpec.isStale) return;

        runInAction(() => (this.views = this.processRaw(rawViews)));

        const token =
            loadSpec.meta.selectToken ??
            this.selectedView?.token ??
            (this.enableDefault ? null : this.views[0]?.token);
        await this.selectViewAsync(token);
    }

    async selectViewAsync(token: string) {
        // TODO - review if we benefit from async + masking - eg during intensive
        //      component rebuild within setValue?
        await wait();

        this.selectedToken = token;

        // Allow this model to restore its own persisted state in its ctor and note the desired
        // selected token before views have been loaded. Once views are loaded, this method will
        // be called again with the desired token and will proceed to set the value.
        if (isEmpty(this.views)) return;

        this.setValue(this.selectedView?.value ?? ({} as T));
    }

    async saveAsync(skipToast: boolean = false) {
        const {selectedView, pendingValue, isSharedViewSelected, DisplayName} = this;
        if (!selectedView) return; // nothing to save

        const {token} = selectedView;

        if (isSharedViewSelected) {
            if (!(await this.confirmShareObjSaveAsync())) return;
        }

        try {
            await XH.jsonBlobService.updateAsync(token, {
                ...selectedView,
                value: pendingValue
            });
        } catch (e) {
            return XH.handleException(e, {alertType: 'toast'});
        }

        await this.refreshAsync({selectToken: token});
        if (!skipToast) XH.successToast(`${DisplayName} successfully saved.`);
    }

    async saveAsAsync() {
        const {selectedView, views, DisplayName} = this,
            {name, description} = selectedView ?? {};

        const newView = await this.saveDialogModel.openAsync(
            {
                name,
                description,
                value: this.pendingValue
            },
            views.map(it => it.name)
        );

        if (newView) {
            await this.refreshAsync({selectToken: newView.token});
            XH.successToast(`${DisplayName} successfully saved.`);
        }
    }

    async resetAsync() {
        return this.selectViewAsync(this.selectedView?.token);
    }

    @action
    setPendingValue(pendingValue: T) {
        pendingValue = this.cleanValue(pendingValue);
        if (!isEqual(pendingValue, this.pendingValue)) {
            this.pendingValue = pendingValue;
        }
    }

    toggleFavorite(token: string) {
        this.isFavorite(token) ? this.removeFavorite(token) : this.addFavorite(token);
    }

    addFavorite(token: string) {
        this.favorites = [...this.favorites, token];
    }

    removeFavorite(token: string) {
        this.favorites = this.favorites.filter(it => it !== token);
    }

    isFavorite(token: string) {
        return this.favorites.includes(token);
    }

    @action
    openManageDialog() {
        this.manageDialogOpen = true;
    }

    @action
    closeManageDialog() {
        this.manageDialogOpen = false;
    }

    getHierarchyDisplayName(name: string) {
        return name?.substring(name.lastIndexOf('\\') + 1);
    }

    //------------------
    // Persistable
    //------------------
    getPersistableState(): PersistableState<ViewManagerModelPersistState> {
        return new PersistableState({selectedToken: this.selectedToken, favorites: this.favorites});
    }

    setPersistableState(state: PersistableState<ViewManagerModelPersistState>) {
        const {selectedToken, favorites} = state.value;
        if (selectedToken) this.selectViewAsync(selectedToken);
        if (favorites) this.favorites = favorites;
    }

    //------------------
    // Implementation
    //------------------
    private parseEntity(entity: string | Entity): Entity {
        const ret = isString(entity) ? {name: entity} : {...entity};
        ret.displayName = ret.displayName ?? startCase(ret.name);
        return ret;
    }

    private processRaw(raw: PlainObject[]): View<T>[] {
        const name = pluralize(this.DisplayName);
        return raw.map(it => {
            const isShared = it.acl === '*';
            return {
                ...it,
                isShared,
                group: isShared ? `Shared ${name}` : `My ${name}`,
                isFavorite: this.isFavorite(it.token)
            } as View<T>;
        });
    }

    @action
    private setValue(value: T) {
        value = this.cleanValue(value);
        if (isEqual(value, this.value) && isEqual(value, this.pendingValue)) return;

        this.value = value;
        this.pendingValue = value;
        this.providers.forEach(it => it.pushStateToTarget());
    }

    // Stringify and parse to ensure that any value set here is valid, serializable JSON.
    private cleanValue(value: T): T {
        if (isNil(value)) value = {} as T;
        return JSON.parse(JSON.stringify(value));
    }

    private async confirmShareObjSaveAsync() {
        return XH.confirm({
            message: `You are saving a shared public ${this.displayName}. Do you wish to continue?`,
            confirmProps: {
                text: 'Yes, save changes',
                intent: 'primary',
                outlined: true
            },
            cancelProps: {
                text: 'Cancel',
                autoFocus: true
            }
        });
    }

    private async maybeAutoSaveAsync({skipToast}: {skipToast: boolean}) {
        if (
            this.enableAutoSave &&
            this.autoSaveActive &&
            this.selectedToken &&
            !this.isSharedViewSelected
        ) {
            return this.saveAsync(skipToast);
        }
    }

    private buildViewTree(views: View<T>[], depth: number = 0): ViewTree[] {
        const groups = {},
            unbalancedStableGroupsAndViews = [];

        views.forEach(view => {
            // Leaf Node
            if (this.getNameHierarchySubstring(view.name, depth + 1) == null) {
                unbalancedStableGroupsAndViews.push(view);
                return;
            }
            // Belongs to an already defined group
            const group = this.getNameHierarchySubstring(view.name, depth);
            if (groups[group]) {
                groups[group].children.push(view);
                return;
            }
            // Belongs to a not defined group, create it
            groups[group] = {name: group, children: [view], isMenuFolder: true};
            unbalancedStableGroupsAndViews.push(groups[group]);
        });

        return unbalancedStableGroupsAndViews.map(it => {
            const {name, isMenuFolder, children, description, token} = it;
            if (isMenuFolder) {
                return {
                    type: 'folder',
                    text: name,
                    items: this.buildViewTree(children, depth + 1),
                    selected: this.isFolderForEntry(name, this.selectedView?.name, depth)
                };
            }
            return {
                type: 'view',
                text: this.getHierarchyDisplayName(name),
                selected: this.selectedToken === token,
                token,
                description
            };
        });
    }

    private getNameHierarchySubstring(name: string, depth: number) {
        const arr = name?.split('\\') ?? [];
        if (arr.length <= depth) {
            return null;
        }
        return arr.slice(0, depth + 1).join('\\');
    }

    private isFolderForEntry(folderName: string, entryName: string, depth: number) {
        const name = this.getNameHierarchySubstring(entryName, depth);
        return name && name === folderName && folderName.length < entryName.length;
    }

    // Update flag on each view, replacing entire views collection for observability.
    private onFavoritesChange() {
        this.views = this.views.map(view => ({
            ...view,
            isFavorite: this.isFavorite(view.token)
        }));
    }
}

interface Entity {
    /** Key used in JsonBlob */
    name: string;
    /** User-facing name/label for an object managed by this model. */
    displayName?: string;
}

interface ViewManagerModelPersistState {
    selectedToken: string;
    favorites: string[];
}
