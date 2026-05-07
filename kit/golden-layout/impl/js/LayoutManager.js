import {lm} from './ns.js';
import $ from 'jquery';
import {merge, isPlainObject} from 'lodash';

/**
 * The main class that will be exposed as GoldenLayout.
 *
 * @public
 * @constructor
 * @param {GoldenLayout config} config
 * @param {[DOM element container]} container Can be a jQuery selector string or a Dom element. Defaults to body
 *
 * @returns {VOID}
 */
lm.LayoutManager = function( config, container ) {

	lm.utils.EventEmitter.call( this );

	this.isInitialised = false;
	this._isFullPage = false;
	this._resizeTimeoutId = null;
	this._components = { 'lm-react-component': lm.utils.ReactComponentHandler };
	this._itemAreas = [];
	this._resizeFunction = lm.utils.fnBind( this._onResize, this );
	this._maximisedItem = null;
	var maxPlaceholder = document.createElement( 'div' );
	maxPlaceholder.className = 'lm_maximise_place';
	this._maximisePlaceholder = $( maxPlaceholder );
	this._dragSources = [];
	this._updatingColumnsResponsive = false;
	this._firstLoad = true;

	this.width = null;
	this.height = null;
	this.root = null;
	this.selectedItem = null;
	this.eventHub = new lm.utils.EventHub( this );
	this.config = this._createConfig( config );
	this.container = container;
	this.dropTargetIndicator = null;
	this.transitionIndicator = null;
	var tabPlaceholder = document.createElement( 'div' );
	tabPlaceholder.className = 'lm_drop_tab_placeholder';
	this.tabDropPlaceholder = $( tabPlaceholder );

	this._typeToItem = {
		'column': lm.utils.fnBind( lm.items.RowOrColumn, this, [ true ] ),
		'row': lm.utils.fnBind( lm.items.RowOrColumn, this, [ false ] ),
		'stack': lm.items.Stack,
		'component': lm.items.Component
	};
};

/**
 * Hook that allows to access private classes
 */
lm.LayoutManager.__lm = lm;

