/**
 * @class
 * A collapsable container for carrying panels.<br>
 * 
 * @version 3.0.0
 * @constructor
 * @description
 * <b><i>PRIVATE<i> - Handled internally by [docker]{@link wcDocker} and <u>should never be constructed by the user.</u></b>
 * @param {external:jQuery~selector|external:jQuery~Object|external:domNode} container - A container element for this drawer.
 * @param {wcSplitter|wcDocker} parent  - The drawer's parent object.
 * @param {wcDocker.DOCK} position      - A docking position to place this drawer.
 */
/*
  A docker container for carrying its own arrangement of docked panels as a slide out drawer.
*/
function wcCollapser(container, parent, position) {
  this.$container   = $(container);
  this.$frame       = null;

  this._position    = position;
  this._parent      = parent;
  this._frame       = null;
  this._openSize    = (this._position === wcDocker.DOCK.LEFT)? 0.25: 0.75;
  this._closeSize   = 0;
  this._expanded    = false;
  this._sliding     = false;
  this._orientation = (this._position === wcDocker.DOCK.LEFT || this._position === wcDocker.DOCK.RIGHT)? wcDocker.ORIENTATION.HORIZONTAL: wcDocker.ORIENTATION.VERTICAL;

  this.__init();
}

wcCollapser.prototype = {
///////////////////////////////////////////////////////////////////////////////////////////////////////
// Public Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Retrieves the main [docker]{@link wcDocker} instance.
   *
   * @returns {wcDocker} - The top level docker object.
   */
  docker: function() {
    var parent = this._parent;
    while (parent && !(parent instanceof wcDocker)) {
      parent = parent._parent;
    }
    return parent;
  },

  /**
   * Collapses the drawer to its respective side wall.
   */
  collapse: function() {
    if (this._expanded) {
      this._openSize = this._parent.pos();
      this._expanded = false;
      this._sliding = true;

      var self = this;
      var fin = function() {
        self._sliding = false;
        self._parent.__update();
      }

      switch (this._position) {
        case wcDocker.DOCK.TOP:
        case wcDocker.DOCK.LEFT:
          this._parent.animPos(0, fin);
          break;
        case wcDocker.DOCK.RIGHT:
        case wcDocker.DOCK.BOTTOM:
          this._parent.animPos(1, fin);
          break;
      }
    }
  },

  /**
   * Expands the drawer.
   */
  expand: function() {
    if (!this._expanded) {
      this._expanded = true;
      this._sliding = true;
      var self = this;
      this._parent.animPos(this._openSize, function() {
        self._sliding = false;
        self._parent.__update();
      });
    }
  },

  /**
   * Toggles the expansion and collapse of the drawer.
   *
   * @param {Boolean} [expanded] - If supplied, sets the expansion state of the drawer.
   *                               If ommited, the state is toggled.
   */
  toggle: function(expanded) {
    if (expanded === undefined) {
      expanded = !this._expanded;
    }

    expanded? this.expand(): this.collapse();
  },

  /**
   * Gets whether the drawer is expanded.
   *
   * @returns {Boolean} - The current expanded state.
   */
  isExpanded: function() {
    return this._expanded;
  },

  /** 
   * The minimum size constraint for the drawer area.
   *
   * @returns {wcDocker~Size} - The minimum size.
   */
  minSize: function() {
    if (this._expanded) {
      if (this._root && typeof this._root.minSize === 'function') {
        return this._root.minSize();
      } else {
        return {x: 100, y: 100};
      }
    }
    this.__adjustSize();
    return {x: this._closeSize, y: this._closeSize};
  },

  /**
   * The maximum size constraint for the drawer area.
   *
   * @returns {wcDocker~Size} - The maximum size.
   */
  maxSize: function() {
    var isHorizontal = (this._orientation === wcDocker.ORIENTATION.HORIZONTAL)? true: false;
    if (this._expanded || this._sliding) {
      if (this._root && typeof this._root.maxSize === 'function') {
        return {
          x: (isHorizontal?  this._root.maxSize().x: Infinity),
          y: (!isHorizontal? this._root.maxSize().y: Infinity)
        };
      } else {
        return {x: Infinity, y: Infinity};
      }
    }
    this.__adjustSize();
    return {
      x: (isHorizontal?  this._closeSize: Infinity),
      y: (!isHorizontal? this._closeSize: Infinity)
    };
  },

///////////////////////////////////////////////////////////////////////////////////////////////////////
// Private Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////
  __init: function() {
    this.$frame = $('<div class="wcCollapserFrame">');

    this.__container(this.$container);

    this._frame = new wcFrame(this.$frame, this, false);
    this._frame.tabOrientation(this._position);
  },

  // Updates the size of the collapser.
  __update: function(opt_dontMove) {
    this.__adjustSize();
    this._frame.__update();
  },

  // Adjusts the size of the collapser based on css
  __adjustSize: function() {
    if (this._frame._panelList.length) {
      this._closeSize = this._frame.$tabBar.outerHeight();
      this._parent.$bar.removeClass('wcSplitterHidden');
    } else {
      this._closeSize = 0;
      this._parent.$bar.addClass('wcSplitterHidden');
    }
  },

  // Retrieves the bounding rect for this collapser.
  __rect: function() {
    var offset = this.$frame.offset();
    var width = this.$frame.width();
    var height = this.$frame.height();

    switch (this._position) {
      case wcDocker.DOCK.BOTTOM:
        height = this.docker().$container.height() * (1.0 - this._openSize);
        break;
      case wcDocker.DOCK.LEFT:
        width = this.docker().$container.width() * this._openSize;
        break;
      case wcDocker.DOCK.RIGHT:
        width = this.docker().$container.width() * (1.0 - this._openSize);
        break;
    }

    return {
      x: offset.left,
      y: offset.top,
      w: width,
      h: height,
    };
  },

  // Triggers an event exclusively on the docker and none of its panels.
  // Params:
  //    eventName   The name of the event.
  //    data        A custom data parameter to pass to all handlers.
  // __trigger: function(eventName, data) {
  //   if (this._root) {
  //     this._root.__trigger(eventName, data);
  //   }
  // },

  // Saves the current panel configuration into a meta
  // object that can be used later to restore it.
  __save: function() {
    var data = {};
    // data.type     = 'wcCollapser';
    // data.position = this._position;
    // data.size     = this._openSize;
    // data.expanded = this._expanded;
    // if (this._root) {
    //   data.root = this._root.__save();
    // }
    return data;
  },

  // Restores a previously saved configuration.
  __restore: function(data, docker) {
    // this._openSize     = data.size;
    // this._expanded = data.expanded;
    // if (data.root) {
    //   this._root = docker.__create(data.root, this, this.$drawer);
    //   this._root.__restore(data.root, docker);
    // }
  },

  // Gets, or Sets a new container for this layout.
  // Params:
  //    $container          If supplied, sets a new container for this layout.
  //    parent              If supplied, sets a new parent for this layout.
  // Returns:
  //    JQuery collection   The current container.
  __container: function($container) {
    if (typeof $container === 'undefined') {
      return this.$container;
    }

    this.$container = $container;

    if (this.$container) {
      this.$container.append(this.$frame);
    } else {
      this.$frame.remove();
    }
    return this.$container;
  },

  // Disconnects and prepares this widget for destruction.
  __destroy: function() {
    if (this._frame) {
      this._frame.__destroy();
      this._frame = null;
    }

    this.__container(null);
    this._parent = null;
  },
}