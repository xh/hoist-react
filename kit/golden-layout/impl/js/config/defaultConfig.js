import {lm} from '../ns.js';

lm.config.defaultConfig = {
	settings: {
		hasHeaders: true,
		constrainDragToContainer: true,
		reorderEnabled: true,
		selectionEnabled: false,
		showMaximiseIcon: true,
		showCloseIcon: true,
		responsiveMode: 'onload', // Can be onload, always, or none.
		tabOverlapAllowance: 0, // maximum pixel overlap per tab
		reorderOnTabMenuClick: true,
		tabControlOffset: 10
	},
	dimensions: {
		borderWidth: 5,
		borderGrabWidth: 15,
		minItemHeight: 10,
		minItemWidth: 10,
		headerHeight: 20,
		dragProxyWidth: 300,
		dragProxyHeight: 200
	},
	labels: {
		close: 'close',
		maximise: 'maximise',
		minimise: 'minimise',
		tabDropdown: 'additional tabs'
	}
};
