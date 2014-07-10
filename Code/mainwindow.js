/*
  The main window instance.  This manages all of the dock windows and user input.
  There should only be one instance of this used, although it is not required.
  The $parent is a JQuery object of the container element.
*/
function wcDocker($container) {
  this.$container = $container.addClass('wcDocker');
  // $container.css('width', '100%');
  // $container.css('height', '100%');

  this._root = null;
  this._center = null;
  this._floatingList = [];

  this._frameList = [];
  this._splitterList = [];

  this._dockWidgetTypeList = [];

  this._draggingSplitter = false;
  this._draggingFrame = false;
  this._draggingFrameSizer = false;
  this._ghost = false;
  this._anchorDrop = false;

  this._init();
};

wcDocker.DOCK_FLOAT  = 'float';
wcDocker.DOCK_LEFT   = 'left';
wcDocker.DOCK_RIGHT  = 'right';
wcDocker.DOCK_BOTTOM = 'bottom';

wcDocker.prototype = {
  _init: function() {
    this._center = new wcLayout(this.$container, this);
    this._root = this._center;


    var self = this;
    $(window).resize(self._resize.bind(self));

    // Close button on frames should destroy those widgets.
    $('body').on('click', '.wcFrameCloseButton', function() {
      var frame;
      for (var i = 0; i < self._frameList.length; ++i) {
        if (self._frameList[i].$close[0] == this) {
          frame = self._frameList[i];
          break;
        }
      }
      if (frame) {
        self.removeDockWidget(frame.widget());
        self._focusFloatingFrame(frame);
      }
    });

    // Dock button on floating frames should allow them to dock.
    $('body').on('click', '.wcFrameDockButton', function() {
      for (var i = 0; i < self._frameList.length; ++i) {
        if (self._frameList[i]._isFloating && self._frameList[i].$dock[0] == this) {
          self._frameList[i].$dock.toggleClass('wcFrameDockButtonLocked');

          self._focusFloatingFrame(self._frameList[i]);
          break;
        }
      }
    });

    // Mouse down on a splitter bar will allow you to resize them.
    $('body').on('mousedown', '.wcSplitterBar', function(event) {
      for (var i = 0; i < self._splitterList.length; ++i) {
        if (self._splitterList[i].$bar[0] === this) {
          self._draggingSplitter = self._splitterList[i];
          break;
        }
      }
    });

    // Mouse down on a frame title will allow you to move them.
    $('body').on('mousedown', '.wcFrameTitle', function(event) {
      for (var i = 0; i < self._frameList.length; ++i) {
        if (self._frameList[i].$title[0] == this) {
          self._draggingFrame = self._frameList[i];

          var mouse = {
            x: event.clientX,
            y: event.clientY,
          };
          self._draggingFrame.anchorMove(mouse);

          // If the window is able to be docked, give it a dark shadow tint and
          // begin the movement process
          if (!self._draggingFrame._isFloating || (event.which !== 1 || self._draggingFrame.$dock.hasClass('wcFrameDockButtonLocked'))) {
            self._draggingFrame.shadow(true);
            var rect = self._draggingFrame.rect();
            self._ghost = new wcGhost(rect, mouse);

            // Also fade out all floating windows as they are not dockable.
            for (var a = 0; a < self._frameList.length; ++a) {
              if (self._frameList[a]._isFloating) {
                self._frameList[a].shadow(true);
              }
            }
          }
          break;
        }
      }
      if (self._draggingFrame) {
        self._focusFloatingFrame(self._draggingFrame);
      }
    });

    // Mouse down on a frame title will allow you to move them.
    $('body').on('mousedown', '.wcFrameCenter', function(event) {
      for (var i = 0; i < self._frameList.length; ++i) {
        if (self._frameList[i].$center[0] == this) {
          self._focusFloatingFrame(self._frameList[i]);
          break;
        }
      }
    });

    // Floating frames have resizable edges.
    $('body').on('mousedown', '.wcFrameEdge', function(event) {
      for (var i = 0; i < self._frameList.length; ++i) {
        if (self._frameList[i]._isFloating) {
          if (self._frameList[i].$top[0] == this) {
            self._draggingFrame = self._frameList[i];
            self._draggingFrameSizer = ['top'];
            break;
          } else if (self._frameList[i].$bottom[0] == this) {
            self._draggingFrame = self._frameList[i];
            self._draggingFrameSizer = ['bottom'];
            break;
          } else if (self._frameList[i].$left[0] == this) {
            self._draggingFrame = self._frameList[i];
            self._draggingFrameSizer = ['left'];
            break;
          } else if (self._frameList[i].$right[0] == this) {
            self._draggingFrame = self._frameList[i];
            self._draggingFrameSizer = ['right'];
            break;
          } else if (self._frameList[i].$corner1[0] == this) {
            self._draggingFrame = self._frameList[i];
            self._draggingFrameSizer = ['top', 'left'];
            break;
          } else if (self._frameList[i].$corner2[0] == this) {
            self._draggingFrame = self._frameList[i];
            self._draggingFrameSizer = ['top', 'right'];
            break;
          } else if (self._frameList[i].$corner3[0] == this) {
            self._draggingFrame = self._frameList[i];
            self._draggingFrameSizer = ['bottom', 'right'];
            break;
          } else if (self._frameList[i].$corner4[0] == this) {
            self._draggingFrame = self._frameList[i];
            self._draggingFrameSizer = ['bottom', 'left'];
            break;
          }
        }
      }
      if (self._draggingFrame) {
        self._focusFloatingFrame(self._draggingFrame);
      }
    });

    // Mouse move will allow you to move an object that is being dragged.
    $('body').on('mousemove', function(event) {
      if (self._draggingSplitter) {
        var mouse = {
          x: event.clientX,
          y: event.clientY,
        };
        self._draggingSplitter.moveBar(mouse);
        self.update();
      } else if (self._draggingFrameSizer) {
        var mouse = {
          x: event.clientX,
          y: event.clientY,
        };

        var offset = self.$container.offset();
        mouse.x += offset.left;
        mouse.y += offset.top;

        self._draggingFrame.resize(self._draggingFrameSizer, mouse);
        self.update();
      } else if (self._draggingFrame) {
        var mouse = {
          x: event.clientX,
          y: event.clientY,
        };

        // Floating widgets without their dock button active just move without docking.
        if (self._draggingFrame._isFloating && (event.which === 1 && !self._draggingFrame.$dock.hasClass('wcFrameDockButtonLocked'))) {
          self._draggingFrame.move(mouse);
          self.update();
        }

        if (self._ghost) {
          self._ghost.move(mouse);

          var forceFloat = !(self._draggingFrame._isFloating || event.which === 1);
          var found = false;

          // Check anchoring with self.
          var anchorDrop = self._draggingFrame.checkAnchorDrop(mouse, true);
          if (anchorDrop) {
            if (!self._anchorDrop || anchorDrop.loc !== self._anchorDrop.loc || anchorDrop.frame !== self._anchorDrop.frame) {
              self._ghost.anchor(mouse);
              self._anchorDrop = anchorDrop;
              if (anchorDrop) {
                self._ghost.anchor(mouse, anchorDrop);
              }
            }
            found = true;
          }

          // Bypass anchoring if middle mouse is used on a non-floating window.
          if (!found && !forceFloat) {
            // Check anchoring with all other frames.
            for (var i = 0; i < self._frameList.length; ++i) {
              anchorDrop = self._frameList[i].checkAnchorDrop(mouse, false);
              if (anchorDrop) {
                if (!self._anchorDrop || anchorDrop.loc !== self._anchorDrop.loc || anchorDrop.frame !== self._anchorDrop.frame) {
                  self._ghost.anchor(mouse);
                  self._anchorDrop = anchorDrop;
                  if (anchorDrop) {
                    self._ghost.anchor(mouse, anchorDrop);
                  }
                }
                found = true;
                break;
              }
            }

            // Check with the main center window for docking.
            function _checkAnchorDrop(mouse) {
              var width = self._center.$table.width();
              var height = self._center.$table.height();
              var offset = self._center.$table.offset();

              // Bottom side docking.
              if (mouse.y >= offset.top + height*0.75 && mouse.y <= offset.top + height &&
                  mouse.x >= offset.left && mouse.x <= offset.left + width) {
                return {
                  x: offset.left,
                  y: offset.top + (height - height*0.4),
                  w: width,
                  h: height*0.4,
                  loc: wcDocker.DOCK_BOTTOM,
                };
              }

              // Left side docking
              if (mouse.y >= offset.top && mouse.y <= offset.top + height) {
                if (mouse.x >= offset.left && mouse.x <= offset.left + width*0.25) {
                  return {
                    x: offset.left,
                    y: offset.top,
                    w: width*0.4,
                    h: height,
                    loc: wcDocker.DOCK_LEFT,
                  };
                }

                // Right side docking
                if (mouse.x >= offset.left + width*0.75 && mouse.x <= offset.left + width) {
                  return {
                    x: offset.left + width*0.6,
                    y: offset.top,
                    w: width*0.4,
                    h: height,
                    loc: wcDocker.DOCK_RIGHT,
                  };
                }
              }
            };

            anchorDrop = _checkAnchorDrop(mouse);
            if (anchorDrop) {
              if (!self._anchorDrop || anchorDrop.loc !== self._anchorDrop.loc || anchorDrop.frame !== self._anchorDrop.frame) {
                self._ghost.anchor(mouse);
                self._anchorDrop = anchorDrop;
                if (anchorDrop) {
                  self._ghost.anchor(mouse, anchorDrop);
                }
              }
              found = true;
            }
          }

          if (!found) {
            self._anchorDrop = false;
            self._ghost.anchor(mouse);
          }
        }
      }
    });

    // Mouse released
    $('body').on('mouseup', function(event) {
      if (self._draggingFrame) {
        for (var i = 0; i < self._frameList.length; ++i) {
          self._frameList[i].shadow(false);
        }
      }

      if (self._ghost) {
        if (!self._anchorDrop) {
          var widget = self.moveDockWidget(self._draggingFrame.widget(), wcDocker.DOCK_FLOAT, false);
          var mouse = {
            x: event.clientX,
            y: event.clientY,
          };
          var frame = widget.parent();
          if (frame instanceof wcFrameWidget) {
            frame._pos.x = mouse.x
            frame._pos.y = mouse.y
          }

          // frame._pos.x -= self._ghost.rect().x
          // frame._pos.y -= self._ghost.rect().y
          frame._size.x = self._ghost.rect().w;
          frame._size.y = self._ghost.rect().h;

          self.update();
        }
        self._ghost.destroy();
      }

      if (self._anchorDrop && self._anchorDrop.frame !== self._draggingFrame) {
        var parentWidget;
        if (self._anchorDrop.frame) {
          parentWidget = self._anchorDrop.frame.widget();
        }
        self.moveDockWidget(self._draggingFrame.widget(), self._anchorDrop.loc, false, parentWidget);
      }

      self._anchorDrop = false;
      self._ghost = false;
      self._draggingSplitter = false;
      self._draggingFrame = false;
      self._draggingFrameSizer = false;
    });
  },

  // On window resized event.
  _resize: function(event) {
    this.update();
  },

  // Brings a floating window to the top.
  _focusFloatingFrame: function(frame) {
    for (var i = 0; i < this._frameList.length; ++i) {
      if (this._frameList[i]._isFloating) {
        this._frameList[i].$frame.css('z-index', '100');
        if (this._frameList[i] === frame) {
          this._frameList[i].$frame.css('z-index', '101');
        }
      }
    }
    this.update();
  },

  // Creates a new frame for the widget and then attaches it
  // to the window.
  // Params:
  //    widget        The widget to insert.
  //    location      The desired location for the widget.
  //    parentWidget  An optional widget to 'split', if not supplied the
  //                  new widget will split the center window.
  _addDockWidgetAlone: function(widget, location, parentWidget) {
    if (parentWidget) {
      var parentFrame = parentWidget.parent();
      if (parentFrame instanceof wcFrameWidget) {
        var parentSplitter = parentFrame.parent();
        if (parentSplitter instanceof wcSplitter) {
          var splitter;
          var left  = parentSplitter.pane(0);
          var right = parentSplitter.pane(1);
          if (left === parentFrame) {
            splitter = new wcSplitter(null, parentSplitter, location !== wcDocker.DOCK_BOTTOM);
            parentSplitter.pane(0, splitter);
          } else {
            splitter = new wcSplitter(null, parentSplitter, location !== wcDocker.DOCK_BOTTOM);
            parentSplitter.pane(1, splitter);
          }

          if (splitter) {
            this._splitterList.push(splitter);
            frame = new wcFrameWidget(null, splitter, false);
            this._frameList.push(frame);
            if (location === wcDocker.DOCK_LEFT) {
              splitter.pane(0, frame);
              splitter.pane(1, parentFrame);
              splitter.pos(0.4);
            } else {
              splitter.pane(0, parentFrame);
              splitter.pane(1, frame);
              splitter.pos(0.6);
            }

            frame.addWidget(widget);
          }
          return;
        }
      }
    }

    // Floating windows need no placement.
    if (location === wcDocker.DOCK_FLOAT) {
      var frame = new wcFrameWidget(this.$container, this, true);
      this._frameList.push(frame);
      this._floatingList.push(frame);
      frame.addWidget(widget);
      return;
    }

    var splitter;
    if (this._center === this._root) {
      // The center is the root when no dock widgets have been docked yet.
      splitter = new wcSplitter(this.$container, this, location !== wcDocker.DOCK_BOTTOM);
      this._root = splitter;
    } else {
      // The parent of the center should be a splitter, we need to insert another one in between.
      var parent = this._center.parent();
      if (parent instanceof wcSplitter) {
        var left  = parent.pane(0);
        var right = parent.pane(1);
        if (left === this._center) {
          splitter = new wcSplitter(null, parent, location !== wcDocker.DOCK_BOTTOM);
          parent.pane(0, splitter);
        } else {
          splitter = new wcSplitter(null, parent, location !== wcDocker.DOCK_BOTTOM);
          parent.pane(1, splitter);
        }
      }
    }

    if (splitter) {
      this._splitterList.push(splitter);
      var frame = new wcFrameWidget(null, splitter, false);
      this._frameList.push(frame);

      if (location === wcDocker.DOCK_LEFT) {
        splitter.pane(0, frame);
        splitter.pane(1, this._center);
        splitter.findBestPos();
      } else {
        splitter.pane(0, this._center);
        splitter.pane(1, frame);
        splitter.findBestPos();
      }

      frame.addWidget(widget);
    }
  },

  // Attempts to insert a given dock widget into an already existing frame.
  // If insertion is not possible for any reason, the widget will be
  // placed in its own frame instead.
  // Params:
  //    widget        The widget to insert.
  //    location      The desired location for the widget.
  //    parentWidget  An optional widget to 'split', if not supplied the
  //                  new widget will split the center window.
  _addDockWidgetGrouped: function(widget, location, parentWidget) {
    if (parentWidget) {
      var frame = parentWidget.parent();
      if (frame instanceof wcFrameWidget) {
        frame.addWidget(widget);
        return;
      }
    }

    // Floating windows need no placement.
    if (location === wcDocker.DOCK_FLOAT) {
      var frame;
      if (this._floatingList.length) {
        frame = this._floatingList[this._floatingList.length-1];
      }
      if (!frame) {
        this._addDockWidgetAlone(widget, location);
        return;
      }
      frame.addWidget(widget);
      return;
    }

    var needsHorizontal = location !== wcDocker.DOCK_BOTTOM;

    function __iterateParents(item) {
      // The last item will always be the center.
      if (item === this._center) {
        this._addDockWidgetAlone(widget, location);
        return;
      }

      // Iterate through splitters. one side will always be another
      // frame, while the other will be either the center or another
      // splitter.
      if (item instanceof wcSplitter) {
        var left = item.pane(0);
        var right = item.pane(1);

        // Check if the orientation of the splitter is one that we want.
        if (item.isHorizontal() === needsHorizontal) {
          // Make sure the dock widget is on the proper side.
          if (left instanceof wcFrameWidget && location === wcDocker.DOCK_LEFT) {
            left.addWidget(widget);
            return;
          } else if (right instanceof wcFrameWidget && (location === wcDocker.DOCK_RIGHT || location === wcDocker.DOCK_BOTTOM)) {
            right.addWidget(widget);
            return;
          }

          // This splitter was not valid, continue iterating through parents.
        }

        // If it isn't, iterate to which ever pane is not a dock widget.
        if (!(left instanceof wcFrameWidget)) {
          __iterateParents.call(this, left);
        } else {
          __iterateParents.call(this, right);
        }
      }
    };

    __iterateParents.call(this, this._root);
  },

  // Registers a new dock widget type to be used later.
  // Params:
  //    name          The name for this new type.
  //    createFunc    The function that populates the contents of
  //                  a newly created dock widget of this type.
  //                  Params:
  //                    widget      The dock widget to populate.
  // Returns:
  //    true        The new type has been added successfully.
  //    false       Failure, the type name already exists.
  registerDockWidgetType: function(name, createFunc) {
    for (var i = 0; i < this._dockWidgetTypeList.length; ++i) {
      if (this._dockWidgetTypeList[i].name === name) {
        return false;
      }
    }

    this._dockWidgetTypeList.push({
      name: name,
      create: createFunc,
    });
    return true;
  },

  // Moves a widget from its current location to another.
  // Params:
  //    typeName      The type of widget to create.
  //    location      The location to 'try' docking at, as defined by
  //                  wcGLOBALS.DOCK_LOC enum.
  //    allowGroup    True to allow this widget to be tab groupped with
  //                  another already existing widget at that location.
  //                  If, for any reason, the widget can not fit at the
  //                  desired location, a floating window will be used.
  //    parentWidget  An optional widget to 'split', if not supplied the
  //                  new widget will split the center window.
  // Returns:
  //    widget        The widget that was created.
  //    false         The widget type does not exist.
  moveDockWidget: function(widget, location, allowGroup, parentWidget) {
    this.removeDockWidget(widget);

    if (allowGroup) {
      this._addDockWidgetGrouped(widget, location, parentWidget);
    } else {
      this._addDockWidgetAlone(widget, location, parentWidget);
    }

    this.update();
    return widget;
  },

  // Add a new dock widget to the window of a given type.
  // Params:
  //    typeName      The type of widget to create.
  //    location      The location to 'try' docking at, as defined by
  //                  wcGLOBALS.DOCK_LOC enum.
  //    allowGroup    True to allow this widget to be tab groupped with
  //                  another already existing widget at that location.
  //                  If, for any reason, the widget can not fit at the
  //                  desired location, a floating window will be used.
  //    parentWidget  An optional widget to 'split', if not supplied the
  //                  new widget will split the center window.
  // Returns:
  //    widget        The widget that was created.
  //    false         The widget type does not exist.
  addDockWidget: function(typeName, location, allowGroup, parentWidget) {
    for (var i = 0; i < this._dockWidgetTypeList.length; ++i) {
      if (this._dockWidgetTypeList[i].name === typeName) {
        var widget = new wcDockWidget(typeName);
        this._dockWidgetTypeList[i].create(widget);
        if (allowGroup) {
          this._addDockWidgetGrouped(widget, location, parentWidget);
        } else {
          this._addDockWidgetAlone(widget, location, parentWidget);
        }
        this.update();
        return widget;
      }
    }

    return false;
  },

  // Removes a dock widget from the window.
  // Params:
  //    widget        The widget to remove.
  // Returns:
  //    true          The widget was removed.
  //    false         There was a problem.
  removeDockWidget: function(widget) {
    if (!widget) {
      return false;
    }

    var parentFrame = widget.parent();
    if (parentFrame instanceof wcFrameWidget) {
      var parentSplitter = parentFrame.parent();
      if (parentSplitter instanceof wcSplitter) {
        var left  = parentSplitter.pane(0);
        var right = parentSplitter.pane(1);
        var other;
        if (left === parentFrame) {
          other = right;
        } else {
          other = left;
        }

        var index = this._frameList.indexOf(parentFrame);
        if (index !== -1) {
          this._frameList.splice(index, 1);
        }

        index = this._splitterList.indexOf(parentSplitter);
        if (index !== -1) {
          this._splitterList.splice(index, 1);
        }

        parent = parentSplitter.parent();
        parentContainer = parentSplitter.container();
        parentSplitter.destroy();
        parentFrame.destroy();

        if (parent instanceof wcSplitter) {
          parent.removeChild(parentSplitter);
          if (!parent.pane(0)) {
            parent.pane(0, other);
          } else if (!parent.pane(1)) {
            parent.pane(1, other);
          }
        } else if (parent === this) {
          this._root = other;
          other.parent(this);
          other.container(parentContainer);
        }
        this.update();
        return true;
      } else if (parentSplitter === this) {
        for (var i = 0; i < this._floatingList.length; ++i) {
          if (this._floatingList[i] === parentFrame) {
            this._floatingList.splice(i, 1);
          }
        }

        var index = this._frameList.indexOf(parentFrame);
        if (index !== -1) {
          this._frameList.splice(index, 1);
        }

        parentFrame.destroy();
      }
    }
    return false;
  },

  // Updates the sizing of all widgets inside this window.
  update: function() {
    if (this._root) {
      this._root.update();
    }

    for (var i = 0; i < this._floatingList.length; ++i) {
      this._floatingList[i].update();
    }
  },

  // Retreives the center layout for the window.
  center: function() {
    return this._center;
  },
};
