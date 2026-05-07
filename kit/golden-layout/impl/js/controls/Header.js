import {lm} from '../ns.js';
import $ from 'jquery';

/**
 * This class represents a header above a Stack ContentItem.
 *
 * @param {lm.LayoutManager} layoutManager
 * @param {lm.item.AbstractContentItem} parent
 */
lm.controls.Header = function( layoutManager, parent ) {
	lm.utils.EventEmitter.call( this );

	this.layoutManager = layoutManager;

	// Build header DOM, then expose top-level wrappers as jQuery for downstream
	// consumers (Stack drives header.element.toggle/.offset/.height; HeaderButton
	// appends into controlsContainer).
	var template = document.createElement( 'template' );
	template.innerHTML = lm.controls.Header._template;
	var node = template.content.firstElementChild;
	this._node = node;
	this.element = $( node );

	this._abort = new AbortController();
	var signal = this._abort.signal;

	if( this.layoutManager.config.settings.selectionEnabled === true ) {
		node.classList.add( 'lm_selectable' );
		var onHeaderClick = lm.utils.fnBind( this._onHeaderClick, this );
		node.addEventListener( 'click', onHeaderClick, { signal: signal } );
		node.addEventListener( 'touchstart', onHeaderClick, { signal: signal } );
	}

	this._tabsNode = node.querySelector( '.lm_tabs' );
	this._tabDropdownNode = node.querySelector( '.lm_tabdropdown_list' );
	this._tabDropdownNode.style.display = 'none';
	this._controlsNode = node.querySelector( '.lm_controls' );

	// Wrappers retained for jQuery-shaped consumers.
	this.tabsContainer = $( this._tabsNode );
	this.tabDropdownContainer = $( this._tabDropdownNode );
	this.controlsContainer = $( this._controlsNode );

	this.parent = parent;
	this.parent.on( 'resize', this._updateTabSizes, this );
	this.tabs = [];
	this.activeContentItem = null;
	this.closeButton = null;
	this.tabDropdownButton = null;
	this.hideAdditionalTabsDropdown = lm.utils.fnBind( this._hideAdditionalTabsDropdown, this );
	document.addEventListener( 'mouseup', this.hideAdditionalTabsDropdown, { signal: signal } );

	this._lastVisibleTabIndex = -1;
	this._tabControlOffset = this.layoutManager.config.settings.tabControlOffset;
	this._createControls();
};

lm.controls.Header._template = [
	'<div class="lm_header">',
	'<ul class="lm_tabs"></ul>',
	'<ul class="lm_controls"></ul>',
	'<ul class="lm_tabdropdown_list"></ul>',
	'</div>'
].join( '' );

