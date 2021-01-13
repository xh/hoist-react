/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistBase} from './HoistBase';

/**
 * Core class for State Models in Hoist.
 *
 * Adds support for managed events and mobx reactivity.
 *
 * A common use of HoistModel is to serve as a backing store for a HoistComponent.  Furthermore, if
 * a model is *created* by a HoistComponent it is considered to be 'owned' (or "hosted") by that
 * component.  An owned model will be automatically destroyed when its component is unmounted.
 *
 * HoistModels that need to load/refresh may implement doLoadAsync().  See HoistBase for more
 * information.  If specified, this method will be used to load data into the model when its
 * component is first mounted.  It will also register the model with the nearest
 * RefreshContextModel for subsequent refreshes.
 */
export class HoistModel extends HoistBase {

    get isHoistModel() {return true}

}
HoistModel.isHoistModel = true;