/*
  The dock widget item is the smallest part of the dock window system, it will
  contain all of the contents for the actual widget.
*/
function wcDockWidget(title) {
  this.$container = null;
  this._parent = null;

  this._title = title;

  this._layout = null;

  this._size = {
    x: 200,
    y: 200,
  };

  this._minSize = {
    x: 0,
    y: 0,
  };

  this._maxSize = {
    x: Infinity,
    y: Infinity,
  };

  this._init();
};

wcDockWidget.prototype = {
  _init: function() {
    this._layout = new wcLayout(this.$container, this);
  },

  // Gets the title for this dock widget.
  title: function() {
    return this._title;
  },

  // Updates the size of the layout.
  update: function() {
    this._layout.update();
  },

  // Retrieves the main widget container for this dock widget.
  layout: function() {
    return this._layout;
  },

  // Gets, or Sets the desired size of the widget.
  size: function(x, y) {
    if (typeof x === 'undefined') {
      return this._size;
    }
    this._size.x = x;
    this._size.y = y;
  },

  // Gets, or Sets the minimum size of the widget.
  minSize: function(x, y) {
    if (typeof x === 'undefined') {
      return this._minSize;
    }
    this._minSize.x = x;
    this._minSize.y = y;
  },

  // Gets, or Sets the desired size of the widget.
  maxSize: function(x, y) {
    if (typeof x === 'undefined') {
      return this._maxSize;
    }
    this._maxSize.x = x;
    this._maxSize.y = y;
  },

  // Gets, or Sets a new container for this layout.
  // Params:
  //    $container          If supplied, sets a new container for this layout.
  //    parent              If supplied, sets a new parent for this layout.
  // Returns:
  //    JQuery collection   The current container.
  container: function($container) {
    if (typeof $container === 'undefined') {
      return this.$container;
    }

    this._layout.container(null);
    this.$container = $container;
    
    if (this.$container) {
      this._layout.container(this.$container);
    }
    return this.$container;
  },

  // Gets, or Sets the parent item for this layout.
  // Params:
  //    parent        If supplied, sets a new parent for this layout.
  // Returns:
  //    object        The current parent.
  parent: function(parent) {
    if (typeof parent === 'undefined') {
      return this._parent;
    }

    this._parent = parent;
    return this._parent;
  },
};