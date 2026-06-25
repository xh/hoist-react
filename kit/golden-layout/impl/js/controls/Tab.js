import {lm} from '../ns.js';

/**
 * Represents an individual tab within a Stack's header
 *
 * @param {lm.controls.Header} header
 * @param {lm.items.AbstractContentItem} contentItem
 *
 * @constructor
 */
lm.controls.Tab = function( header, contentItem ) {
	this.header = header;
	this.contentItem = contentItem;

	var template = document.createElement( 'template' );
	template.innerHTML = lm.controls.Tab._template;
	this.element = template.content.firstElementChild;
	this._titleNode = this.element.querySelector( '.lm_title' );
	this._closeNode = this.element.querySelector( '.lm_close_tab' );
	if( !contentItem.config.isClosable ) {
		this._closeNode.style.display = 'none';
	}
	this.isActive = false;

	this.setTitle( contentItem.config.title );
	this.contentItem.on( 'titleChanged', this.setTitle, this );

	this._layoutManager = this.contentItem.layoutManager;

	if(
		this._layoutManager.config.settings.reorderEnabled === true &&
		contentItem.config.reorderEnabled === true
	) {
		this._dragListener = new lm.utils.DragListener( this.element );
		this._dragListener.on( 'dragStart', this._onDragStart, this );
		this.contentItem.on( 'destroy', this._dragListener.destroy, this._dragListener );
	}

	this._abort = new AbortController();
	var signal = this._abort.signal;
	this._onTabClickFn = lm.utils.fnBind( this._onTabClick, this );
	this._onCloseClickFn = lm.utils.fnBind( this._onCloseClick, this );

	this.element.addEventListener( 'mousedown', this._onTabClickFn, { signal: signal } );
	this.element.addEventListener( 'touchstart', this._onTabClickFn, { signal: signal } );

	if( this.contentItem.config.isClosable ) {
		this._closeNode.addEventListener( 'click', this._onCloseClickFn, { signal: signal } );
		this._closeNode.addEventListener( 'touchstart', this._onCloseClickFn, { signal: signal } );
		this._closeNode.addEventListener( 'mousedown', this._onCloseMousedown, { signal: signal } );
	} else {
		this._closeNode.remove();
		this._closeNode = null;
	}

	this.contentItem.tab = this;
	this.contentItem.emit( 'tab', this );
	this.contentItem.layoutManager.emit( 'tabCreated', this );

	if( this.contentItem.isComponent ) {
		this.contentItem.container.tab = this;
		this.contentItem.container.emit( 'tab', this );
	}
};

/**
 * The tab's html template
 *
 * @type {String}
 */
lm.controls.Tab._template = '<li class="lm_tab"><i class="lm_left"></i>' +
	'<span class="lm_title"></span><div class="lm_close_tab"></div>' +
	'<i class="lm_right"></i></li>';

lm.utils.copy( lm.controls.Tab.prototype, {

	/**
	 * Sets the tab's title to the provided string and sets
	 * its title attribute to a pure text representation (without
	 * html tags) of the same string.
	 *
	 * @public
	 * @param {String} title can contain html
	 */
	setTitle: function( title ) {
		this.element.title = lm.utils.stripTags( title );
		this._titleNode.innerHTML = title;
	},

	/**
	 * Sets this tab's active state. To programmatically
	 * switch tabs, use header.setActiveContentItem( item ) instead.
	 *
	 * @public
	 * @param {Boolean} isActive
	 */
	setActive: function( isActive ) {
		if( isActive === this.isActive ) {
			return;
		}
		this.isActive = isActive;

		if( isActive ) {
			this.element.classList.add( 'lm_active' );
		} else {
			this.element.classList.remove( 'lm_active' );
		}
	},

	/**
	 * Destroys the tab
	 *
	 * @private
	 * @returns {void}
	 */
	_$destroy: function() {
		this._abort.abort();
		if( this._dragListener ) {
			this.contentItem.off( 'destroy', this._dragListener.destroy, this._dragListener );
			this._dragListener.off( 'dragStart', this._onDragStart );
			this._dragListener = null;
		}
		this.element.remove();
	},

	/**
	 * Callback for the DragListener
	 *
	 * @param   {Number} x The tabs absolute x position
	 * @param   {Number} y The tabs absolute y position
	 *
	 * @private
	 * @returns {void}
	 */
	_onDragStart: function( x, y ) {
		if( this.contentItem.parent.isMaximised === true ) {
			this.contentItem.parent.toggleMaximise();
		}
		new lm.controls.DragProxy(
			x,
			y,
			this._dragListener,
			this._layoutManager,
			this.contentItem,
			this.header.parent
		);
	},

	/**
	 * Callback when the tab is clicked
	 *
	 * @param {jQuery DOM event} event
	 *
	 * @private
	 * @returns {void}
	 */
	_onTabClick: function( event ) {
		// left mouse button or tap
		if( event.button === 0 || event.type === 'touchstart' ) {
			var activeContentItem = this.header.parent.getActiveContentItem();
			if( this.contentItem !== activeContentItem ) {
				this.header.parent.setActiveContentItem( this.contentItem );
			}

			// middle mouse button
		} else if( event.button === 1 && this.contentItem.config.isClosable ) {
			this._onCloseClick( event );
		}
	},

	/**
	 * Callback when the tab's close button is
	 * clicked
	 *
	 * @param   {jQuery DOM event} event
	 *
	 * @private
	 * @returns {void}
	 */
	_onCloseClick: function( event ) {
		event.stopPropagation();
		this.header.parent.removeChild( this.contentItem );
	},


	/**
	 * Callback to capture tab close button mousedown
	 * to prevent tab from activating.
	 *
	 * @param (jQuery DOM event) event
	 *
	 * @private
	 * @returns {void}
	 */
	_onCloseMousedown: function(event) {
		event.stopPropagation();
	}
} );
