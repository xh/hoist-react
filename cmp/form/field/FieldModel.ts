/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {BaseFieldModel} from './BaseFieldModel';

/**
 * Model for a data field within a Form. Specifies the field's name, user-facing label, validation
 * rules, and other properties. Holds the field's value as initialized by a parent FormModel or
 * updated by a user interacting with a bound FormField component.
 *
 * These models are typically created by passing configuration objects to the constructor of FormModel.
 * The parent Form/FormModel and the FormField component work together to bind to this model by name.
 */
export class FieldModel extends BaseFieldModel {}
