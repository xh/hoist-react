/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {observable, action} from '@xh/hoist/mobx';
import {MessageModel} from './MessageModel';

/**
 *  Main entry point for creating Message dialogs in Hoist.
 *
 *  Typically accessed via global alias XH.message() and XH.confirm().
 */
@HoistModel()
export class MessageSourceModel {

    @observable.ref msgModels = [];

    /**
     * Show a confirmation with cancellation options.
     *
     * @param {Object} [config] - options for display.  See MessageModel.confirm()
     */
    confirm(config) {
        const model = new MessageModel();
        model.confirm(config);
        this.addModel(model);
    }

    /**
     * Show a simple alert with no cancellation option.
     *
     * @param {Object} [config] - options for display.  See MessageModel.alert()
     */
    alert(config) {
        const model = new MessageModel();
        model.alert(config);
        this.addModel(model);
    }

    //-----------------------------------
    // Implementation
    //------------------------------------
    @action
    addModel(model) {
        // Add new model, and simultaneously cull any models we are done with.
        const newModels = [model];
        this.msgModels.forEach(it => {
            if (it.isOpen) {
                newModels.push(it);
            } else {
                it.destroy();
            }
        });
        this.msgModels = newModels;
    }
}