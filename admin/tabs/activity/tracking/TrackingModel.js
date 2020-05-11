import {HoistModel, LoadSupport} from '../../../../core';
import {ActivityGridModel} from './ActivityGridModel';
import {VisitsChartModel} from './VisitsChartModel';

@HoistModel
@LoadSupport
export class TrackingModel {

    activityGridModel = new ActivityGridModel()
    visitsChartModel = new VisitsChartModel()
}