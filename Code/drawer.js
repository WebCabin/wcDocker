/*
  A docker container for carrying its own arrangement of docked panels as a slide out drawer.
*/
function wcDrawer(container, parent, position) {
  this.$container = $(container);
  this.$drawer    = null;
  this._position  = position;
  this._parent    = parent;
  this._root      = null;
  this._size      = 100;
  this._expanded  = true;

  this.__init();
}

wcDrawer.prototype = {
///////////////////////////////////////////////////////////////////////////////////////////////////////
// Public Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////
  // Collapses the drawer to its respective side wall.
  collapse: function() {
    this._expanded = false;
  },

  // Expands the drawer.
  expand: function() {
    this._expanded = true;
  },

  // Toggles whether the drawer is collapsed or expanded.
  // Params:
  //    expanded    Optional set the current state expanded (true) or collapsed (false)
  //                if omitted, will toggle the current state.
  toggle: function(expanded) {
    if (expanded === undefined) {
      expanded = !this._expanded;
    }

    expanded? this.expand(): this.collapse();
  },

///////////////////////////////////////////////////////////////////////////////////////////////////////
// Private Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////
  __init: function() {
    this.$drawer = $('<div class="wcDrawer"></div>');
  },

  // Updates the size of the drawer.
  __update: function(opt_fromOrientation, opt_fromPane, opt_oldSize) {
    if (this._root) {
      this._root.__update(opt_fromOrientation, opt_fromPane, opt_oldSize);
    }
  },

  // Checks if the mouse is in a valid anchor position for docking a panel.
  // Params:
  //    mouse     The current mouse position.
  //    ghost     The ghost object.
  __checkAnchorDrop: function(mouse, same, ghost, canSplit) {
    var width = this.$drawer.width();
    var height = this.$drawer.height();
    var offset = this.$drawer.offset();

    if (mouse.y >= offset.top && mouse.y <= offset.top + height &&
        mouse.x >= offset.left && mouse.x <= offset.left + width) {
      ghost.anchor(mouse, {
        x: offset.left,
        y: offset.top,
        w: width,
        h: top-2,
        loc: wcDocker.DOCK_STACKED,
        item: this,
        self: true,
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
  __trigger: function(eventName, data) {
    if (this._root) {
      this._root.__trigger(eventName, data);
    }
  },

  // Saves the current panel configuration into a meta
  // object that can be used later to restore it.
  __save: function() {
    var data = {};
    data.type     = 'wcDrawer';
    data.position = this._position;
    data.size     = this._size;
    if (this._root) {
      data.root = this._root.__save();
    }
    return data;
  },

  // Restores a previously saved configuration.
  __restore: function(data, docker) {
    this._position = data.position;
    this._size     = data.size;
    if (data.root) {
      this._root = docker.__create(data.root, this, this.$drawer);
      this._root.__restore(data.root, docker);
    }

    this.__update();
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
      this.$container.append(this.$drawer);
    } else {
      this.$drawer.remove();
    }
    return this.$container;
  },

  // Disconnects and prepares this widget for destruction.
  __destroy: function() {
    if (this._root) {
      this._root.__destroy();
      this._root = null;
    }
    this.__container(null);
    this._parent = null;
  },
}