import {lm} from '../ns.js';

/**
 * An EventEmitter wrapper used to broker layout-wide events.
 *
 * Originally designed to propagate events across multiple browser windows
 * (parent layout + popout children). Cross-window propagation has been
 * removed along with BrowserPopout; this is now a thin shim over
 * EventEmitter that retains the same constructor signature.
 *
 * @constructor
 *
 * @param {lm.LayoutManager} layoutManager
 */
lm.utils.EventHub = function( layoutManager ) {
	lm.utils.EventEmitter.call( this );
	this._layoutManager = layoutManager;
};

/**
 * Destroys the EventHub
 *
 * @public
 * @returns {void}
 */
lm.utils.EventHub.prototype.destroy = function() {};
