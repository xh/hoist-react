import {FormModel} from '@xh/hoist/cmp/form';
import {HoistModel, managed, PlainObject, TaskObserver, XH} from '@xh/hoist/core';
import {lengthIs, required} from '@xh/hoist/data';
import {makeObservable} from '@xh/hoist/mobx';
import {PersistenceManagerModel} from '../PersistenceManagerModel';

export class SaveDialogModel extends HoistModel {
    parentModel: PersistenceManagerModel;

    @managed
    readonly formModel = this.createFormModel();
    readonly saveTask = TaskObserver.trackLast();
    readonly objStub: ObjStub;

    get isAdd(): boolean {
        return !!this.objStub?.isAdd;
    }

    constructor(parentModel: PersistenceManagerModel, objStub: ObjStub) {
        super();
        makeObservable(this);

        this.parentModel = parentModel;
        this.objStub = objStub;
        this.formModel.init({
            name: this.isAdd ? `` : `${objStub.name} (COPY)`,
            description: this.isAdd ? `` : objStub.description
        });
    }

    close() {
        this.parentModel.closeSaveDialog();
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
                            if (this.parentModel?.objects.find(it => it.name === value)) {
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
        const {formModel, parentModel, objStub} = this,
            {name, description} = formModel.getData(),
            isValid = await formModel.validateAsync();

        if (!isValid) return;

        try {
            const newObj = await XH.jsonBlobService
                .createAsync({
                    type: this.parentModel.type,
                    name,
                    description,
                    value: objStub.value
                })
                .catchDefault();

            await parentModel.refreshAsync();
            await parentModel.selectAsync(newObj.id);
            this.close();
        } catch (e) {
            XH.handleException(e);
        }
    }
}

export interface ObjStub {
    name: string;
    description: string;
    value: PlainObject;
    isAdd: boolean;
}
