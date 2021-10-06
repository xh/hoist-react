/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed, XH} from '@xh/hoist/core';
import {action, observable, makeObservable} from '@xh/hoist/mobx';
import {FormModel} from '@xh/hoist/cmp/form';
import {dateIs, lengthIs, required} from '@xh/hoist/data';
import {BannerModel} from '@xh/hoist/appcontainer/BannerModel';
import {Icon} from '@xh/hoist/icon';
import {isEmpty} from 'lodash';

export class AlertBannerModel extends HoistModel {

    token;

    @managed
    formModel = new FormModel({
        fields: [
            {
                name: 'active'
            },
            {
                name: 'message',
                rules: [required, lengthIs({max: 200})]
            },
            {
                name: 'intent',
                displayName: 'Color',
                initialValue: 'primary',
                rules: [required]
            },
            {
                name: 'iconName'
            },
            {
                name: 'expires',
                rules: [dateIs({min: 'now'})]
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
            {value: 'primary', label: 'Default (Blue)'},
            {value: 'success', label: 'Success (Green)'},
            {value: 'warning', label: 'Warning (Orange)'},
            {value: 'danger', label: 'Danger (Red)'}
        ];
    }

    get iconOptions() {
        return [
            {value: 'bullhorn', label: 'Alert'},
            {value: 'check-circle', label: 'Success'},
            {value: 'exclamation-triangle', label: 'Warning'},
            {value: 'times-circle', label: 'Cancel'},
            {value: 'info-circle', label: 'Info'},
            {value: 'question-circle', label: 'Question'}
        ];
    }

    constructor() {
        super();
        makeObservable(this);

        this.addReaction({
            track: () => [
                this.formModel.values.message,
                this.formModel.values.intent,
                this.formModel.values.iconName
            ],
            run: () => this.syncPreview(),
            fireImmediately: true
        });
    }

    async doLoadAsync() {
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
        this.formModel.init(initialValues);
    }

    async saveAsync() {
        const {formModel, token} = this;

        await formModel.validateAsync();
        if (!formModel.isValid) return;

        const {active, message, intent, iconName, expires, created} = formModel.getData(),
            payload = {
                type: 'xhAlertBanner',
                name: 'xhAlertBanner',
                description: 'Configuration for system alert banner, managed through the admin console.',
                value: {
                    active,
                    message,
                    intent,
                    iconName,
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
        this.formModel.init({intent: 'primary'});
    }

    //----------------
    // Implementation
    //----------------
    @action
    syncPreview() {
        const {message, intent, iconName} = this.formModel.getData(),
            icon = iconName ? Icon.icon({iconName, size: 'lg'}) : null;

        this.bannerModel = new BannerModel({message, intent, icon});
    }
}