/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH} from '@xh/hoist/core';
import {action, observable, makeObservable} from '@xh/hoist/mobx';
import {stripTags} from '@xh/hoist/utils/js';

/**
 * Manages built-in collection of user feedback.
 * @internal
 */
export class FeedbackDialogModel extends HoistModel {
    override xhImpl = true;

    @observable isOpen: boolean = false;
    @observable message: string = null;

    constructor() {
        super();
        makeObservable(this);
    }

    init() {
        this.addReaction({
            track: () => XH.routerState,
            run: () => this.hide()
        });
    }

    @action
    show({message = null} = {}) {
        this.message = message;
        this.isOpen = true;
    }

    @action
    hide() {
        this.isOpen = false;
        this.message = null;
    }

    @action
    setMessage(message: string) {
        this.message = stripTags(message);
    }

    /**
     * Submit the feedback entry to the activity tracking system.
     */
    async submitAsync() {
        const {message} = this,
            {trackService} = XH;

        if (!message) this.hide();

        try {
            trackService.track({
                category: 'Feedback',
                message: 'User submitted feedback',
                data: {
                    userMessage: this.message
                }
            });
            trackService.pushPendingAsync().linkTo(XH.appLoadModel);
            XH.successToast('Thank you - your feedback has been sent.');
            this.hide();
        } catch (e) {
            XH.handleException(e);
        }
    }
}
