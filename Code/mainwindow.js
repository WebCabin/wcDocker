/*
  The main window instance.  This manages all of the dock windows and user input.
  There should only be one instance of this used, although it is not required.
  The $parent is a JQuery object of the container element.
*/
function wcMainWindow($container) {
  this.$container = $container.addClass('wcMainWindow');
  $container.css('width', '100%');
  $container.css('height', '100%');

  this._root = null;
  this._center = null;
  this._floatingList = [];

  this._frameList = [];
  this._splitterList = [];

  this._dockWidgetTypeList = [];

  this._draggingSplitter = false;

  this._init();
};

wcMainWindow.prototype = {
  _init: function() {
    this._center = new wcLayout(this.$container, this);
    this._root = this._center;


    var self = this;
    $(window).resize(self._resize.bind(self));

    $('body').on('click', '.wcFrameClose', function() {
      var frame;
      for (var i = 0; i < self._frameList.length; ++i) {
        if (self._frameList[i].$close[0] == this) {
          frame = self._frameList[i];
          break;
        }
      }
      if (frame) {
        self.removeDockWidget(frame.widget());
        self.update();
      }
    });

    $('body').on('mousedown', '.wcSplitterBar', function(event) {
      var offset = self._mouseOffset(event);
      for (var i = 0; i < self._splitterList.length; ++i) {
        if (self._splitterList[i].$bar[0] === this) {
          self._draggingSplitter = self._splitterList[i];
          break;
        }
      }
    });

    $('body').on('mousemove', function(event) {
      if (self._draggingSplitter) {
        var mouse = {
          x: event.clientX,
          y: event.clientY,
        };
        var offset = self.$container.offset();
        self._draggingSplitter.moveBar(mouse);
        self.update();
      }
    });

    $('body').on('mouseout', function(event) {
      if (event.target === self.$container[0]) {
        self._draggingSplitter = false;
      }
    });

    $('body').on('mouseup', function(event) {
      self._draggingSplitter = false;
    });
  },

  // On window resized event.
  _resize: function(event) {
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
            splitter = new wcSplitter(null, parentSplitter, location !== wcGLOBALS.DOCK_LOC.BOTTOM);
            parentSplitter.pane(0, splitter);
          } else {
            splitter = new wcSplitter(null, parentSplitter, location !== wcGLOBALS.DOCK_LOC.BOTTOM);
            parentSplitter.pane(1, splitter);
          }

          if (splitter) {
            this._splitterList.push(splitter);
            frame = new wcFrameWidget(null, splitter, false);
            this._frameList.push(frame);
            if (location === wcGLOBALS.DOCK_LOC.LEFT) {
              splitter.pane(0, frame);
              splitter.pane(1, parentFrame);
              splitter.pos(0.6);
            } else {
              splitter.pane(0, parentFrame);
              splitter.pane(1, frame);
              splitter.pos(0.4);
            }

            frame.addWidget(widget);
          }
          return;
        }
      }
    }

    // Floating windows need no placement.
    if (location === wcGLOBALS.DOCK_LOC.FLOAT) {
      var frame = new wcFrameWidget(this.$container, this, true);
      this._frameList.push(frame);
      this._floatingList.push(frame);
      frame.addWidget(widget);
      return;
    }

    var splitter;
    if (this._center === this._root) {
      // The center is the root when no dock widgets have been docked yet.
      splitter = new wcSplitter(this.$container, this, location !== wcGLOBALS.DOCK_LOC.BOTTOM);
      this._root = splitter;
    } else {
      // The parent of the center should be a splitter, we need to insert another one in between.
      var parent = this._center.parent();
      if (parent instanceof wcSplitter) {
        var left  = parent.pane(0);
        var right = parent.pane(1);
        if (left === this._center) {
          splitter = new wcSplitter(null, parent, location !== wcGLOBALS.DOCK_LOC.BOTTOM);
          parent.pane(0, splitter);
        } else {
          splitter = new wcSplitter(null, parent, location !== wcGLOBALS.DOCK_LOC.BOTTOM);
          parent.pane(1, splitter);
        }
      }
    }

    if (splitter) {
      this._splitterList.push(splitter);
      var frame = new wcFrameWidget(null, splitter, false);
      this._frameList.push(frame);

      if (location === wcGLOBALS.DOCK_LOC.LEFT) {
        splitter.pane(0, frame);
        splitter.pane(1, this._center);
      } else {
        splitter.pane(0, this._center);
        splitter.pane(1, frame);
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
    if (location === wcGLOBALS.DOCK_LOC.FLOAT) {
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

    var needsHorizontal = location !== wcGLOBALS.DOCK_LOC.BOTTOM;

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
          if (left instanceof wcFrameWidget && location === wcGLOBALS.DOCK_LOC.LEFT) {
            left.addWidget(widget);
            return;
          } else if (right instanceof wcFrameWidget && (location === wcGLOBALS.DOCK_LOC.RIGHT || location === wcGLOBALS.DOCK_LOC.BOTTOM)) {
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

  moveDockWidget: function(widget, location, allowGroup, parentWidget) {

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
