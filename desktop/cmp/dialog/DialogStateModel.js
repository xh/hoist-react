/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel} from '@xh/hoist/core';
import {cloneDeep, debounce, isUndefined} from 'lodash';
import {start} from '@xh/hoist/promise';

/**
 * Model for serializing/de-serializing saved dialog state across user browsing sessions
 * and applying saved state to its parent DialogModel upon that model's construction.
 *
 * DialogModels can enable persistent dialog state via their stateModel config, typically
 * provided as a simple string `dialogId` to identify a given dialog instance.
 *
 * It is not necessary to manually create instances of this class within an application.
 * @private
 */
@HoistModel
export class DialogStateModel {

    /**
     * Version of dialog state definitions currently supported by this model.
     * Increment *only* when we need to abandon all existing dialog state that might be saved on
     * user workstations to ensure compatibility with a new serialization or approach.
     */
    static DIALOG_STATE_VERSION = 1;
    static STATE_SAVE_DEBOUNCE_MS = 500;

    dialogModel = null;
    dialogId = null;

    state = {};
    defaultState = null;

    /**
     * @param {Object} c - DialogStateModel configuration.
     * @param {string} c.dialogId - unique identifier for a Dialog instance.
     * @param {boolean} [c.trackSize] - true to save state of dialog width and height.
     * @param {boolean} [c.trackPosition] - true to save x & y position.
     * @param {boolean} [c.trackIsMaximized] - true to save maximized state.
     */
    constructor({dialogId, trackSize = true, trackPosition = true, trackIsMaximized = true}) {
        this.dialogId = dialogId;
        this.trackSize = trackSize;
        this.trackPosition = trackPosition;
        this.trackIsMaximized = trackIsMaximized;
    }

    init(dialogModel) {
        this.dialogModel = dialogModel;

        if (this.trackSize) {
            this.addReaction(this.sizeReaction());
        }

        if (this.trackPosition) {
            this.addReaction(this.positionReaction());
        }

        if (this.trackIsMaximized) {
            this.addReaction(this.isMaximizedReaction());
        }

        this.initializeState();
    }

    getStateKey() {
        return `dialogState.v${DialogStateModel.DIALOG_STATE_VERSION}.${this.dialogId}`;
    }

    readState(stateKey) {
        return XH.localStorageService.get(stateKey, {});
    }

    saveState(stateKey, state) {
        XH.localStorageService.set(stateKey, state);
    }

    resetState(stateKey) {
        XH.localStorageService.remove(stateKey);
    }

    resetStateAsync() {
        return start(() => {
            this.loadState(this.defaultState);
            this.resetState(this.getStateKey());
        });
    }

    //--------------------------
    // Implementation
    //--------------------------
    initializeState() {
        const userState = this.readState(this.getStateKey());
        // this.defaultState = this.readStateFromDialog();

        this.loadState(userState);
    }

    readStateFromDialog() {
        const {dialogModel} = this;
        return {
            size: {...dialogModel.sizeState},
            position: {...dialogModel.positionState},
            isMaximized: dialogModel.isMaximizedState
        };
    }

    // todo
    loadState(state) {
        this.state = cloneDeep(state);
        if (this.trackSize) this.updateSize();
        if (this.trackPosition) this.updatePosition();
        if (this.trackIsMaximized) this.updateIsMaximized();
    }

    //--------------------------
    // Size
    //--------------------------
    sizeReaction() {
        return {
            track: () => this.dialogModel.sizeState,
            run: (sizeState) => {
                this.state.size = {...sizeState};
                this.saveStateChange();
            }
        };
    }

    updateSize() {
        const {dialogModel, state} = this;
        if (!state.size) return;

        dialogModel.setSizeState(state.size);
    }

    //--------------------------
    // Position
    //--------------------------
    positionReaction() {
        const {dialogModel} = this;
        return {
            track: () => dialogModel.positionState,
            run: (positionState) => {
                this.state.position = {...positionState};
                this.saveStateChange();
            }
        };
    }

    updatePosition() {
        const {dialogModel, state} = this;
        if (!state.position) return;

        dialogModel.setPositionState(state.position);
    }

    //--------------------------
    // Mazimized
    //--------------------------
    isMaximizedReaction() {
        return {
            track: () => this.dialogModel.isMaximizedState,
            run: (isMaximizedState) => {
                this.state.isMaximized = isMaximizedState;
                this.saveStateChange();
            }
        };
    }

    updateIsMaximized() {
        const {dialogModel, state} = this;
        if (isUndefined(state.isMaximized)) return;

        dialogModel.setIsMaximizedState(state.isMaximized);
    }

    //--------------------------
    // Helper
    //--------------------------
    saveStateChange = debounce(() => {
        this.saveState(this.getStateKey(), this.state);
    }, DialogStateModel.STATE_SAVE_DEBOUNCE_MS);
}