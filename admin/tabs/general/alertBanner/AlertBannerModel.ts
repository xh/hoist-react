/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {AppModel} from '@xh/hoist/admin/AppModel';
import {BannerModel} from '@xh/hoist/appcontainer/BannerModel';
import {FormModel} from '@xh/hoist/cmp/form';
import {fragment, p} from '@xh/hoist/cmp/layout';
import {HoistModel, Intent, LoadSpec, managed, PlainObject, XH} from '@xh/hoist/core';
import {dateIs, required} from '@xh/hoist/data';
import {action, bindable, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {AlertBannerIconName, AlertBannerSpec} from '@xh/hoist/svc';
import {isEqual, isMatch, sortBy, without} from 'lodash';

export class AlertBannerModel extends HoistModel {
    savedValue: AlertBannerSpec;
    @bindable.ref savedPresets: PlainObject[] = [];

    @managed
    formModel = new FormModel({
        disabled: AppModel.readonly,
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
            {
                name: 'clientApps',
                displayName: 'Client Apps',
                initialValue: []
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

    get iconOptions(): AlertBannerIconName[] {
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
                formModel.values.enableClose,
                formModel.values.clientApps
            ],
            run: () => this.syncPreview(),
            fireImmediately: true
        });
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        await this.loadPresetsAsync();
        const {formModel} = this;
        if (formModel.isDirty && loadSpec.isAutoRefresh) return;

        const value = await XH.fetchJson({url: 'alertBannerAdmin/alertSpec'}),
            initialValues = {
                ...value,
                expires: value.expires ? new Date(value.expires) : null
            };

        this.savedValue = value;
        formModel.init(initialValues);
    }

    async saveAsync() {
        return this.saveInternalAsync().linkTo(this.loadObserver).catchDefault();
    }

    resetForm() {
        this.formModel.reset();
        this.refreshAsync();
    }

    loadPreset(preset: PlainObject) {
        this.formModel.setValues({...preset, expires: null});
    }

    addPreset() {
        const {message, intent, iconName, enableClose, clientApps} = this.formModel.values,
            dateCreated = Date.now(),
            createdBy = XH.getUsername();
        this.savedPresets = sortBy(
            [
                ...this.savedPresets,
                {message, intent, iconName, enableClose, clientApps, dateCreated, createdBy}
            ],
            ['intent', 'message']
        );
        this.savePresetsAsync();
    }

    @action
    removePreset(preset: PlainObject) {
        XH.confirm({
            message: 'Are you sure you want to delete this preset?',
            confirmProps: {
                text: 'Remove',
                intent: 'danger',
                outlined: true,
                autoFocus: false
            },
            onConfirm: () => {
                this.savedPresets = without(this.savedPresets, preset);
                this.savePresetsAsync();
            }
        });
    }

    @computed
    get isCurrentValuesFoundInPresets() {
        const {message, intent, iconName, enableClose, clientApps} = this.formModel.values;
        return this.savedPresets.some(
            preset =>
                /*
                    We also check equality of sets rather than just arrays for clientApps where targeted apps are the same,
                    but order is not guaranteed (['app', 'admin'] vs ['admin', 'app']).
                 */
                isMatch(preset, {message, intent, iconName, enableClose}) &&
                isEqual(new Set(preset.clientApps), new Set(clientApps))
        );
    }

    @computed
    get shouldDisableAddPreset(): boolean {
        return !this.formModel.fields.message.value || this.isCurrentValuesFoundInPresets;
    }

    async loadPresetsAsync() {
        try {
            this.savedPresets = await XH.fetchJson({url: 'alertBannerAdmin/alertPresets'});
        } catch (e) {
            XH.handleException(e);
        }
    }

    async savePresetsAsync() {
        try {
            await XH.fetchService.postJson({
                url: 'alertBannerAdmin/setAlertPresets',
                body: this.savedPresets
            });
        } catch (e) {
            XH.handleException(e);
        }
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
            {active, message, intent, iconName, enableClose, clientApps, expires, created} =
                formModel.getData();

        await formModel.validateAsync();
        if (!formModel.isValid) return;

        let preservedPublishDate = null;

        // Ask some questions if we are dealing with live stuff
        if (active || savedValue?.active) {
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
                    p('This change will modify a live banner for all users of this application.'),
                    p('Are you sure you want to do this?')
                ),
                confirmProps: {
                    text: 'Yes, modify the banner',
                    intent: 'primary',
                    outlined: true,
                    autoFocus: false
                }
            });
            if (!finalConfirm) return;
        }

        const now = Date.now(),
            value: AlertBannerSpec = {
                active,
                message,
                intent,
                iconName,
                enableClose,
                clientApps,
                expires: expires?.getTime(),
                publishDate: preservedPublishDate ?? now,
                created: created ?? now,
                updated: now,
                updatedBy: XH.getUsername()
            };

        await this.saveBannerSpecAsync(value);
        await XH.environmentService.pollServerAsync();
        await this.refreshAsync();
    }

    private async saveBannerSpecAsync(spec: AlertBannerSpec) {
        const {active, message, intent, iconName, enableClose, clientApps} = spec;
        try {
            await XH.fetchService.postJson({
                url: 'alertBannerAdmin/setAlertSpec',
                body: spec,
                track: {
                    category: 'Audit',
                    message: 'Updated Alert Banner',
                    data: {active, message, intent, iconName, enableClose, clientApps},
                    logData: ['active']
                }
            });
        } catch (e) {
            XH.handleException(e);
        }
    }
}
