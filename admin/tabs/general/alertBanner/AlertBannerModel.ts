/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {BannerModel} from '@xh/hoist/appcontainer/BannerModel';
import {FormModel} from '@xh/hoist/cmp/form';
import {fragment, p} from '@xh/hoist/cmp/layout';
import {HoistModel, LoadSpec, managed, XH, Intent} from '@xh/hoist/core';
import {dateIs, required} from '@xh/hoist/data';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {AppModel} from '@xh/hoist/admin/AppModel';

export class AlertBannerModel extends HoistModel {
    savedValue;
    savedPresets;

    @managed
    formModel = new FormModel({
        readonly: AppModel.readonly,
        fields: [
            {name: 'active'},
            {
                name: 'presets',
                initialValue: '',
                displayName: 'Presets'
            },
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
    });

    @managed
    @observable.ref
    bannerModel = null;

    get intentOptions(): Intent[] {
        return ['primary', 'success', 'warning', 'danger'];
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

    override async doLoadAsync(loadSpec: LoadSpec) {
        const {formModel} = this;
        if (formModel.isDirty && loadSpec.isAutoRefresh) return;

        // DEBUG
        console.log('fm', formModel);

        const value = await XH.fetchJson({url: 'alertBannerAdmin/alertSpec'}),
            // presets = await XH.fetchJson({url: 'alertBannerAdmin/alertPresets'}),
            initialValues = {
                ...value,
                expires: value.expires ? new Date(value.expires) : null
            };

        this.savedValue = value;
        formModel.init(initialValues);
    }

    async saveAsync() {
        return this.saveInternalAsync().linkTo(this.loadModel).catchDefault();
    }

    resetForm() {
        this.formModel.reset();
        this.refreshAsync();
    }

    //----------------
    // Implementation
    //----------------
    @action
    private syncPreview() {
        const vals = this.formModel.values,
            conf = XH.alertBannerService.genBannerSpec(
                vals.message,
                vals.intent,
                vals.iconName,
                vals.enableClose
            );
        this.bannerModel = new BannerModel(conf);
    }

    private async saveInternalAsync() {
        const {formModel, savedValue} = this,
            {active, message, intent, iconName, enableClose, expires, created} =
                formModel.getData();

        await formModel.validateAsync();
        if (!formModel.isValid) return;

        let preservedPublishDate = null;

        // Ask some questions if we are dealing with live stuff
        if (XH.alertBannerService.enabled && (active || savedValue?.active)) {
            // Question 1. Reshow when modifying an active && already active, closable banner?
            if (
                active &&
                savedValue?.active &&
                savedValue?.enableClose &&
                savedValue?.publishDate
            ) {
                const reshow = await XH.confirm({
                    message: fragment(
                        p(
                            'You are updating an already-active banner. Some users might have already read and closed this alert.'
                        ),
                        p(
                            'Choose below if you would like to show this banner again to all users, including those who have already closed it once.'
                        ),
                        p(
                            '(Users who have not yet seen or closed this alert will be shown the new version either way.)'
                        )
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
                    p('This change will modify a LIVE banner for ALL users of this application.'),
                    p('Are you sure you wish to do this?')
                ),
                confirmProps: {
                    text: 'Yes, modify the banner',
                    intent: 'primary',
                    outlined: true
                }
            });
            if (!finalConfirm) return;
        }

        const now = Date.now(),
            value = {
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
            };

        await XH.fetchJson({
            url: 'alertBannerAdmin/setAlertSpec',
            params: {value: JSON.stringify(value)}
        }).track({
            category: 'Audit',
            message: 'Updated Alert Banner',
            data: {active, message, intent, iconName, enableClose}
        });

        await XH.alertBannerService.checkForBannerAsync();
        await this.refreshAsync();
    }
}
