/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import React from 'react';

/**
 * Context establishing an area of the app that can be independently refreshed.
 *
 * This react context publishes a RefreshContextModel which is the main entry point for
 * application control of Refresh.
 *
 * Hoist provides a default top-level context available to apps via XH.refreshContextModel.
 * Sub-contexts may be established with a RefreshContextView.
 *
 * @see RefreshContextModel
 * @see RefreshContextView
 */
export const RefreshContext = React.createContext(null);


