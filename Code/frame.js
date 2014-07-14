/*
  The frame is a container for a panel, and can contain multiple panels inside it, each appearing
  as a tabbed item.  All docking panels have a frame, but the frame can change any time the panel
  is moved.
*/
function wcFrame($container, parent, isFloating) {
  this.$container = $container;
  this._parent = parent;
  this._isFloating = isFloating;

  this.$frame   = null;
  this.$title   = null;
  this.$center  = null;
  this.$close   = null;
  this.$top     = null;
  this.$bottom  = null;
  this.$left    = null;
  this.$right   = null;
  this.$corner1 = null;
  this.$corner2 = null;
  this.$corner3 = null;
  this.$corner4 = null;

  this.$tabList = [];

  this._curTab = -1;
  this._panelList = [];

  this._pos = {
    x: 0.5,
    y: 0.5,
  };

  this._size = {
    x: 400,
    y: 400,
  };

  this._anchorMouse = {
    x: 0,
    y: 0,
  };

  this._init();
};

wcFrame.prototype = {
  _init: function() {
    this.$frame   = $('<div class="wcFrame wcWide wcTall">');
    this.$title   = $('<div class="wcFrameTitle">');
    this.$center  = $('<div class="wcFrameCenter wcWide">');
    this.$close   = $('<div class="wcFrameCloseButton">X</div>');
    this.$frame.append(this.$title);
    this.$frame.append(this.$close);

    if (this._isFloating) {
      this.$top     = $('<div class="wcFrameEdgeH wcFrameEdge"></div>').css('top', '-6px').css('left', '0px').css('right', '0px');
      this.$bottom  = $('<div class="wcFrameEdgeH wcFrameEdge"></div>').css('bottom', '-6px').css('left', '0px').css('right', '0px');
      this.$left    = $('<div class="wcFrameEdgeV wcFrameEdge"></div>').css('left', '-6px').css('top', '0px').css('bottom', '0px');
      this.$right   = $('<div class="wcFrameEdgeV wcFrameEdge"></div>').css('right', '-6px').css('top', '0px').css('bottom', '0px');
      this.$corner1 = $('<div class="wcFrameCornerNW wcFrameEdge"></div>').css('top', '-6px').css('left', '-6px');
      this.$corner2 = $('<div class="wcFrameCornerNE wcFrameEdge"></div>').css('top', '-6px').css('right', '-6px');
      this.$corner3 = $('<div class="wcFrameCornerNW wcFrameEdge"></div>').css('bottom', '-6px').css('right', '-6px');
      this.$corner4 = $('<div class="wcFrameCornerNE wcFrameEdge"></div>').css('bottom', '-6px').css('left', '-6px');

      this.$frame.append(this.$top);
      this.$frame.append(this.$bottom);
      this.$frame.append(this.$left);
      this.$frame.append(this.$right);
      this.$frame.append(this.$corner1);
      this.$frame.append(this.$corner2);
      this.$frame.append(this.$corner3);
      this.$frame.append(this.$corner4);
    }

    this.$frame.append(this.$center);

    // Floating windows have no container.
    this.container(this.$container);

    if (this._isFloating) {
      this.$frame.addClass('wcFloating');
    }
  },

  // Updates the size of the frame.
  _update: function() {
    var width = this.$container.width();
    var height = this.$container.height();

    // Floating windows manage their own sizing.
    if (this._isFloating) {
      this.$frame.css('left', (this._pos.x * width) - this._size.x/2 + 'px');
      this.$frame.css('top', (this._pos.y * height) - this._size.y/2 + 'px');
      this.$frame.css('width', this._size.x + 'px');
      this.$frame.css('height', this._size.y + 'px');
    }

    var panel = this.panel();
    if (panel) {
      var scrollable = panel.scrollable();
      this.$center.toggleClass('wcScrollableX', scrollable.x);
      this.$center.toggleClass('wcScrollableY', scrollable.y);

      if (panel.moveable() && panel.title()) {
        this.$frame.prepend(this.$title);
        this.$center.css('top', '21px');
      } else {
        this.$title.remove();
        this.$center.css('top', '0px');
      }

      if (panel.closeable()) {
        this.$frame.append(this.$close);
      } else {
        this.$close.remove();
      }

      panel._update();
    }
  },

  _updateTabs: function() {
    this.$title.empty();
    this.$center.empty();
    var $tabList = $('<ul class="wcPanelTab">');
    this.$title.append($tabList);

    var self = this;
    for (var i = 0; i < this._panelList.length; ++i) {
      var $tab = $('<li><a href="' + i + '">' + this._panelList[i].title() + '</a></li>');
      $tabList.append($tab);

      var $tabContent = $('<div class="wcPanelTabContent" id="' + i + '">');
      this.$center.append($tabContent);
      this._panelList[i].container($tabContent);
      this._panelList[i].parent(this);

      if (this._curTab !== i) {
        $tabContent.addClass('wcPanelTabContentHidden');
      } else {
        $tab.find('a').addClass('wcPanelTabActive');
      }

      $tab.find('a').on('mousedown', function(event) {
        var index = parseInt($(this).attr('href'));
        self.panel(index);
      });
    }
  },

  // Brings the frame into focus.
  // Params:
  //    flash     Optional, if true will flash the window.
  _focus: function(flash) {
    if (flash) {
      var $flasher = $('<div class="wcFrameFlasher">');
      this.$frame.append($flasher);
      $flasher.animate({
        opacity: 0.25,
      },100)
      .animate({
        opacity: 0.0,
      },100)
      .animate({
        opacity: 0.1,
      },50)
      .animate({
        opacity: 0.0,
      },50)
      .queue(function(next) {
        $flasher.remove();
        next();
      });
    }
  },

  // Gets, or Sets the position of the frame.
  // Params:
  //    x, y    If supplied, assigns the new position.
  //    pixels  If true, the coordinates given will be treated as a
  //            pixel position rather than a percentage.
  pos: function(x, y, pixels) {
    var width = this.$container.width();
    var height = this.$container.height();

    if (typeof x === 'undefined') {
      if (pixels) {
        return {x: this._pos.x*width, y: this._pos.y*height};
      } else {
        return {x: this._pos.x, y: this._pos.y};
      }
    }

    if (pixels) {
      this._pos.x = x/width;
      this._pos.y = y/height;
    } else {
      this._pos.x = x;
      this._pos.y = y;
    }
  },

  // Gets the desired size of the panel.
  size: function() {
    var size = {
      x: -1,
      y: -1,
    };

    for (var i = 0; i < this._panelList.length; ++i) {
      if (size.x < this._panelList[i].size().x) {
        size.x = this._panelList[i].size().x;
      }
      if (size.y < this._panelList[i].size().y) {
        size.y = this._panelList[i].size().y;
      }
    }

    if (size.x < 0 || size.y < 0) {
      return false;
    }
    return size;
  },

  // Gets the minimum size of the panel.
  minSize: function() {
    var size = {
      x: 0,
      y: 0,
    };

    for (var i = 0; i < this._panelList.length; ++i) {
      size.x = Math.max(size.x, this._panelList[i].minSize().x);
      size.y = Math.max(size.y, this._panelList[i].minSize().y);
    }
    return size;
  },

  // Gets the minimum size of the panel.
  maxSize: function() {
    var size = {
      x: Infinity,
      y: Infinity,
    };

    for (var i = 0; i < this._panelList.length; ++i) {
      size.x = Math.min(size.x, this._panelList[i].maxSize().x);
      size.y = Math.min(size.y, this._panelList[i].maxSize().y);
    }
    return size;
  },

  // Adds a given panel as a new tab item.
  // Params:
  //    panel    The panel to add.
  //    index     An optional index to insert the tab at.
  addPanel: function(panel, index) {
    var found = this._panelList.indexOf(panel);
    if (found !== -1) {
      this._panelList.splice(found, 1);
    }

    if (typeof index === 'undefined') {
      this._panelList.push(panel);
    } else {
      this._panelList.splice(index, 0, panel);
      if (this._curTab >= index) {
        this._curTab++;
      }
    }

    if (this._curTab === -1 && this._panelList.length) {
      this._curTab = 0;
    }

    this._size = this.size();
    this._updateTabs();
  },

  // Removes a given panel from the tab item.
  // Params:
  //    panel       The panel to remove.
  // Returns:
  //    bool        Returns whether or not any panels still remain.
  removePanel: function(panel) {
    for (var i = 0; i < this._panelList.length; ++i) {
      if (this._panelList[i] === panel) {
        if (this._curTab >= i) {
          this._curTab--;
        }

        this._panelList[i].layout().container(null);
        this._panelList[i].container(null);
        this._panelList[i].parent(null);

        this._panelList.splice(i, 1);
        break;
      }
    }

    if (this._curTab === -1 && this._panelList.length) {
      this._curTab = 0;
    }

    this._updateTabs();
    return this._panelList.length > 0;
  },

  // Gets, or Sets the currently visible panel.
  // Params:
  //    tabIndex      If supplied, sets the current tab.
  // Returns:
  //    wcPanel       The currently visible panel.
  panel: function(tabIndex) {
    if (tabIndex !== 'undefined') {
      if (tabIndex > -1 && tabIndex < this._panelList.length) {
        this.$title.find('a[href="' + this._curTab + '"]').removeClass('wcPanelTabActive');
        this.$center.find('.wcPanelTabContent[id="' + this._curTab + '"]').addClass('wcPanelTabContentHidden');
        this._curTab = tabIndex;
        this.$title.find('a[href="' + tabIndex + '"]').addClass('wcPanelTabActive');
        this.$center.find('.wcPanelTabContent[id="' + tabIndex + '"]').removeClass('wcPanelTabContentHidden');
      }
    }

    if (this._curTab > -1 && this._curTab < this._panelList.length) {
      return this._panelList[this._curTab];
    }
    return false;
  },

  // Moves the panel based on mouse dragging.
  // Params:
  //    mouse     The current mouse position.
  move: function(mouse) {
    var width = this.$container.width();
    var height = this.$container.height();

    this._pos.x = (mouse.x + this._anchorMouse.x) / width;
    this._pos.y = (mouse.y + this._anchorMouse.y) / height;
  },

  // Sets the anchor position for moving the panel.
  // Params:
  //    mouse     The current mouse position.
  anchorMove: function(mouse) {
    var width = this.$container.width();
    var height = this.$container.height();

    this._anchorMouse.x = (this._pos.x * width) - mouse.x;
    this._anchorMouse.y = (this._pos.y * height) - mouse.y;
  },

  // Checks if the mouse is in a valid anchor position for docking a panel.
  // Params:
  //    mouse     The current mouse position.
  //    same      Whether the moving frame and this one are the same.
  checkAnchorDrop: function(mouse, same, ghost) {
    var panel = this.panel();
    if (panel && panel.moveable()) {
      return panel.layout().checkAnchorDrop(mouse, same, ghost, this._isFloating, this.$frame);
    }
    return false;
  },

  // Resizes the panel based on mouse dragging.
  // Params:
  //    edges     A list of edges being moved.
  //    mouse     The current mouse position.
  resize: function(edges, mouse) {
    var width = this.$container.width();
    var height = this.$container.height();
    var offset = this.$container.offset();

    mouse.x -= offset.left;
    mouse.y -= offset.top;

    var minSize = this.minSize();
    var maxSize = this.maxSize();

    var pos = {
      x: (this._pos.x * width) - this._size.x/2,
      y: (this._pos.y * height) - this._size.y/2,
    };

    for (var i = 0; i < edges.length; ++i) {
      switch (edges[i]) {
        case 'top':
          this._size.y += pos.y - mouse.y-2;
          pos.y = mouse.y+2;
          if (this._size.y < minSize.y) {
            pos.y += this._size.y - minSize.y;
            this._size.y = minSize.y;
          }
          if (this._size.y > maxSize.y) {
            pos.y += this._size.y - maxSize.y;
            this._size.y = maxSize.y;
          }
          break;
        case 'bottom':
          this._size.y = mouse.y-4 - pos.y;
          if (this._size.y < minSize.y) {
            this._size.y = minSize.y;
          }
          if (this._size.y > maxSize.y) {
            this._size.y = maxSize.y;
          }
          break;
        case 'left':
          this._size.x += pos.x - mouse.x-2;
          pos.x = mouse.x+2;
          if (this._size.x < minSize.x) {
            pos.x += this._size.x - minSize.x;
            this._size.x = minSize.x;
          }
          if (this._size.x > maxSize.x) {
            pos.x += this._size.x - maxSize.x;
            this._size.x = maxSize.x;
          }
          break;
        case 'right':
          this._size.x = mouse.x-4 - pos.x;
          if (this._size.x < minSize.x) {
            this._size.x = minSize.x;
          }
          if (this._size.x > maxSize.x) {
            this._size.x = maxSize.x;
          }
          break;
      }

      this._pos.x = (pos.x + this._size.x/2) / width;
      this._pos.y = (pos.y + this._size.y/2) / height;
    }
  },

  // Turn off or on a shadowing effect to signify this widget is being moved.
  // Params:
  //    enabled       Whether to enable shadow mode.
  shadow: function(enabled) {
    if (enabled) {
      this.$frame.stop().animate({
        opacity: 0.3,
      }, 300);
    } else {
      this.$frame.stop().animate({
        opacity: 1.0,
      }, 300);
    }
  },

  // Retrieves the bounding rect for this frame.
  rect: function() {
    var offset = this.$frame.offset();
    var width = this.$frame.width();
    var height = this.$frame.height();

    return {
      x: offset.left,
      y: offset.top,
      w: width,
      h: height,
    };
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

    this.$frame.remove();
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

  // Disconnects and prepares this widget for destruction.
  destroy: function() {
    this._curTab = -1;
    for (var i = 0; i < this._panelList.length; ++i) {
      this._panelList[i].layout().container(null);
      this._panelList[i].container(null);
      this._panelList[i].parent(null);
    }

    while (this._panelList.length) this._panelList.pop();
    this.container(null);
    this.parent(null);
  },
};