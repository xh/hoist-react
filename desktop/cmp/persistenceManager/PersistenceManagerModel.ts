import {
    HoistModel,
    LoadSpec,
    managed,
    PersistenceProvider,
    PersistOptions,
    PlainObject,
    Thunkable,
    XH
} from '@xh/hoist/core';
import {StoreRecordId} from '@xh/hoist/data/StoreRecord';
import {action, bindable, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {executeIfFunction, pluralize} from '@xh/hoist/utils/js';
import {capitalize, cloneDeep, isEmpty, isEqualWith, isNil} from 'lodash';
import {ManageDialogModel} from './impl/ManageDialogModel';
import {ObjStub, SaveDialogModel} from './impl/SaveDialogModel';
import {runInAction} from 'mobx';

/**
 * PersistenceManager provides re-usable loading, selection, and user management of named configs, which are modelled
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
export interface PersistenceManagerConfig {
    /** Key used in JsonBlob */
    type: string;
    /** User-facing name/label for an object managed by this model. */
    noun: string;
    /** Whether user can publish or edit globally shared objects. */
    canManageGlobal: Thunkable<boolean>;
    /** Async callback triggered when view changes. Should be used to recreate the affected models. */
    onChangeAsync: (value: PlainObject) => void;
    /** Used to persist this model's selected ID. */
    persistWith: PersistOptions;
    /** True (default) to render a save button alongside the primary menu button when dirty. */
    enableTopLevelSaveButton?: boolean;
    /** Fn to produce a new, empty object - can be async. */
    newObjectFnAsync?: () => PlainObject;
}

export class PersistenceManagerModel extends HoistModel {
    //------------------------
    // Persistence Provider
    // Pass this to models that implement `persistWith` to include their state in the view.
    //------------------------
    readonly provider: PersistOptions = {
        getData: () => cloneDeep(this.pendingValue ?? this.value ?? {}),
        setData: value => this.mergePendingValue(value)
    };

    readonly enableTopLevelSaveButton: boolean = true;

    private readonly canManageGlobalFn: Thunkable<boolean>;

    readonly newObjectFn: () => PlainObject;

    readonly onChangeAsync?: (value: PlainObject) => void;

    /** Reference Key used to query JsonBlobs */
    readonly type: string;

    /** Configured word to label an object persisted by this model. */
    readonly noun: string;

    @observable.ref @managed manageDialogModel: ManageDialogModel;

    @observable.ref @managed saveDialogModel: SaveDialogModel;
    /** Current state of the active object, can include not-yet-persisted changes. */
    @observable.ref pendingValue: PlainObject = null;

    @observable.ref views: PlainObject[] = [];

    @bindable selectedId: StoreRecordId;

    get pluralNoun(): string {
        return pluralize(this.noun);
    }

    get capitalNoun(): string {
        return capitalize(this.noun);
    }

    get capitalPluralNoun(): string {
        return capitalize(this.pluralNoun);
    }

    get canManageGlobal(): boolean {
        return executeIfFunction(this.canManageGlobalFn);
    }

    get value(): PlainObject {
        return this.selectedObject?.value;
    }

    get objects(): PlainObject[] {
        return this.views;
    }

    get selectedObject(): PlainObject {
        return this.views.find(it => it.id === this.selectedId);
    }

    @computed
    get canSave(): boolean {
        const {value} = this;
        if (!value) return false;
        return (
            this.isDirty && (this.canManageGlobal || !value.isShared) && !this.loadModel.isPending
        );
    }

    @computed
    get isDirty(): boolean {
        return !this.isEqualSkipAutosize(this.pendingValue, this.value);
    }

    get isShared(): boolean {
        return !!this.selectedObject?.isShared;
    }

    // Internal persistence provider, used to save *this* model's state, i.e. selectedId
    private readonly _provider;

    constructor({
        type,
        noun,
        onChangeAsync,
        persistWith,
        canManageGlobal,
        enableTopLevelSaveButton = true,
        newObjectFnAsync
    }: PersistenceManagerConfig) {
        super();
        makeObservable(this);

        this.type = type;
        this.canManageGlobalFn = canManageGlobal;
        this.enableTopLevelSaveButton = enableTopLevelSaveButton;
        this.noun = noun || 'item';
        this.newObjectFn = newObjectFnAsync ?? (() => ({}));
        this.onChangeAsync = onChangeAsync;

        // Set up internal PersistenceProvider -- fail gently
        if (persistWith) {
            try {
                this._provider = PersistenceProvider.create({
                    path: 'persistenceManager',
                    ...persistWith
                });

                const state = this._provider.read();
                if (state?.selectedId) this.selectedId = state.selectedId;
                this.addReaction({
                    track: () => this.selectedId,
                    run: selectedId => this._provider.write({selectedId})
                });
            } catch (e) {
                this.logError('Error applying persistWith', persistWith, e);
                XH.safeDestroy(this._provider);
                this._provider = null;
            }
        }

        this.loadAsync();
    }

