import {lm} from '../ns.js';
import {merge} from 'lodash';

lm.container.ItemContainer = function( config, parent, layoutManager ) {
	lm.utils.EventEmitter.call( this );

	this.width = null;
	this.height = null;
	this.title = config.componentName;
	this.parent = parent;
	this.layoutManager = layoutManager;
	this.isHidden = false;

	this._config = config;

	this._element = document.createElement( 'div' );
	this._element.className = 'lm_item_container';
	this._contentElement = document.createElement( 'div' );
	this._contentElement.className = 'lm_content';
	this._element.appendChild( this._contentElement );
};

lm.utils.copy( lm.container.ItemContainer.prototype, {

	/**
	 * Get the inner DOM element the container's content
	 * is intended to live in
	 *
	 * @returns {DOM element}
	 */
	getElement: function() {
		return this._contentElement;
	},

	/**
	 * Hide the container. Notifies the containers content first
	 * and then hides the DOM node. If the container is already hidden
	 * this should have no effect
	 *
	 * @returns {void}
	 */
	hide: function() {
		this.emit( 'hide' );
		this.isHidden = true;
		this._element.style.display = 'none';
	},

	/**
	 * Shows a previously hidden container. Notifies the
	 * containers content first and then shows the DOM element.
	 * If the container is already visible this has no effect.
	 *
	 * @returns {void}
	 */
	show: function() {
		this.emit( 'show' );
		this.isHidden = false;
		// .lm_item_container has no display rule, so reverting to UA default
		// (block for div) by clearing the inline value matches jQuery .show().
		this._element.style.display = '';
		// call shown only if the container has a valid size
		if( this.height != 0 || this.width != 0 ) {
			this.emit( 'shown' );
		}
	},

	/**
	 * Set the size from within the container. Traverses up
	 * the item tree until it finds a row or column element
	 * and resizes its items accordingly.
	 *
	 * If this container isn't a descendant of a row or column
	 * it returns false
	 * @todo  Rework!!!
	 * @param {Number} width  The new width in pixel
	 * @param {Number} height The new height in pixel
	 *
	 * @returns {Boolean} resizeSuccesful
	 */
	setSize: function( width, height ) {
		var rowOrColumn = this.parent,
			rowOrColumnChild = this,
			totalPixel,
			percentage,
			direction,
			newSize,
			delta,
			i;

		while( !rowOrColumn.isColumn && !rowOrColumn.isRow ) {
			rowOrColumnChild = rowOrColumn;
			rowOrColumn = rowOrColumn.parent;


			/**
			 * No row or column has been found
			 */
			if( rowOrColumn.isRoot ) {
				return false;
			}
		}

		direction = rowOrColumn.isColumn ? "height" : "width";
		newSize = direction === "height" ? height : width;

		totalPixel = this[ direction ] * ( 1 / ( rowOrColumnChild.config[ direction ] / 100 ) );
		percentage = ( newSize / totalPixel ) * 100;
		delta = ( rowOrColumnChild.config[ direction ] - percentage ) / (rowOrColumn.contentItems.length - 1);

		for( i = 0; i < rowOrColumn.contentItems.length; i++ ) {
			if( rowOrColumn.contentItems[ i ] === rowOrColumnChild ) {
				rowOrColumn.contentItems[ i ].config[ direction ] = percentage;
			} else {
				rowOrColumn.contentItems[ i ].config[ direction ] += delta;
			}
		}

		rowOrColumn.callDownwards( 'setSize' );

		return true;
	},

	/**
	 * Closes the container if it is closable. Can be called by
	 * both the component within at as well as the contentItem containing
	 * it. Emits a close event before the container itself is closed.
	 *
	 * @returns {void}
	 */
	close: function() {
		if( this._config.isClosable ) {
			this.emit( 'close' );
			this.parent.close();
		}
	},

	/**
	 * Returns the current state object
	 *
	 * @returns {Object} state
	 */
	getState: function() {
		return this._config.componentState;
	},

	/**
	 * Merges the provided state into the current one
	 *
	 * @param   {Object} state
	 *
	 * @returns {void}
	 */
	extendState: function( state ) {
		this.setState( merge( this.getState(), state ) );
	},

	/**
	 * Notifies the layout manager of a stateupdate
	 *
	 * @param {serialisable} state
	 */
	setState: function( state ) {
		this._config.componentState = state;
		this.parent.emitBubblingEvent( 'stateChanged' );
	},

	/**
	 * Set's the components title
	 *
	 * @param {String} title
	 */
	setTitle: function( title ) {
		this.parent.setTitle( title );
	},

	/**
	 * Set's the containers size. Called by the container's component.
	 * To set the size programmatically from within the container please
	 * use the public setSize method
	 *
	 * @param {[Int]} width  in px
	 * @param {[Int]} height in px
	 *
	 * @returns {void}
	 */
	_$setSize: function( width, height ) {
		if( width !== this.width || height !== this.height ) {
			this.width = width;
			this.height = height;
			var cl = this._contentElement;
			var hdelta = cl.offsetWidth - cl.clientWidth;
			var vdelta = cl.offsetHeight - cl.clientHeight;
			cl.style.width = ( this.width - hdelta ) + 'px';
			cl.style.height = ( this.height - vdelta ) + 'px';
			this.emit( 'resize' );
		}
	}
} );