lm.utils.copy( lm.controls.Header.prototype, {

	/**
	 * Creates a new tab and associates it with a contentItem
	 *
	 * @param    {lm.item.AbstractContentItem} contentItem
	 * @param    {Integer} index The position of the tab
	 *
	 * @returns {void}
	 */
	createTab: function( contentItem, index ) {
		var tab, i;

		//If there's already a tab relating to the
		//content item, don't do anything
		for( i = 0; i < this.tabs.length; i++ ) {
			if( this.tabs[ i ].contentItem === contentItem ) {
				return;
			}
		}

		tab = new lm.controls.Tab( this, contentItem );

		if( this.tabs.length === 0 ) {
			this.tabs.push( tab );
			this.tabsContainer.append( tab.element );
			return;
		}

		if( index === undefined ) {
			index = this.tabs.length;
		}

		if( index > 0 ) {
			this.tabs[ index - 1 ].element[ 0 ].after( tab.element[ 0 ] );
		} else {
			this.tabs[ 0 ].element[ 0 ].before( tab.element[ 0 ] );
		}

		this.tabs.splice( index, 0, tab );
		this._updateTabSizes();
	},

	/**
	 * Finds a tab based on the contentItem its associated with and removes it.
	 *
	 * @param    {lm.item.AbstractContentItem} contentItem
	 *
	 * @returns {void}
	 */
	removeTab: function( contentItem ) {
		for( var i = 0; i < this.tabs.length; i++ ) {
			if( this.tabs[ i ].contentItem === contentItem ) {
				this.tabs[ i ]._$destroy();
				this.tabs.splice( i, 1 );
				return;
			}
		}

		throw new Error( 'contentItem is not controlled by this header' );
	},

	/**
	 * The programmatical equivalent of clicking a Tab.
	 *
	 * @param {lm.item.AbstractContentItem} contentItem
	 */
	setActiveContentItem: function( contentItem ) {
		var i, j, isActive, activeTab;

		for( i = 0; i < this.tabs.length; i++ ) {
			isActive = this.tabs[ i ].contentItem === contentItem;
			this.tabs[ i ].setActive( isActive );
			if( isActive === true ) {
				this.activeContentItem = contentItem;
				this.parent.config.activeItemIndex = i;
			}
		}

		if (this.layoutManager.config.settings.reorderOnTabMenuClick) {
			/**
			 * If the tab selected was in the dropdown, move everything down one to make way for this one to be the first.
			 * This will make sure the most used tabs stay visible.
			 */
			if (this._lastVisibleTabIndex !== -1 && this.parent.config.activeItemIndex > this._lastVisibleTabIndex) {
				activeTab = this.tabs[this.parent.config.activeItemIndex];
				for ( j = this.parent.config.activeItemIndex; j > 0; j-- ) {
					this.tabs[j] = this.tabs[j - 1];
				}
				this.tabs[0]                       = activeTab;
				this.parent.config.activeItemIndex = 0;
			}
		}

		this._updateTabSizes();
		this.parent.emitBubblingEvent( 'stateChanged' );
	},

	/**
	 * Programmatically operate with header position.
	 *
	 * @param {string} position one of ('top','left','right','bottom') to set or empty to get it.
	 *
	 * @returns {string} previous header position
	 */
	position: function( position ) {
		var previous = this.parent._header.show;
		if( previous && !this.parent._side )
			previous = 'top';
		if( position !== undefined && this.parent._header.show != position ) {
			this.parent._header.show = position;
			this.parent._setupHeaderPosition();
		}
		return previous;
	},

	/**
	 * Programmatically set closability.
	 *
	 * @package private
	 * @param {Boolean} isClosable Whether to enable/disable closability.
	 *
	 * @returns {Boolean} Whether the action was successful
	 */
	_$setClosable: function( isClosable ) {
		if( this.closeButton && this._isClosable() ) {
			this.closeButton.element[ isClosable ? "show" : "hide" ]();
			return true;
		}

		return false;
	},

	/**
	 * Destroys the entire header
	 *
	 * @package private
	 *
	 * @returns {void}
	 */
	_$destroy: function() {
		this.emit( 'destroy', this );

		for( var i = 0; i < this.tabs.length; i++ ) {
			this.tabs[ i ]._$destroy();
		}
		this._abort.abort();
		this._node.remove();
	},

	/**
	 * get settings from header
	 *
	 * @returns {string} when exists
	 */
	_getHeaderSetting: function( name ) {
		if( name in this.parent._header )
			return this.parent._header[ name ];
	},
	/**
	 * Creates the maximise and close buttons in the header's top right corner
	 *
	 * @returns {void}
	 */
	_createControls: function() {
		var closeStack,
			label,
			maximiseLabel,
			minimiseLabel,
			maximise,
			maximiseButton,
			tabDropdownLabel,
			showTabDropdown;

		/**
		 * Dropdown to show additional tabs.
		 */
		showTabDropdown = lm.utils.fnBind( this._showAdditionalTabsDropdown, this );
		tabDropdownLabel = this.layoutManager.config.labels.tabDropdown;
		this.tabDropdownButton = new lm.controls.HeaderButton( this, tabDropdownLabel, 'lm_tabdropdown', showTabDropdown );
		this.tabDropdownButton.element[ 0 ].style.display = 'none';

		/**
		 * Maximise control - set the component to the full size of the layout
		 */
		if( this._getHeaderSetting( 'maximise' ) ) {
			maximise = lm.utils.fnBind( this.parent.toggleMaximise, this.parent );
			maximiseLabel = this._getHeaderSetting( 'maximise' );
			minimiseLabel = this._getHeaderSetting( 'minimise' );
			maximiseButton = new lm.controls.HeaderButton( this, maximiseLabel, 'lm_maximise', maximise );

			this.parent.on( 'maximised', function() {
				maximiseButton.element[ 0 ].title = minimiseLabel;
			} );

			this.parent.on( 'minimised', function() {
				maximiseButton.element[ 0 ].title = maximiseLabel;
			} );
		}

		/**
		 * Close button
		 */
		if( this._isClosable() ) {
			closeStack = lm.utils.fnBind( this.parent.remove, this.parent );
			label = this._getHeaderSetting( 'close' );
			this.closeButton = new lm.controls.HeaderButton( this, label, 'lm_close', closeStack );
		}
	},

	/**
	 * Shows drop down for additional tabs when there are too many to display.
	 *
	 * @returns {void}
	 */
	_showAdditionalTabsDropdown: function() {
		this._tabDropdownNode.style.display = 'block';
	},

	/**
	 * Hides drop down for additional tabs when there are too many to display.
	 *
	 * @returns {void}
	 */
	_hideAdditionalTabsDropdown: function() {
		this._tabDropdownNode.style.display = 'none';
	},

	/**
	 * Checks whether the header is closable based on the parent config and
	 * the global config.
	 *
	 * @returns {Boolean} Whether the header is closable.
	 */
	_isClosable: function() {
		return this.parent.config.isClosable && this.layoutManager.config.settings.showCloseIcon;
	},

	/**
	 * Invoked when the header's background is clicked (not it's tabs or controls)
	 *
	 * @param    {jQuery DOM event} event
	 *
	 * @returns {void}
	 */
	_onHeaderClick: function( event ) {
		if( event.target === this.element[ 0 ] ) {
			this.parent.select();
		}
	},

	/**
	 * Pushes the tabs to the tab dropdown if the available space is not sufficient
	 *
	 * @returns {void}
	 */
	_updateTabSizes: function( showTabMenu ) {
		if( this.tabs.length === 0 ) {
			return;
		}

		// Show the menu based on function argument
		this.tabDropdownButton.element[ 0 ].style.display = showTabMenu === true ? '' : 'none';

		var sided = this.parent._sided,
			headerHeight = this.layoutManager.config.dimensions.headerHeight,
			headerNode = this._node,
			controlsNode = this._controlsNode,
			tabsNode = this._tabsNode,
			tabDropdownNode = this._tabDropdownNode;

		// Clear the cross-axis dimension before reading the long-axis dimension.
		// Original used size(!sided) to clear and size(sided) to set, where
		// size(true)='width' and size(false)='height'. So for non-sided (top
		// header) we clear width and set height to headerHeight; for sided
		// (left/right header) we clear height and set width.
		headerNode.style[ sided ? 'height' : 'width' ] = '';
		headerNode.style[ sided ? 'width' : 'height' ] = headerHeight + 'px';

		var availableWidth = sided
				? ( headerNode.offsetHeight - controlsNode.offsetHeight - this._tabControlOffset )
				: ( headerNode.offsetWidth - controlsNode.offsetWidth - this._tabControlOffset ),
			cumulativeTabWidth = 0,
			visibleTabWidth = 0,
			tabNode,
			i,
			j,
			marginLeft,
			overlap = 0,
			tabWidth,
			tabOverlapAllowance = this.layoutManager.config.settings.tabOverlapAllowance,
			tabOverlapAllowanceExceeded = false,
			activeIndex = ( this.activeContentItem ? this.tabs.indexOf( this.activeContentItem.tab ) : 0 ),
			activeTab = this.tabs[ activeIndex ];
		this._lastVisibleTabIndex = -1;

		var measureTabWidth = function( node ) {
			return node.offsetWidth + ( parseFloat( window.getComputedStyle( node ).marginRight ) || 0 );
		};

		for( i = 0; i < this.tabs.length; i++ ) {
			tabNode = this.tabs[ i ].element[ 0 ];

			// Put the tab in the tabContainer so its true width can be checked
			tabsNode.appendChild( tabNode );
			tabWidth = measureTabWidth( tabNode );

			cumulativeTabWidth += tabWidth;

			if( activeIndex <= i ) {
				visibleTabWidth = cumulativeTabWidth;
			} else {
				visibleTabWidth = cumulativeTabWidth + measureTabWidth( activeTab.element[ 0 ] );
			}

			if( visibleTabWidth > availableWidth ) {

				if( !tabOverlapAllowanceExceeded ) {

					if( activeIndex > 0 && activeIndex <= i ) {
						overlap = ( visibleTabWidth - availableWidth ) / ( i - 1 );
					} else {
						overlap = ( visibleTabWidth - availableWidth ) / i;
					}

					if( overlap < tabOverlapAllowance ) {
						for( j = 0; j <= i; j++ ) {
							marginLeft = ( j !== activeIndex && j !== 0 ) ? '-' + overlap + 'px' : '';
							var jStyle = this.tabs[ j ].element[ 0 ].style;
							jStyle.zIndex = String( i - j );
							jStyle.marginLeft = marginLeft;
						}
						this._lastVisibleTabIndex = i;
						tabsNode.appendChild( tabNode );
					} else {
						tabOverlapAllowanceExceeded = true;
					}

				} else if( i === activeIndex ) {
					tabNode.style.zIndex = 'auto';
					tabNode.style.marginLeft = '';
					tabsNode.appendChild( tabNode );
				}

				if( tabOverlapAllowanceExceeded && i !== activeIndex ) {
					if( showTabMenu ) {
						tabNode.style.zIndex = 'auto';
						tabNode.style.marginLeft = '';
						tabDropdownNode.appendChild( tabNode );
					} else {
						this._updateTabSizes( true );
						return;
					}
				}

			} else {
				this._lastVisibleTabIndex = i;
				tabNode.style.zIndex = 'auto';
				tabNode.style.marginLeft = '';
				tabsNode.appendChild( tabNode );
			}
		}
	}
} );

