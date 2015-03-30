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

  // Updates the size of the drawer.
  __update: function(opt_dontMove) {
    this.__adjustSize();
    this._frame.__update();
  },

  // Adjusts the size of the drawer based on css
  __adjustSize: function() {
    // switch (this._orientation) {
    //   case wcDocker.ORIENTATION.HORIZONTAL:
    //     var top = this.$container.offset().top - this.docker().$container.offset().top;
    //     var height = this.$container.outerHeight();
    //     this.$frame.css('top', top);
    //     this.$frame.css('height', height);
    //     break;
    //   case wcDocker.ORIENTATION.VERTICAL:
    //     var left = this.$container.offset().left - this.docker().$container.offset().left;
    //     var width = this.$container.outerWidth();
    //     this.$frame.css('left', left);
    //     this.$frame.css('width', width);
    //     break;
    // }

    if (this._frame._panelList.length) {
      this._closeSize = this._frame.$tabBar.outerHeight();
      this._parent.$bar.removeClass('wcSplitterHidden');
    } else {
      this._closeSize = 0;
      this._parent.$bar.addClass('wcSplitterHidden');
    }

    // switch (this._position) {
    //   case wcDocker.DOCK.LEFT:
    //     this.$frame.addClass('wcCollapserLeft');
    //     var size = this.$bar.css('left', 0).outerHeight(this.$frame.innerHeight()).outerWidth();
    //     this.$drawer.css('left', size);
    //     this._closeSize = size;
    //     break;
    //   case wcDocker.DOCK.RIGHT:
    //     this.$frame.addClass('wcCollapserRight');
    //     var size = this.$bar.css('right', 0).outerHeight(this.$frame.innerHeight()).outerWidth();
    //     this.$drawer.css('right', size);
    //     this._closeSize = size;
    //     break;
    //   case wcDocker.DOCK.TOP:
    //     this.$frame.addClass('wcCollapserTop');
    //     var size = this.$bar.css('top', 0).outerWidth(this.$frame.innerWidth()).outerHeight();
    //     this.$drawer.css('top', size);
    //     this._closeSize = size;
    //     break;
    //   case wcDocker.DOCK.BOTTOM:
    //     this.$frame.addClass('wcCollapserBottom');
    //     var size = this.$bar.css('bottom', 0).outerWidth(this.$frame.innerWidth()).outerHeight();
    //     this.$drawer.css('bottom', size);
    //     this._closeSize = size;
    //     break;
    // }
  },

  // Checks if the mouse is in a valid anchor position for docking a panel.
  // Params:
  //    mouse     The current mouse position.
  //    ghost     The ghost object.
  __checkAnchorDrop: function(mouse, same, ghost, canSplit) {
    var width = this.$drawer.outerWidth();
    var height = this.$drawer.outerHeight();
    var offset = this.$drawer.offset();

    if (!this._root && mouse.y >= offset.top && mouse.y <= offset.top + height &&
        mouse.x >= offset.left && mouse.x <= offset.left + width) {
      ghost.anchor(mouse, {
        x: offset.left-2,
        y: offset.top-2,
        w: width,
        h: height,
        loc: wcDocker.DOCK.STACKED,
        item: this,
        self: false,
      });
      return true;
    }
    return false;
  },

  // Retrieves the bounding rect for this drawer.
  __rect: function() {
    var offset = this.$drawer.offset();
    var width = this.$drawer.width();
    var height = this.$drawer.height();

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
    data.type     = 'wcCollapser';
    data.position = this._position;
    data.size     = this._openSize;
    data.expanded = this._expanded;
    if (this._root) {
      data.root = this._root.__save();
    }
    return data;
  },

  // Restores a previously saved configuration.
  __restore: function(data, docker) {
    this._openSize     = data.size;
    this._expanded = data.expanded;
    if (data.root) {
      this._root = docker.__create(data.root, this, this.$drawer);
      this._root.__restore(data.root, docker);
    }
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