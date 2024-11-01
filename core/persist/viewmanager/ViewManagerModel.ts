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
import {executeIfFunction, pluralize} from '@xh/hoist/utils/js';
import {capitalize, clone, find, isEqual, isNil, isString, sortBy, startCase} from 'lodash';
import {runInAction} from 'mobx';
import {SaveDialogModel} from './impl/SaveDialogModel';
import {View, ViewTree} from './Types';

export interface ViewManagerConfig {
    /** Entity name or object for this model. */
    entity: string | Entity;
    /** Whether user can publish or edit globally shared objects. */
    canManageGlobal: Thunkable<boolean>;
    /** Used to persist the user's last selected and favorite views. */
    persistWith?: PersistOptions;
    /** Optional flag to allow empty view selection. Defaults false*/
    enableDefault?: boolean;
    /** Optional flag to allow auto save state. Defaults false*/
    enableAutoSave?: boolean;
}

/**
 * ViewManager provides re-usable loading, selection, and user management of named configs, which are modelled
 * and persisted on the server as databased domain objects extending the `PersistedObject` trait.
 *
 * These generic configs are intended for specific use cases such as saved Grid views, Dashboards, and data import
 * mapping configs. This model loads all available views from a configured endpoint and exposes a `provider` property
 * that can be passed to any HoistModel that takes a `persistWith` config.
 *
 * Objects managed by this system can be private or shared based on a user's company and/or app roles. The `acl` field
 * on each persisted object determines if and how it is shared. Users with the configured `adminRole` can share saved
 * objects to all app users and save changes to shared objects directly. Users with the configured `editorRole` can
 * share objects to their own company only and modify shared objects shared only within their company. All users can
 * save/update/delete their own private objects.
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
    readonly entity: Entity;

    /** Last selected, fully-persisted state of the active object. */
    @observable.ref value: T = null;

    /** Current state of the active object, can include not-yet-persisted changes. */
    @observable.ref pendingValue: T = null;

    /** Loaded saved view definitions - both private and shared. */
    @observable.ref views: View<T>[] = [];

    @bindable selectedToken: string = null;
    @bindable favorites: string[] = [];
    @bindable autoSaveToggle = false;
    @observable manageDialogOpen = false;

    @managed readonly saveDialogModel: SaveDialogModel;

    private readonly _canManageGlobal: Thunkable<boolean>;

    /**
     * Providers bound to this model. Note that any {@link ViewManagerProvider} will auto-push
     * itself onto this array when constructed with a reference to this model.
     */
    providers: ViewManagerProvider<any>[] = [];

    get canManageGlobal(): boolean {
        return executeIfFunction(this._canManageGlobal);
    }

    get selectedView(): View<T> {
        return this.views.find(it => it.token === this.selectedToken);
    }

    get isSharedViewSelected(): boolean {
        return !isNil(
            find(this.sharedViews, it => {
                return it.token === this.selectedToken;
            })
        );
    }

    @computed
    get canSave(): boolean {
        const {selectedView} = this;
        return (
            selectedView &&
            this.isDirty &&
            (this.canManageGlobal || !selectedView.isShared) &&
            !this.loadModel.isPending
        );
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
        return this.hierarchicalItemSpecs(sortBy(this.sharedViews, 'name'));
    }

    get privateViewTree(): ViewTree[] {
        return this.hierarchicalItemSpecs(sortBy(this.privateViews, 'name'));
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
        canManageGlobal,
        enableDefault = false,
        enableAutoSave = false
    }: ViewManagerConfig) {
        super();
        makeObservable(this);

        this.entity = this.parseEntity(entity);
        this._canManageGlobal = canManageGlobal;
        this.enableDefault = enableDefault;
        this.enableAutoSave = enableAutoSave;
        this.saveDialogModel = new SaveDialogModel(this.entity.name);

        // TODO - disable favorites functionality if not persisting, or make persistWith required
        //      (breaking with the convention used elsewhere)
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
                track: () => this.value,
                run: value => {
                    console.log('ViewManagerModel value changed', value);
                    this.pendingValue = value; // TODO - confirm if this is the best place to do this
                    this.providers.forEach(it => it.pushStateToTarget());
                }
            },
            {
                track: () => this.pendingValue,
                run: pValue => {
                    console.log('ViewManagerModel pendingValue changed', pValue);
                    console.log('ViewManagerModel isDirty', this.isDirty);
                    if (
                        this.enableAutoSave &&
                        this.autoSaveToggle &&
                        !this.isSharedViewSelected &&
                        this.selectedToken !== null
                    ) {
                        this.saveAsync(true);
                    }
                }
            },
            {
                track: () => this.autoSaveToggle,
                run: autoSaveToggle => {
                    if (autoSaveToggle) this.saveAsync(false);
                }
            },
            {
                track: () => this.favorites,
                run: () => this.onFavoritesChange()
            }
        );
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        const rawViews = await XH.jsonBlobService.listAsync(
            {type: this.entity.name, includeValue: true},
            loadSpec
        );
        if (loadSpec.isStale) return;

        runInAction(() => (this.views = this.processRaw(rawViews)));

        const token =
            loadSpec.meta.selectToken ??
            this.selectedView?.token ??
            (this.enableDefault ? null : this.views[0]?.token);
        await this.selectAsync(token);
    }

    async selectAsync(token: string) {
        this.selectedToken = token;
        runInAction(() => {
            this.value = clone(this.selectedView?.value ?? ({} as T));
        });
        this.setPendingValue(this.value);
    }

    async saveAsync(skipToast: boolean = false) {
        const {selectedView, pendingValue, isShared, DisplayName} = this,
            {token} = selectedView;

        if (isShared) {
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
        runInAction(() => {
            this.value = clone(this.selectedView?.value ?? ({} as T));
        });
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

    getHierarchyDisplayName(name) {
        return name?.substring(name.lastIndexOf('\\') + 1);
    }

    @action
    setPendingValue(pendingValue: T) {
        if (isNil(pendingValue)) {
            this.pendingValue = null;
            return;
        }

        pendingValue = this.cleanValue(pendingValue);
        if (!isEqual(this.pendingValue, pendingValue)) {
            this.pendingValue = pendingValue;
        }
    }

    //------------------
    // Persistable
    //------------------
    getPersistableState(): PersistableState<ViewManagerModelPersistState> {
        return new PersistableState({selectedToken: this.selectedToken, favorites: this.favorites});
    }

    setPersistableState(state: PersistableState<ViewManagerModelPersistState>) {
        const {selectedToken, favorites} = state.value;
        if (selectedToken) this.selectAsync(selectedToken);
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

    private cleanValue(value: T): T {
        // Stringify and parse to ensure that the value is valid JSON
        // (i.e. no object instances, no keys with undefined values, etc.)
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

    private hierarchicalItemSpecs(views: View<T>[], depth: number = 0): ViewTree[] {
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
            const {name, isMenuFolder, children, token} = it;
            if (isMenuFolder) {
                return {
                    type: 'directory',
                    text: name,
                    items: this.hierarchicalItemSpecs(children, depth + 1),
                    selected: this.isFolderForEntry(name, this.selectedView?.name, depth)
                };
            }
            return {
                type: 'view',
                text: this.getHierarchyDisplayName(name),
                selected: this.selectedToken === token,
                token
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

    private onFavoritesChange() {
        this.views.forEach(view => {
            view.isFavorite = this.isFavorite(view.token);
        });
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