    // TODO - Carefully review if this method needs isStale checks, and how to properly implement them.
    override async doLoadAsync(loadSpec: LoadSpec) {
        const rawViews = await XH.jsonBlobService.listAsync({type: this.type, includeValue: true});

        runInAction(() => (this.views = this.processRaw(rawViews)));

        const {objects} = this;
        // Auto-create an empty view if required
        if (!objects.length) {
            const newValue = await this.newObjectFn(),
                newObject = await XH.jsonBlobService.createAsync({
                    type: this.type,
                    name: `My ${this.capitalNoun}`,
                    value: newValue
                });
            runInAction(() => (this.views = this.processRaw([newObject])));
        }

        // Always call selectAsync to ensure pendingValue updated and onChangeAsync callback fired if needed
        const id = this.selectedObject?.id ?? this.objects[0].id;
        await this.selectAsync(id);
    }

    async selectAsync(id: StoreRecordId) {
        this.selectedId = id;
        if (!this.isDirty) return;

        const {value} = this;

        this.setPendingValue(value);
        await this.onChangeAsync(value);

        // If current value is empty, we know it is the auto-created default view -
        // save it to capture the default state.
        if (isEmpty(value)) {
            await this.saveAsync(true);
        }
    }

    async saveAsync(skipToast: boolean = false) {
        const {token, id} = this.selectedObject;
        if (this.isShared) {
            if (!(await this.confirmShareObjSaveAsync())) return;
        }
        try {
            await XH.jsonBlobService.updateAsync(token, {
                ...this.selectedObject,
                value: this.pendingValue
            });
        } catch (e) {
            return XH.handleException(e, {alertType: 'toast'});
        }
        await this.refreshAsync();
        await this.selectAsync(id);

        if (!skipToast) XH.successToast(`${capitalize(this.noun)} successfully saved.`);
    }

    async saveAsAsync() {
        const {name, description} = this.selectedObject;

        this.openSaveDialog({
            name,
            description,
            value: this.pendingValue,
            isAdd: false
        });
    }

    async createNewAsync() {
        const {name, description} = this.selectedObject,
            newValue = await this.newObjectFn();

        this.openSaveDialog({
            name,
            description,
            value: newValue,
            isAdd: true
        });
    }

    @action
    openSaveDialog(objStub: ObjStub) {
        this.saveDialogModel = new SaveDialogModel(this, objStub);
    }

    @action
    closeSaveDialog() {
        const {saveDialogModel} = this;
        this.saveDialogModel = null;
        XH.safeDestroy(saveDialogModel);
    }

    async resetAsync() {
        return this.selectAsync(this.selectedId);
    }

    @action
    openManageDialog() {
        this.manageDialogModel = new ManageDialogModel(this);
    }

    @action
    closeManageDialog() {
        const {manageDialogModel} = this;
        this.manageDialogModel = null;
        XH.safeDestroy(manageDialogModel);
    }

    //------------------
    // Implementation
    //------------------
    mergePendingValue(value: PlainObject) {
        value = {...this.pendingValue, ...this.cleanValue(value)};
        this.setPendingValue(value);
    }

    processRaw(raw: PlainObject): PlainObject[] {
        const {capitalPluralNoun: noun} = this;
        return raw.map(it => {
            it.isShared = it.acl === '*';
            const group = it.isShared ? `Shared ${noun}` : `My ${noun}`;
            return {...it, group};
        });
    }

    @action
    setPendingValue(value: PlainObject) {
        value = this.cleanValue(value);
        if (!this.isEqualSkipAutosize(this.pendingValue, value)) {
            this.pendingValue = value;
        }
    }

    cleanValue(value: PlainObject): PlainObject {
        // Stringify and parse to ensure that the value is valid JSON
        // (i.e. no object instances, no keys with undefined values, etc.)
        return JSON.parse(JSON.stringify(value));
    }

    isEqualSkipAutosize(a, b) {
        // Skip spurious column autosize differences between states
        const comparer = (aVal, bVal, key, aObj) => {
            if (key === 'width' && !isNil(aObj.colId) && !aObj.manuallySized) return true;
            return undefined;
        };
        return isEqualWith(a, b, comparer);
    }

    async confirmShareObjSaveAsync() {
        return XH.confirm({
            message: `You are saving a shared public ${this.noun}. Do you wish to continue?`,
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
}
