import {FormModel} from '@xh/hoist/cmp/form';
import {HoistModel, managed, TaskObserver, XH} from '@xh/hoist/core';
import {ViewManagerModel} from '@xh/hoist/core/persist/viewmanager';
import {lengthIs, required} from '@xh/hoist/data';
import {makeObservable} from '@xh/hoist/mobx';
import {action, observable} from 'mobx';
import {View} from '../View';

export class SaveDialogModel extends HoistModel {
    private readonly viewManagerModel: ViewManagerModel;

    @managed readonly formModel: FormModel;
    readonly saveTask = TaskObserver.trackLast();

    @observable view: Partial<View>;
    @observable isOpen: boolean = false;

    private resolveOpen: (value: View) => void;

    get type(): string {
        return this.viewManagerModel.viewType;
    }

    get typeDisplayName(): string {
        return this.viewManagerModel.typeDisplayName;
    }

    get globalDisplayName(): string {
        return this.viewManagerModel.globalDisplayName;
    }

    constructor(viewManagerModel: ViewManagerModel) {
        super();
        makeObservable(this);
        this.viewManagerModel = viewManagerModel;
        this.formModel = this.createFormModel();
    }

    @action
    openAsync(view: Partial<View>): Promise<View> {
        this.view = view;

        this.formModel.init(view.info ?? {});
        this.isOpen = true;

        return new Promise(resolve => (this.resolveOpen = resolve));
    }

    cancel() {
        this.close();
        this.resolveOpen(null);
    }

    async saveAsAsync() {
        return this.doSaveAsAsync().linkTo(this.saveTask);
    }

    //------------------------
    // Implementation
    //------------------------
    private createFormModel(): FormModel {
        return new FormModel({
            fields: [
                {
                    name: 'name',
                    rules: [
                        required,
                        lengthIs({max: 255}),
                        ({value}) => {
                            if (this.viewManagerModel.views.some(view => view.name === value)) {
                                return `An entry with name "${value}" already exists`;
                            }
                        }
                    ]
                },
                {name: 'description'}
            ]
        });
    }

    private async doSaveAsAsync() {
        const {formModel, view, type} = this,
            {name, description} = formModel.getData(),
            isValid = await formModel.validateAsync();

        if (!isValid) return;

        try {
            const newObj = await XH.jsonBlobService.createAsync({
                type,
                name,
                description,
                value: view.value
            });
            this.close();
            this.resolveOpen(this.viewManagerModel.blobToView(newObj));
        } catch (e) {
            XH.handleException(e);
        }
    }

    @action
    private close() {
        this.isOpen = false;
        this.formModel.init();
    }
}
