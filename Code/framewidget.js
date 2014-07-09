function wcFrameWidget($container, parent, isFloating) {
  this.$container = $container;
  this._parent = parent;
  this._isFloating = isFloating;

  this.$frame = null;
  this.$tabList = [];
  this.$center = null;

  this._curTab = -1;
  this._widgetList = [];

  this._init();
};

wcFrameWidget.prototype = {
  _init: function() {
    this.$frame = $('<div class="wcFrameWidget wcWide wcTall">');
    this.$center = $('<div class="wcFrameCenter wcWide">');
    this.$frame.append(this.$center);

    // Floating windows have no container.
    this.container(this.$container);

    if (this._isFloating) {
      this.$frame.addClass('wcFloating');
    }
  },

  // Updates the size of the frame.
  update: function() {
    this.$center.css('top', '25px');
    this.$center.css('bottom', '0px');

    if (this._curTab > -1 && this._curTab < this._widgetList.length) {

      this._widgetList[this._curTab].update();
    }
  },

  // Gets the desired size of the widget.
  size: function() {
    var size = {
      x: -1,
      y: -1,
    };

    for (var i = 0; i < this._widgetList.length; ++i) {
      if (size.x < this._widgetList[i].size().x) {
        size.x = this._widgetList[i].size().x;
      }
      if (size.y < this._widgetList[i].size().y) {
        size.y = this._widgetList[i].size().y;
      }
    }
    return size;
  },

  // Gets the minimum size of the widget.
  minSize: function(x, y) {
    var size = {
      x: -1,
      y: -1,
    };

    for (var i = 0; i < this._widgetList.length; ++i) {
      if (size.x === -1 || size.x > this._widgetList[i].minSize().x) {
        size.x = this._widgetList[i].minSize().x;
      }
      if (size.y === -1 || size.y > this._widgetList[i].minSize().y) {
        size.y = this._widgetList[i].minSize().y;
      }
    }
    return size;
  },

  // Gets the desired size of the widget.
  maxSize: function(x, y) {
    var size = {
      x: Infinity,
      y: Infinity,
    };

    for (var i = 0; i < this._widgetList.length; ++i) {
      if (size.x === Infinity || size.x > this._widgetList[i].maxSize().x) {
        size.x = this._widgetList[i].maxSize().x;
      }
      if (size.y === Infinity || size.y > this._widgetList[i].maxSize().y) {
        size.y = this._widgetList[i].maxSize().y;
      }
    }
    return size;
  },

  // Adds a given widget as a new tab item.
  // Params:
  //    widget    The widget to add.
  //    index     An optional index to insert the tab at.
  addWidget: function(widget, index) {
    var found = this._widgetList.indexOf(widget);
    if (found !== -1) {
      this._widgetList.splice(found, 1);
    }

    if (typeof index === 'undefined') {
      this._widgetList.push(widget);
    } else {
      this._widgetList.splice(index, 0, widget);
      if (this._curTab >= index) {
        this._curTab++;
      }
    }

    if (this._curTab === -1 && this._widgetList.length) {
      this._curTab = 0;
      this._widgetList[this._curTab].layout().container(this.$center);
      this._widgetList[this._curTab].container(this.$center);
      this._widgetList[this._curTab].parent(this);
    }
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

    this.$container = $container;
    if (this.$container) {
      this.$container.append(this.$frame);
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