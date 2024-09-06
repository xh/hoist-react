import {FormModel} from '@xh/hoist/cmp/form';
import {HoistModel, managed, TaskObserver, XH} from '@xh/hoist/core';
import {lengthIs, required} from '@xh/hoist/data';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {PersistenceManagerModel} from '../PersistenceManagerModel';
import {PersistenceView} from '@xh/hoist/desktop/cmp/persistenceManager/Types';

export class SaveDialogModel extends HoistModel {
    readonly saveTask = TaskObserver.trackLast();
    private readonly type: string;

    parentModel: PersistenceManagerModel;

    @bindable viewStub: Partial<PersistenceView>;
    @bindable isOpen: boolean = false;
    @bindable isNewAdd: boolean;

    @managed readonly formModel = this.createFormModel();

    constructor(parentModel: PersistenceManagerModel, type: string) {
        super();
        makeObservable(this);

        this.parentModel = parentModel;
        this.type = type;
    }

    open(viewStub: Partial<PersistenceView>, isNewAdd: boolean = false) {
        this.isNewAdd = isNewAdd;
        this.viewStub = viewStub;

        this.formModel.init({
            name: isNewAdd ? `` : `${viewStub.name} (COPY)`,
            description: isNewAdd ? `` : viewStub.description
        });

        this.isOpen = true;
    }

    close() {
        this.isOpen = false;
        this.formModel.init();
    }

    async saveAsAsync() {
        return this.doSaveAsAsync().linkTo(this.saveTask);
    }

    //------------------------
    // Implementation
    //------------------------

    createFormModel(): FormModel {
        return new FormModel({
            fields: [
                {
                    name: 'name',
                    rules: [
                        required,
                        lengthIs({max: 255}),
                        ({value}) => {
                            if (this.parentModel?.views.find(it => it.name === value)) {
                                return `An entry with name "${value}" already exists`;
                            }
                        }
                    ]
                },
                {name: 'description'}
            ]
        });
    }

    async doSaveAsAsync() {
        const {formModel, parentModel, viewStub, type} = this,
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

            await parentModel.refreshAsync();
            await parentModel.selectAsync(newObj.id);
        } catch (e) {
            XH.handleException(e);
        }
    }
}
