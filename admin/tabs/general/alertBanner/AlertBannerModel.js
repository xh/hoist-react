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

        this.addReaction({
            track: () => [
                this.formModel.values.message,
                this.formModel.values.intent,
                this.formModel.values.iconName,
                this.formModel.values.enableClose
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

        // Force admin to confirm if actually activating a banner.
        let confirmed = true;
        if (XH.alertBannerService.enabled && active && !savedValue?.active) {
            confirmed = await XH.confirm({
                message: fragment(
                    p('This change will cause the previewed alert banner to be shown to ALL users of this application.'),
                    p('Are you sure you wish to do this?')
                ),
                confirmProps: {
                    text: 'Yes, show the banner',
                    intent: 'primary',
                    outlined: true
                }
            });
        }
        if (!confirmed) return;

        // Ask admin if they want to reshow when modifying an already active banner
        let id = savedValue?.id ?? 1;
        if (savedValue?.active && savedValue?.enableClose) {
            const incrementId = await XH.confirm({
                message: p('Show banner again for users who have already closed?'),
                cancelProps: {
                    text: 'Save',
                    outlined: true,
                    autoFocus: false
                },
                confirmProps: {
                    text: 'Save and show again',
                    outlined: true,
                    autoFocus: false
                }
            });
            if (incrementId) id++;
        }

        const payload = {
            type: 'xhAlertBanner',
            name: 'xhAlertBanner',
            description: 'Configuration for system alert banner, managed through the admin console.',
            value: {
                id,
                active,
                message,
                intent,
                iconName,
                enableClose,
                expires: expires?.getTime(),
                created: created ?? Date.now(),
                updated: Date.now(),
                updatedBy: XH.getUsername()
            }
        };

        if (token) {
            await XH.jsonBlobService.updateAsync(token, payload);
        } else {
            await XH.jsonBlobService.createAsync(payload);
        }

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
