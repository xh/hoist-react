/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {BannerModel} from '@xh/hoist/appcontainer/BannerModel';
import {FormModel} from '@xh/hoist/cmp/form';
import {fragment, p} from '@xh/hoist/cmp/layout';
import {HoistModel, managed, XH} from '@xh/hoist/core';
import {dateIs, required} from '@xh/hoist/data';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {isEmpty} from 'lodash';

export class AlertBannerModel extends HoistModel {

    token;
    savedValue;

    @managed
    formModel = new FormModel({
        fields: [
            {name: 'active'},
            {
                name: 'message',
                initialValue: '',
                rules: [{when: (fs, {active}) => active, check: required}]
            },
            {
                name: 'intent',
                displayName: 'Color',
                initialValue: 'primary'
            },
            {name: 'iconName', displayName: 'Icon'},
            {
                name: 'expires',
                rules: [dateIs({min: 'now'})]
            },
            {
                name: 'enableClose',
                initialValue: true
            },
            {name: 'created', readonly: true},
            {name: 'updated', readonly: true},
            {name: 'updatedBy', readonly: true}
        ]
    })

    @managed
    @observable.ref
    bannerModel = null;

    get intentOptions() {
        return [
            'primary',
            'success',
            'warning',
            'danger'
        ];
    }

    get iconOptions() {
        return [
            'bullhorn',
            'check-circle',
            'exclamation-triangle',
            'times-circle',
            'info-circle',
            'question-circle'
        ];
    }

    constructor() {
        super();
        makeObservable(this);

        const {formModel} = this;
        this.addReaction({
            track: () => [
                formModel.values.message,
                formModel.values.intent,
                formModel.values.iconName,
                formModel.values.enableClose
            ],
            run: () => this.syncPreview(),
            fireImmediately: true
        });
    }

    async doLoadAsync(loadSpec) {
        const {formModel} = this;
        if (formModel.isDirty && loadSpec.isAutoRefresh) return;

        const results = await XH.jsonBlobService.listAsync({
            type: 'xhAlertBanner',
            includeValue: true
        });

        if (isEmpty(results)) return;

        const {token, value} = results[0],
            initialValues = {
                ...value,
                expires: value.expires ? new Date(value.expires) : null
            };

        this.token = token;
        this.savedValue = value;
        formModel.init(initialValues);
    }

    async saveAsync() {
        const {formModel, token, savedValue} = this,
            {active, message, intent, iconName, enableClose, expires, created} = formModel.getData();

        await formModel.validateAsync();
        if (!formModel.isValid) return;

        let preservedPublishDate = null;

        // Ask some questions if we are dealing with live stuff
        if (XH.alertBannerService.enabled && active) {
            // Question 1. Reshow when modifying an already active, closable banner?
            if (savedValue?.active && savedValue?.enableClose && savedValue?.publishDate) {
                const reshow = await XH.confirm({
                    message: fragment(
                        p('You are updating an already-active banner. Some users might have already read and closed this alert.'),
                        p('Choose below if you would like to show this banner again to all users, including those who have already closed it once.'),
                        p('(Users who have not yet seen or closed this alert will be shown the new version either way.)')
                    ),
                    cancelProps: {
                        text: 'Update quietly',
                        outlined: true,
                        autoFocus: false
                    },
                    confirmProps: {
                        text: 'Update and show again to all users',
                        intent: 'primary',
                        outlined: true,
                        autoFocus: false
                    }
                });
                if (!reshow) preservedPublishDate = savedValue.publishDate;
            }

            // Question 2.  Are you sure?
            const finalConfirm = await XH.confirm({
                message: fragment(
                    p('This change will immediately show or modify a LIVE banner for ALL users of this application.'),
                    p('Are you sure you wish to do this?')
                ),
                confirmProps: {
                    text: 'Yes, show the banner',
                    intent: 'primary',
                    outlined: true
                }
            });
            if (!finalConfirm) return;
        }

        const now = Date.now(),
            payload = {
                type: 'xhAlertBanner',
                name: 'xhAlertBanner',
                description: 'Configuration for system alert banner, managed through the admin console.',
                value: {
                    active,
                    message,
                    intent,
                    iconName,
                    enableClose,
                    expires: expires?.getTime(),
                    publishDate: preservedPublishDate ?? now,
                    created: created ?? now,
                    updated: now,
                    updatedBy: XH.getUsername()
                }
            };

        if (token) {
            await XH.jsonBlobService.updateAsync(token, payload);
        } else {
            await XH.jsonBlobService.createAsync(payload);
        }

        XH.track({
            category: 'Banner',
            message: 'Updated Alert Banner',
            data: {active, message, intent, iconName, enableClose}
        });

        await XH.alertBannerService.checkForBannerAsync();
        return this.refreshAsync();
    }

    resetForm() {
        this.formModel.reset();
        this.refreshAsync();
    }

    //----------------
    // Implementation
    //----------------
    @action
    syncPreview() {
        const conf = XH.alertBannerService.genBannerConfig(this.formModel.getData());
        this.bannerModel = new BannerModel(conf);
    }
}
