import {FormModel} from '@xh/hoist/cmp/form';
import {HoistModel, managed, TaskObserver, XH} from '@xh/hoist/core';
import {ViewManagerModel} from '@xh/hoist/core/persist/viewmanager';
import {lengthIs, required} from '@xh/hoist/data';
import {makeObservable} from '@xh/hoist/mobx';
import {JsonBlob} from '@xh/hoist/svc';
import {action, observable} from 'mobx';
import {View} from '../Types';

export class SaveDialogModel extends HoistModel {
    private readonly viewManagerModel: ViewManagerModel;

    @managed readonly formModel: FormModel;
    readonly saveTask = TaskObserver.trackLast();

    @observable viewStub: Partial<View>;
    @observable isOpen: boolean = false;

    private resolveOpen: (value: JsonBlob) => void;
    private invalidNames: string[] = [];

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
    openAsync(viewStub: Partial<View>, invalidNames: string[]): Promise<JsonBlob> {
        this.viewStub = viewStub;
        this.invalidNames = invalidNames;

        this.formModel.init({
            name: viewStub.name ?? '',
            description: viewStub.description
        });

        this.isOpen = true;

        return new Promise(resolve => {
            this.resolveOpen = resolve;
        });
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
                            if (this.invalidNames.includes(value)) {
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
        const {formModel, viewStub, type} = this,
            {name, description} = formModel.getData(),
            isValid = await formModel.validateAsync();

        if (!isValid) return;

        try {
            const newObj = await XH.jsonBlobService.createAsync({
                type,
                name,
                description,
                value: viewStub.value
            });
            this.close();
            this.resolveOpen(newObj);
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