lm.utils.copy( lm.LayoutManager.prototype, {

	/**
	 * Register a component with the layout manager. If a configuration node
	 * of type component is reached it will look up componentName and create the
	 * associated component
	 *
	 *  {
	 *		type: "component",
	 *		componentName: "EquityNewsFeed",
	 *		componentState: { "feedTopic": "us-bluechips" }
	 *  }
	 *
	 * @public
	 * @param   {String} name
	 * @param   {Function} constructor
	 *
	 * @returns {void}
	 */
	registerComponent: function( name, constructor ) {
		if( typeof constructor !== 'function' ) {
			throw new Error( 'Please register a constructor function' );
		}

		if( this._components[ name ] !== undefined ) {
			throw new Error( 'Component ' + name + ' is already registered' );
		}

		this._components[ name ] = constructor;
	},

	/**
	 * Creates a layout configuration object based on the the current state
	 *
	 * @public
	 * @returns {Object} GoldenLayout configuration
	 */
	toConfig: function( root ) {
		var config, next, i;

		if( this.isInitialised === false ) {
			throw new Error( 'Can\'t create config, layout not yet initialised' );
		}

		if( root && !( root instanceof lm.items.AbstractContentItem ) ) {
			throw new Error( 'Root must be a ContentItem' );
		}

		/*
		 * settings & labels
		 */
		config = {
			settings: lm.utils.copy( {}, this.config.settings ),
			dimensions: lm.utils.copy( {}, this.config.dimensions ),
			labels: lm.utils.copy( {}, this.config.labels )
		};

		/*
		 * Content
		 */
		config.content = [];
		next = function( configNode, item ) {
			var key, i;

			for( key in item.config ) {
				if( key !== 'content' ) {
					configNode[ key ] = item.config[ key ];
				}
			}

			if( item.contentItems.length ) {
				configNode.content = [];

				for( i = 0; i < item.contentItems.length; i++ ) {
					configNode.content[ i ] = {};
					next( configNode.content[ i ], item.contentItems[ i ] );
				}
			}
		};

		if( root ) {
			next( config, { contentItems: [ root ] } );
		} else {
			next( config, this.root );
		}

		/*
		 * Add maximised item
		 */
		config.maximisedItemId = this._maximisedItem ? '__glMaximised' : null;
		return config;
	},

	/**
	 * Returns a previously registered component
	 *
	 * @public
	 * @param   {String} name The name used
	 *
	 * @returns {Function}
	 */
	getComponent: function( name ) {
		if( this._components[ name ] === undefined ) {
			throw new lm.errors.ConfigurationError( 'Unknown component "' + name + '"' );
		}

		return this._components[ name ];
	},

	/**
	 * Creates the actual layout. Must be called after all initial components
	 * are registered. Recurses through the configuration and sets up
	 * the item tree.
	 *
	 * If called before the document is ready it adds itself as a listener
	 * to the document.ready event
	 *
	 * @public
	 *
	 * @returns {void}
	 */
	init: function() {

		/**
		 * If the document isn't ready yet, wait for it.
		 */
		if( document.readyState === 'loading' || document.body === null ) {
			document.addEventListener( 'DOMContentLoaded', lm.utils.fnBind( this.init, this ), { once: true } );
			return;
		}

		this._setContainer();
		this.dropTargetIndicator = new lm.controls.DropTargetIndicator( this.container );
		this.transitionIndicator = new lm.controls.TransitionIndicator();
		this.updateSize();
		this._create( this.config );
		this._bindEvents();
		this.isInitialised = true;
		this._adjustColumnsResponsive();
		this.emit( 'initialised' );
	},

	/**
	 * Updates the layout managers size
	 *
	 * @public
	 * @param   {[int]} width  height in pixels
	 * @param   {[int]} height width in pixels
	 *
	 * @returns {void}
	 */
	updateSize: function( width, height ) {
		var containerNode = this.container[ 0 ];
		if( arguments.length === 2 ) {
			this.width = width;
			this.height = height;
		} else {
			this.width = containerNode.clientWidth;
			this.height = containerNode.clientHeight;
		}

		if( this.isInitialised === true ) {
			this.root.callDownwards( 'setSize', [ this.width, this.height ] );

			if( this._maximisedItem ) {
				var maxNode = this._maximisedItem.element[ 0 ];
				maxNode.style.width = containerNode.clientWidth + 'px';
				maxNode.style.height = containerNode.clientHeight + 'px';
				this._maximisedItem.callDownwards( 'setSize' );
			}

			this._adjustColumnsResponsive();
		}
	},

	/**
	 * Destroys the LayoutManager instance itself as well as every ContentItem
	 * within it. After this is called nothing should be left of the LayoutManager.
	 *
	 * @public
	 * @returns {void}
	 */
	destroy: function() {
		if( this.isInitialised === false ) {
			return;
		}
		window.removeEventListener( 'resize', this._resizeFunction );
		this.root.callDownwards( '_$destroy', [], true );
		this.root.contentItems = [];
		this.tabDropPlaceholder.remove();
		this.dropTargetIndicator.destroy();
		this.transitionIndicator.destroy();
		this.eventHub.destroy();

		this._dragSources.forEach( function( dragSource ) {
			dragSource._dragListener.destroy();
			dragSource._element = null;
			dragSource._itemConfig = null;
			dragSource._dragListener = null;
		} );
		this._dragSources = [];
	},

	/**
	 * Recursively creates new item tree structures based on a provided
	 * ItemConfiguration object
	 *
	 * @public
	 * @param   {Object} config ItemConfig
	 * @param   {[ContentItem]} parent The item the newly created item should be a child of
	 *
	 * @returns {lm.items.ContentItem}
	 */
	createContentItem: function( config, parent ) {
		var typeErrorMsg, contentItem;

		if( typeof config.type !== 'string' ) {
			throw new lm.errors.ConfigurationError( 'Missing parameter \'type\'', config );
		}

		if( config.type === 'react-component' ) {
			config.type = 'component';
			config.componentName = 'lm-react-component';
		}

		if( !this._typeToItem[ config.type ] ) {
			typeErrorMsg = 'Unknown type \'' + config.type + '\'. ' +
				'Valid types are ' + lm.utils.objectKeys( this._typeToItem ).join( ',' );

			throw new lm.errors.ConfigurationError( typeErrorMsg );
		}


		/**
		 * We add an additional stack around every component that's not within a stack anyways.
		 */
		if(
			// If this is a component
		config.type === 'component' &&

		// and it's not already within a stack
		!( parent instanceof lm.items.Stack ) &&

		// and we have a parent
		!!parent
		) {
			config = {
				type: 'stack',
				width: config.width,
				height: config.height,
				content: [ config ]
			};
		}

		contentItem = new this._typeToItem[ config.type ]( this, config, parent );
		return contentItem;
	},

	/**
	 * Attaches DragListener to any given DOM element
	 * and turns it into a way of creating new ContentItems
	 * by 'dragging' the DOM element into the layout
	 *
	 * @param   {jQuery DOM element} element
	 * @param   {Object|Function} itemConfig for the new item to be created, or a function which will provide it
	 *
	 * @returns {void}
	 */
	createDragSource: function( element, itemConfig ) {
		this.config.settings.constrainDragToContainer = false;
		var dragSource = new lm.controls.DragSource( $( element ), itemConfig, this );
		this._dragSources.push( dragSource );

		return dragSource;
	},

	/**
	 * Programmatically selects an item. This deselects
	 * the currently selected item, selects the specified item
	 * and emits a selectionChanged event
	 *
	 * @param   {lm.item.AbstractContentItem} item#
	 * @param   {[Boolean]} _$silent Wheather to notify the item of its selection
	 * @event    selectionChanged
	 *
	 * @returns {VOID}
	 */
	selectItem: function( item, _$silent ) {

		if( this.config.settings.selectionEnabled !== true ) {
			throw new Error( 'Please set selectionEnabled to true to use this feature' );
		}

		if( item === this.selectedItem ) {
			return;
		}

		if( this.selectedItem !== null ) {
			this.selectedItem.deselect();
		}

		if( item && _$silent !== true ) {
			item.select();
		}

		this.selectedItem = item;

		this.emit( 'selectionChanged', item );
	},

	/*************************
	 * PACKAGE PRIVATE
	 *************************/
	_$maximiseItem: function( contentItem ) {
		if( this._maximisedItem !== null ) {
			this._$minimiseItem( this._maximisedItem );
		}
		this._maximisedItem = contentItem;
		this._maximisedItem.addId( '__glMaximised' );
		var itemNode = contentItem.element[ 0 ],
			rootNode = this.root.element[ 0 ],
			containerNode = this.container[ 0 ],
			placeholderNode = this._maximisePlaceholder[ 0 ];
		itemNode.classList.add( 'lm_maximised' );
		itemNode.after( placeholderNode );
		rootNode.prepend( itemNode );
		itemNode.style.width = containerNode.clientWidth + 'px';
		itemNode.style.height = containerNode.clientHeight + 'px';
		contentItem.callDownwards( 'setSize' );
		this._maximisedItem.emit( 'maximised' );
		this.emit( 'stateChanged' );
	},

	_$minimiseItem: function( contentItem ) {
		var itemNode = contentItem.element[ 0 ],
			placeholderNode = this._maximisePlaceholder[ 0 ];
		itemNode.classList.remove( 'lm_maximised' );
		contentItem.removeId( '__glMaximised' );
		placeholderNode.after( itemNode );
		placeholderNode.remove();
		contentItem.parent.callDownwards( 'setSize' );
		this._maximisedItem = null;
		contentItem.emit( 'minimised' );
		this.emit( 'stateChanged' );
	},

	_$getArea: function( x, y ) {
		var i, area, smallestSurface = Infinity, mathingArea = null;

		for( i = 0; i < this._itemAreas.length; i++ ) {
			area = this._itemAreas[ i ];

			if(
				x > area.x1 &&
				x < area.x2 &&
				y > area.y1 &&
				y < area.y2 &&
				smallestSurface > area.surface
			) {
				smallestSurface = area.surface;
				mathingArea = area;
			}
		}

		return mathingArea;
	},

	_$createRootItemAreas: function() {
		var areaSize = 50;
		var sides = { y2: 0, x2: 0, y1: 'y2', x1: 'x2' };
		for( var side in sides ) {
			var area = this.root._$getArea();
			area.side = side;
			if( sides [ side ] )
				area[ side ] = area[ sides [ side ] ] - areaSize;
			else
				area[ side ] = areaSize;			
			area.surface = ( area.x2 - area.x1 ) * ( area.y2 - area.y1 );
			this._itemAreas.push( area );
		}
	},

	_$calculateItemAreas: function() {
		var i, area, allContentItems = this._getAllContentItems();
		this._itemAreas = [];

		/**
		 * If the last item is dragged out, highlight the entire container size to
		 * allow to re-drop it. allContentItems[ 0 ] === this.root at this point
		 *
		 * Don't include root into the possible drop areas though otherwise since it
		 * will used for every gap in the layout, e.g. splitters
		 */
		if( allContentItems.length === 1 ) {
			this._itemAreas.push( this.root._$getArea() );
			return;
		}
		this._$createRootItemAreas();

		for( i = 0; i < allContentItems.length; i++ ) {

			if( !( allContentItems[ i ].isStack ) ) {
				continue;
			}

			area = allContentItems[ i ]._$getArea();

			if( area === null ) {
				continue;
			} else if( area instanceof Array ) {
				this._itemAreas = this._itemAreas.concat( area );
			} else {
				this._itemAreas.push( area );
				var header = {};
				lm.utils.copy( header, area );
				lm.utils.copy( header, area.contentItem._contentAreaDimensions.header.highlightArea );
				header.surface = ( header.x2 - header.x1 ) * ( header.y2 - header.y1 );
				this._itemAreas.push( header );
			}
		}
	},

	/**
	 * Takes a contentItem or a configuration and optionally a parent
	 * item and returns an initialised instance of the contentItem.
	 * If the contentItem is a function, it is first called
	 *
	 * @packagePrivate
	 *
	 * @param   {lm.items.AbtractContentItem|Object|Function} contentItemOrConfig
	 * @param   {lm.items.AbtractContentItem} parent Only necessary when passing in config
	 *
	 * @returns {lm.items.AbtractContentItem}
	 */
	_$normalizeContentItem: function( contentItemOrConfig, parent ) {
		if( !contentItemOrConfig ) {
			throw new Error( 'No content item defined' );
		}

		if( lm.utils.isFunction( contentItemOrConfig ) ) {
			contentItemOrConfig = contentItemOrConfig();
		}

		if( contentItemOrConfig instanceof lm.items.AbstractContentItem ) {
			return contentItemOrConfig;
		}

		if( isPlainObject( contentItemOrConfig ) && contentItemOrConfig.type ) {
			var newContentItem = this.createContentItem( contentItemOrConfig, parent );
			newContentItem.callDownwards( '_$init' );
			return newContentItem;
		} else {
			throw new Error( 'Invalid contentItem' );
		}
	},

	/***************************
	 * PRIVATE
	 ***************************/
	/**
	 * Returns a flattened array of all content items,
	 * regardles of level or type
	 *
	 * @private
	 *
	 * @returns {void}
	 */
	_getAllContentItems: function() {
		var allContentItems = [];

		var addChildren = function( contentItem ) {
			allContentItems.push( contentItem );

			if( contentItem.contentItems instanceof Array ) {
				for( var i = 0; i < contentItem.contentItems.length; i++ ) {
					addChildren( contentItem.contentItems[ i ] );
				}
			}
		};

		addChildren( this.root );

		return allContentItems;
	},

	/**
	 * Binds to DOM/BOM events on init
	 *
	 * @private
	 *
	 * @returns {void}
	 */
	_bindEvents: function() {
		if( this._isFullPage ) {
			window.addEventListener( 'resize', this._resizeFunction );
		}
	},

	/**
	 * Debounces resize events
	 *
	 * @private
	 *
	 * @returns {void}
	 */
	_onResize: function() {
		clearTimeout( this._resizeTimeoutId );
		this._resizeTimeoutId = setTimeout( lm.utils.fnBind( this.updateSize, this ), 100 );
	},

	/**
	 * Extends the default config with the user specific settings and applies
	 * derivations. Please note that there's a seperate method (AbstractContentItem._extendItemNode)
	 * that deals with the extension of item configs
	 *
	 * @param   {Object} config
	 * @static
	 * @returns {Object} config
	 */
	_createConfig: function( config ) {
		config = merge( {}, lm.config.defaultConfig, config );

		var nextNode = function( node ) {
			for( var key in node ) {
				if( key !== 'props' && typeof node[ key ] === 'object' ) {
					nextNode( node[ key ] );
				}
				else if( key === 'type' && node[ key ] === 'react-component' ) {
					node.type = 'component';
					node.componentName = 'lm-react-component';
				}
			}
		}

		nextNode( config );

		if( config.settings.hasHeaders === false ) {
			config.dimensions.headerHeight = 0;
		}

		return config;
	},

	/**
	 * Determines what element the layout will be created in
	 *
	 * @private
	 *
	 * @returns {void}
	 */
	_setContainer: function() {
		var container = $( this.container || 'body' );

		if( container.length === 0 ) {
			throw new Error( 'GoldenLayout container not found' );
		}

		if( container.length > 1 ) {
			throw new Error( 'GoldenLayout more than one container element specified' );
		}

		if( container[ 0 ] === document.body ) {
			this._isFullPage = true;

			[ document.documentElement, document.body ].forEach( function( el ) {
				el.style.height = '100%';
				el.style.margin = '0';
				el.style.padding = '0';
				el.style.overflow = 'hidden';
			} );
		}

		this.container = container;
	},

	/**
	 * Kicks of the initial, recursive creation chain
	 *
	 * @param   {Object} config GoldenLayout Config
	 *
	 * @returns {void}
	 */
	_create: function( config ) {
		var errorMsg;

		if( !( config.content instanceof Array ) ) {
			if( config.content === undefined ) {
				errorMsg = 'Missing setting \'content\' on top level of configuration';
			} else {
				errorMsg = 'Configuration parameter \'content\' must be an array';
			}

			throw new lm.errors.ConfigurationError( errorMsg, config );
		}

		if( config.content.length > 1 ) {
			errorMsg = 'Top level content can\'t contain more then one element.';
			throw new lm.errors.ConfigurationError( errorMsg, config );
		}

		this.root = new lm.items.Root( this, { content: config.content }, this.container );
		this.root.callDownwards( '_$init' );

		if( config.maximisedItemId === '__glMaximised' ) {
			this.root.getItemsById( config.maximisedItemId )[ 0 ].toggleMaximise();
		}
	},

	/**
	 * Adjusts the number of columns to be lower to fit the screen and still maintain minItemWidth.
	 *
	 * @returns {void}
	 */
	_adjustColumnsResponsive: function() {

		// If there is no min width set, or not content items, do nothing.
		if( !this._useResponsiveLayout() || this._updatingColumnsResponsive || !this.config.dimensions || !this.config.dimensions.minItemWidth || this.root.contentItems.length === 0 || !this.root.contentItems[ 0 ].isRow ) {
			this._firstLoad = false;
			return;
		}

		this._firstLoad = false;

		// If there is only one column, do nothing.
		var columnCount = this.root.contentItems[ 0 ].contentItems.length;
		if( columnCount <= 1 ) {
			return;
		}

		// If they all still fit, do nothing.
		var minItemWidth = this.config.dimensions.minItemWidth;
		var totalMinWidth = columnCount * minItemWidth;
		if( totalMinWidth <= this.width ) {
			return;
		}

		// Prevent updates while it is already happening.
		this._updatingColumnsResponsive = true;

		// Figure out how many columns to stack, and put them all in the first stack container.
		var finalColumnCount = Math.max( Math.floor( this.width / minItemWidth ), 1 );
		var stackColumnCount = columnCount - finalColumnCount;

		var rootContentItem = this.root.contentItems[ 0 ];
		var firstStackContainer = this._findAllStackContainers()[ 0 ];
		for( var i = 0; i < stackColumnCount; i++ ) {
			// Stack from right.
			var column = rootContentItem.contentItems[ rootContentItem.contentItems.length - 1 ];
			this._addChildContentItemsToContainer( firstStackContainer, column );
		}

		this._updatingColumnsResponsive = false;
	},

	/**
	 * Determines if responsive layout should be used.
	 *
	 * @returns {bool} - True if responsive layout should be used; otherwise false.
	 */
	_useResponsiveLayout: function() {
		return this.config.settings && ( this.config.settings.responsiveMode == 'always' || ( this.config.settings.responsiveMode == 'onload' && this._firstLoad ) );
	},

	/**
	 * Adds all children of a node to another container recursively.
	 * @param {object} container - Container to add child content items to.
	 * @param {object} node - Node to search for content items.
	 * @returns {void}
	 */
	_addChildContentItemsToContainer: function( container, node ) {
		if( node.type === 'stack' ) {
			node.contentItems.forEach( function( item ) {
				container.addChild( item );
				node.removeChild( item, true );
			} );
		}
		else {
			node.contentItems.forEach( lm.utils.fnBind( function( item ) {
				this._addChildContentItemsToContainer( container, item );
			}, this ) );
		}
	},

	/**
	 * Finds all the stack containers.
	 * @returns {array} - The found stack containers.
	 */
	_findAllStackContainers: function() {
		var stackContainers = [];
		this._findAllStackContainersRecursive( stackContainers, this.root );

		return stackContainers;
	},

	/**
	 * Finds all the stack containers.
	 *
	 * @param {array} - Set of containers to populate.
	 * @param {object} - Current node to process.
	 *
	 * @returns {void}
	 */
	_findAllStackContainersRecursive: function( stackContainers, node ) {
		node.contentItems.forEach( lm.utils.fnBind( function( item ) {
			if( item.type == 'stack' ) {
				stackContainers.push( item );
			}
			else if( !item.isComponent ) {
				this._findAllStackContainersRecursive( stackContainers, item );
			}
		}, this ) );
	}
} );
