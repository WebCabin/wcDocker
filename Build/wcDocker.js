/*!
 * Web Cabin Docker - Docking Layout Interface.
 *
 * Dependancies:
 *  JQuery 2.1.1
 *
 * Version: git-master
 *
 * Author: Jeff Houde (Lochemage@gmail.com)
 * Web: http://docker.webcabin.org/
 *
 * Licensed under
 *   MIT License http://www.opensource.org/licenses/mit-license
 *   GPL v3 http://opensource.org/licenses/GPL-3.0
 *
 */


/*
  The main window instance.  This manages all of the docking panels and user input.
  There should only be one instance of this, although it is not required.
  The $parent is a JQuery object of the container element.
*/
function wcDocker(container) {
  this.$container = $(container).addClass('wcDocker');
  this.$transition = $('<div class="wcDockerTransition"></div>');
  this.$container.append(this.$transition);

  this._root = null;
  this._center = null;
  this._floatingList = [];

  this._frameList = [];
  this._splitterList = [];

  this._dockPanelTypeList = [];

  this._draggingSplitter = false;
  this._draggingFrame = false;
  this._draggingFrameSizer = false;
  this._draggingFrameTab = false;
  this._ghost = false;

  this._init();
};

wcDocker.DOCK_FLOAT  = 'float';
wcDocker.DOCK_TOP    = 'top';
wcDocker.DOCK_LEFT   = 'left';
wcDocker.DOCK_RIGHT  = 'right';
wcDocker.DOCK_BOTTOM = 'bottom';

wcDocker.EVENT_CLOSED   = 'closed';
wcDocker.EVENT_ATTACHED = 'attached';
wcDocker.EVENT_DETACHED = 'detached';
wcDocker.EVENT_MOVED    = 'moved';
wcDocker.EVENT_RESIZED  = 'resized';

wcDocker.prototype = {
  _init: function() {
    var panel = new wcPanel('');
    panel.closeable(false);
    panel.layout().$elem.addClass('wcCenter');
    panel.size(-1, -1);
    this._center = new wcFrame(this.$container, panel, false, true);
    this._center.$frame.addClass('wcCenter');
    this._center.addPanel(panel);
    this._root = this._center;

    var self = this;
    $(window).resize(self._resize.bind(self));
    
    // Setup our context menus.
    $.contextMenu({
      selector: '.wcFrame',
      build: function($trigger, event) {
        var myFrame;
        for (var i = 0; i < self._frameList.length; ++i) {
          if (self._frameList[i].$frame[0] === $trigger[0]) {
            myFrame = self._frameList[i];
            break;
          }
        }
        if (!myFrame) {
          if (self._center.$frame[0] === $trigger[0]) {
            myFrame = self._center;
          }
        }

        var mouse = {
          x: event.clientX,
          y: event.clientY,
        };
        var isTitle = false;
        if (mouse.y - myFrame.$frame.offset().top <= 20) {
          isTitle = true;
        }

        var windowTypes = {};
        for (var i = 0; i < self._dockPanelTypeList.length; ++i) {
          var type = self._dockPanelTypeList[i];
          if (!type.isPrivate) {
            windowTypes[type.name] = {
              name: type.name,
              className: 'wcMenuCreatePanel',
            };
          }
        }

        var items = {};
        if (isTitle) {
          items['Close Panel'] = {
            name: 'Close Tab',
            disabled: !myFrame.panel().closeable(),
          };
          if (!myFrame._isFloating) {
            items['Detach Panel'] = {
              name: 'Detach Tab',
              disabled: (!myFrame.panel().moveable() || myFrame === self._center),
            };
          }

          items['sep1'] = "---------";
  
          items.fold1 = {
            name: 'Add Tab',
            items: windowTypes,
            disabled: !(!myFrame._isFloating && myFrame.panel().moveable()),
            className: 'wcMenuCreatePanel',
          };
          items['sep2'] = "---------";

          items['Flash Panel'] = {name: 'Flash Tab'};
        } else {
          items['Close Panel'] = {
            name: 'Close Panel',
            disabled: !myFrame.panel().closeable(),
          };
          if (!myFrame._isFloating) {
            items['Detach Panel'] = {
              name: 'Detach Panel',
              disabled: (!myFrame.panel().moveable() || myFrame === self._center),
            };
          }

          items['sep1'] = "---------";

          items.fold1 = {
            name: 'Insert Panel',
            items: windowTypes,
            disabled: !(!myFrame._isFloating && myFrame.panel().moveable()),
            className: 'wcMenuCreatePanel',
          };
          items['sep2'] = "---------";

          items['Flash Panel'] = {name: 'Flash Panel'};
        }

        if (!myFrame._isFloating && myFrame.panel().moveable()) {
          var rect = myFrame.rect();
          self._ghost = new wcGhost(rect, mouse);
          self._ghost.$ghost.hide();
          myFrame.checkAnchorDrop(mouse, false, self._ghost, true);
        }

        return {
          callback: function(key, options) {
            if (key === 'Close Panel') {
              setTimeout(function() {
                myFrame.panel().close();
              }, 10);
            } else if (key === 'Detach Panel') {
              self.movePanel(myFrame.panel(), wcDocker.DOCK_FLOAT, false);
            } else if (key === 'Flash Panel') {
              self._focus(myFrame, true);
            } else {
              if (myFrame && self._ghost) {
                var anchor = self._ghost.anchor();
                self.addPanel(key, anchor.loc, anchor.merge, myFrame.panel());
              }
            }
          },
          events: {
            show: function(opt) {
            },
            hide: function(opt) {
              if (self._ghost) {
                self._ghost.destroy();
                self._ghost = false;
              }
            },
          },
          animation: {duration: 250, show: 'fadeIn', hide: 'fadeOut'},
          reposition: false,
          autoHide: true,
          zIndex: 200,
          items: items,
        };
      },
    });

    var contextTimer;
    $('body').on('contextmenu', 'a, img', function() {
      if (contextTimer) {
        clearTimeout(contextTimer);
      }

      $(".wcFrame").contextMenu(false);
      contextTimer = setTimeout(function() {
        $(".wcFrame").contextMenu(true);
        contextTimer = null;
      }, 100);
      return true;
    });

    $('body').on('contextmenu', '.wcSplitterBar', function() {
      return false;
    });
    
    // Hovering over a panel creation context menu.
    $('body').on('mouseenter', '.wcMenuCreatePanel', function() {
      if (self._ghost) {
        self._ghost.$ghost.stop().fadeIn(200);
      }
    });

    $('body').on('mouseleave', '.wcMenuCreatePanel', function() {
      if (self._ghost) {
        self._ghost.$ghost.stop().fadeOut(200);
      }
    });

    // On some browsers, clicking and dragging a tab will drag it's graphic around.
    // Here I am disabling this as it interferes with my own drag-drop.
    $('body').on('mousedown', '.wcPanelTab li a', function(event) {
      event.preventDefault();
      event.returnValue = false;
    });

    // Close button on frames should destroy those panels.
    $('body').on('click', '.wcFrameCloseButton', function() {
      var frame;
      for (var i = 0; i < self._frameList.length; ++i) {
        if (self._frameList[i].$close[0] == this) {
          frame = self._frameList[i];
          break;
        }
      }
      if (frame) {
        var panel = frame.panel();
        self.removePanel(panel);
        self._update();
      }
    });

    // Mouse down on a splitter bar will allow you to resize them.
    $('body').on('mousedown', '.wcSplitterBar', function(event) {
      if (event.which === 3) {
        return true;
      }

      self.$container.addClass('wcDisableSelection');
      for (var i = 0; i < self._splitterList.length; ++i) {
        if (self._splitterList[i].$bar[0] === this) {
          self._draggingSplitter = self._splitterList[i];
          break;
        }
      }
      return true;
    });

    // Mouse down on a frame title will allow you to move them.
    $('body').on('mousedown', '.wcFrameTitle', function(event) {
      if (event.which === 3) {
        return true;
      }
      self.$container.addClass('wcDisableSelection');
      for (var i = 0; i < self._frameList.length; ++i) {
        if (self._frameList[i].$title[0] == this) {
          self._draggingFrame = self._frameList[i];

          var mouse = {
            x: event.clientX,
            y: event.clientY,
          };
          self._draggingFrame.anchorMove(mouse);

          if ($(event.target).hasClass('wcPanelTab')) {
            self._draggingFrameTab = event.target;
          }

          // If the window is able to be docked, give it a dark shadow tint and
          // begin the movement process
          if (!self._draggingFrame._isFloating || event.which !== 1 || self._draggingFrameTab) {
            var rect = self._draggingFrame.rect();
            self._ghost = new wcGhost(rect, mouse);
            self._draggingFrame.checkAnchorDrop(mouse, true, self._ghost, true);
            // self._draggingFrame.shadow(true);

            // Also fade out all floating windows as they are not dockable.
            // for (var a = 0; a < self._frameList.length; ++a) {
            //   if (self._frameList[a]._isFloating) {
            //     self._frameList[a].shadow(true);
            //   }
            // }
          }
          break;
        }
      }
      if (self._draggingFrame) {
        self._focus(self._draggingFrame);
      }
      return true;
    });

    // Mouse down on a panel will put it into focus.
    $('body').on('mousedown', '.wcLayout', function(event) {
      if (event.which === 3) {
        return true;
      }
      for (var i = 0; i < self._frameList.length; ++i) {
        if (self._frameList[i].$center[0] == this) {
          self._focus(self._frameList[i]);
          break;
        }
      }
      return true;
    });

    // Floating frames have resizable edges.
    $('body').on('mousedown', '.wcFrameEdge', function(event) {
      if (event.which === 3) {
        return true;
      }
      self.$container.addClass('wcDisableSelection');
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
        self._focus(self._draggingFrame);
      }
      return true;
    });

    // Mouse move will allow you to move an object that is being dragged.
    $('body').on('mousemove', function(event) {
      if (event.which === 3) {
        return true;
      }
      if (self._draggingSplitter) {
        var mouse = {
          x: event.clientX,
          y: event.clientY,
        };
        self._draggingSplitter.moveBar(mouse);
        self._draggingSplitter._update();
      } else if (self._draggingFrameSizer) {
        var mouse = {
          x: event.clientX,
          y: event.clientY,
        };

        var offset = self.$container.offset();
        mouse.x += offset.left;
        mouse.y += offset.top;

        self._draggingFrame.resize(self._draggingFrameSizer, mouse);
        self._draggingFrame._update();
      } else if (self._draggingFrame) {
        var mouse = {
          x: event.clientX,
          y: event.clientY,
        };

        if (self._ghost) {
          self._ghost.move(mouse);

          var forceFloat = !(self._draggingFrame._isFloating || event.which === 1);
          var found = false;

          // Check anchoring with self.
          if (!self._draggingFrame.checkAnchorDrop(mouse, true, self._ghost, self._draggingFrame._panelList.length > 1 && self._draggingFrameTab)) {
            self._draggingFrame.shadow(true);
            if (!forceFloat) {
              for (var i = 0; i < self._frameList.length; ++i) {
                if (self._frameList[i] !== self._draggingFrame) {
                  if (self._frameList[i].checkAnchorDrop(mouse, false, self._ghost, true)) {
                    // self._draggingFrame.shadow(true);
                    return;
                  }
                }
              }

              if (self._center.checkAnchorDrop(mouse, false, self._ghost, true)) {
                // self._draggingFrame.shadow(true);
                return;
              }
            }

            self._ghost.anchor(mouse, null);
          } else {
            self._draggingFrame.shadow(false);
            if (self._draggingFrameTab && $(event.target).hasClass('wcPanelTab') &&
                self._draggingFrameTab !== event.target) {
              self._draggingFrameTab = self._draggingFrame.tabMove(parseInt($(self._draggingFrameTab).attr('id')), parseInt($(event.target).attr('id')));
            }
          }
        } else if (!self._draggingFrameTab) {
          self._draggingFrame.move(mouse);
          self._draggingFrame._update();
        }
      }
      return true;
    });

    // Mouse released
    $('body').on('mouseup', function(event) {
      if (event.which === 3) {
        return true;
      }
      self.$container.removeClass('wcDisableSelection');
      if (self._draggingFrame) {
        for (var i = 0; i < self._frameList.length; ++i) {
          self._frameList[i].shadow(false);
        }
      }

      if (self._ghost && self._draggingFrame) {
        var anchor = self._ghost.anchor();

        if (!anchor) {
          var index = self._draggingFrame._curTab;
          if (!self._draggingFrameTab) {
            self._draggingFrame.panel(0);
          }
          var panel = self.movePanel(self._draggingFrame.panel(), wcDocker.DOCK_FLOAT, false);
          var mouse = {
            x: event.clientX,
            y: event.clientY,
          };
          // Dragging the entire frame.
          if (!self._draggingFrameTab) {
            while (self._draggingFrame.panel())
            self.movePanel(self._draggingFrame.panel(), wcDocker.DOCK_BOTTOM, true, panel);
          }

          var frame = panel.parent();
          if (frame instanceof wcFrame) {
            frame.pos(mouse.x, mouse.y + self._ghost.rect().h/2 - 10, true);
            frame.panel(index);
          }

          // frame._pos.x -= self._ghost.rect().x
          // frame._pos.y -= self._ghost.rect().y
          frame._size.x = self._ghost.rect().w;
          frame._size.y = self._ghost.rect().h;

          frame._update();
        } else if (!anchor.self) {
          var index = self._draggingFrame._curTab;
          if (!self._draggingFrameTab) {
            self._draggingFrame.panel(0);
          }
          var panel;
          if (anchor.item) {
            panel = anchor.item.parent();
          }
          // If we are dragging a tab to split its own container, find another
          // tab item within the same frame and split from there.
          if (panel === self._draggingFrame.panel()) {
            for (var i = 0; i < self._draggingFrame._panelList.length; ++i) {
              if (panel !== self._draggingFrame._panelList[i]) {
                panel = self._draggingFrame._panelList[i];
                index--;
                break;
              }
            }
          }
          var frame = panel.parent();
          if (frame instanceof wcFrame) {
            index = index + frame._panelList.length;
          }
          panel = self.movePanel(self._draggingFrame.panel(), anchor.loc, anchor.merge, panel);
          // Dragging the entire frame.
          if (!self._draggingFrameTab) {
            while (self._draggingFrame.panel())
            self.movePanel(self._draggingFrame.panel(), wcDocker.DOCK_BOTTOM, true, panel);
          }

          var frame = panel.parent();
          if (frame instanceof wcFrame) {
            frame.panel(index);
          }
        }
        self._ghost.destroy();
        self._ghost = false;
      }

      self._draggingSplitter = false;
      self._draggingFrame = false;
      self._draggingFrameSizer = false;
      self._draggingFrameTab = false;
      return true;
    });
  },

  // Updates the sizing of all panels inside this window.
  _update: function() {
    if (this._root) {
      this._root._update();
    }

    for (var i = 0; i < this._floatingList.length; ++i) {
      this._floatingList[i]._update();
    }
  },

  // On window resized event.
  _resize: function(event) {
    this._update();
  },

  // Brings a floating window to the top.
  // Params:
  //    frame     The frame to focus.
  //    flash     Whether to flash the frame.
  _focus: function(frame, flash) {
    if (frame._isFloating) {
      // frame.$frame.remove();
      var posList = [];
      for (var i = 0; i < frame._panelList.length; ++i) {
        posList.push(frame._panelList[i].scroll());
      }
      $('body').append(frame.$frame);
      for (var i = 0; i < posList.length; ++i) {
        frame._panelList[i].scroll(posList[i].x, posList[i].y);
      }
    }

    frame._focus(flash)
  },

  // For restore, creates the appropriate object type.
  _create: function(data, parent, $container) {
    switch (data.type) {
      case 'wcSplitter':
        var splitter = new wcSplitter($container, parent, data.horizontal);
        this._splitterList.push(splitter);
        return splitter;

      case 'wcFrame':
        var frame;
        if (!data.center) {
          frame = new wcFrame($container, parent, data.floating);
          this._frameList.push(frame);
          if (data.floating) {
            this._floatingList.push(frame);
          }
        } else {
          frame = this._center;
          frame.container($container);
          frame.parent(parent);
        }
        return frame;

      case 'wcPanel':
        var panel = new wcPanel(data.panelType);
        panel.container($container);
        panel.parent(parent);
        for (var i = 0; i < this._dockPanelTypeList.length; ++i) {
          if (this._dockPanelTypeList[i].name === data.panelType) {
            this._dockPanelTypeList[i].create(panel);
            break;
          }
        }
        return panel;
    }

    return null;
  },

  // Creates a new frame for the panel and then attaches it
  // to the window.
  // Params:
  //    panel         The panel to insert.
  //    location      The desired location for the panel.
  //    parentPanel  An optional panel to 'split', if not supplied the
  //                  new panel will split the center window.
  _addPanelAlone: function(panel, location, parentPanel) {
    // Floating windows need no placement.
    if (location === wcDocker.DOCK_FLOAT) {
      var frame = new wcFrame(this.$container, this, true);
      this._frameList.push(frame);
      this._floatingList.push(frame);
      frame.addPanel(panel);
      frame.pos(panel._pos.x, panel._pos.y, false);
      return;
    }

    if (parentPanel) {
      var parentFrame = parentPanel.parent();
      if (parentFrame instanceof wcFrame) {
        var parentSplitter = parentFrame.parent();
        if (parentSplitter instanceof wcSplitter) {
          var splitter;
          var left  = parentSplitter.pane(0);
          var right = parentSplitter.pane(1);
          if (left === parentFrame) {
            splitter = new wcSplitter(this.$transition, parentSplitter, location !== wcDocker.DOCK_BOTTOM && location !== wcDocker.DOCK_TOP);
            parentSplitter.pane(0, splitter);
          } else {
            splitter = new wcSplitter(this.$transition, parentSplitter, location !== wcDocker.DOCK_BOTTOM && location !== wcDocker.DOCK_TOP);
            parentSplitter.pane(1, splitter);
          }

          if (splitter) {
            this._splitterList.push(splitter);
            frame = new wcFrame(this.$transition, splitter, false);
            this._frameList.push(frame);
            if (location === wcDocker.DOCK_LEFT || location === wcDocker.DOCK_TOP) {
              splitter.pane(0, frame);
              splitter.pane(1, parentFrame);
              splitter.pos(0.4);
            } else {
              splitter.pane(0, parentFrame);
              splitter.pane(1, frame);
              splitter.pos(0.6);
            }

            frame.addPanel(panel);
          }
          return;
        }
      }
    }

    var splitter;
    if (this._center === this._root) {
      // The center is the root when no dock panels have been docked yet.
      splitter = new wcSplitter(this.$container, this, location !== wcDocker.DOCK_BOTTOM && location !== wcDocker.DOCK_TOP);
      this._root = splitter;
    } else {
      // The parent of the center should be a splitter, we need to insert another one in between.
      var parent = this._center.parent();
      if (parent instanceof wcSplitter) {
        var left  = parent.pane(0);
        var right = parent.pane(1);
        if (left === this._center) {
          splitter = new wcSplitter(this.$transition, parent, location !== wcDocker.DOCK_BOTTOM && location !== wcDocker.DOCK_TOP);
          parent.pane(0, splitter);
        } else {
          splitter = new wcSplitter(this.$transition, parent, location !== wcDocker.DOCK_BOTTOM && location !== wcDocker.DOCK_TOP);
          parent.pane(1, splitter);
        }
      }
    }

    if (splitter) {
      this._splitterList.push(splitter);
      var frame = new wcFrame(this.$transition, splitter, false);
      this._frameList.push(frame);

      if (location === wcDocker.DOCK_LEFT || location === wcDocker.DOCK_TOP) {
        splitter.pane(0, frame);
        splitter.pane(1, this._center);
        splitter.findBestPos();
      } else {
        splitter.pane(0, this._center);
        splitter.pane(1, frame);
        splitter.findBestPos();
      }

      frame.addPanel(panel);
    }
  },

  // Attempts to insert a given dock panel into an already existing frame.
  // If insertion is not possible for any reason, the panel will be
  // placed in its own frame instead.
  // Params:
  //    panel         The panel to insert.
  //    location      The desired location for the panel.
  //    parentPanel   An optional panel to 'split', if not supplied the
  //                  new panel will split the center window.
  _addPanelGrouped: function(panel, location, parentPanel) {
    if (parentPanel) {
      var frame = parentPanel.parent();
      if (frame instanceof wcFrame) {
        frame.addPanel(panel);
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
        this._addPanelAlone(panel, location);
        return;
      }
      frame.addPanel(panel);
      return;
    }

    var needsHorizontal = location !== wcDocker.DOCK_BOTTOM;

    function __iterateParents(item) {
      // The last item will always be the center.
      if (item === this._center) {
        this._addPanelAlone(panel, location);
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
          // Make sure the dock panel is on the proper side.
          if (left instanceof wcFrame && (location === wcDocker.DOCK_LEFT || location === wcDocker.DOCK_TOP)) {
            left.addPanel(panel);
            return;
          } else if (right instanceof wcFrame && (location === wcDocker.DOCK_RIGHT || location === wcDocker.DOCK_BOTTOM)) {
            right.addPanel(panel);
            return;
          }

          // This splitter was not valid, continue iterating through parents.
        }

        // If it isn't, iterate to which ever pane is not a dock panel.
        if (!(left instanceof wcFrame)) {
          __iterateParents.call(this, left);
        } else {
          __iterateParents.call(this, right);
        }
      }
    };

    __iterateParents.call(this, this._root);
  },

  // Registers a new docking panel type to be used later.
  // Params:
  //    name          The name for this new type.
  //    createFunc    The function that populates the contents of
  //                  a newly created dock panel of this type.
  //                  Params:
  //                    panel      The dock panel to populate.
  //    isPrivate     If true, this type will not appear to the user
  //                  as a window type to create.
  // Returns:
  //    true        The new type has been added successfully.
  //    false       Failure, the type name already exists.
  registerPanelType: function(name, createFunc, isPrivate) {
    for (var i = 0; i < this._dockPanelTypeList.length; ++i) {
      if (this._dockPanelTypeList[i].name === name) {
        return false;
      }
    }

    this._dockPanelTypeList.push({
      name: name,
      create: createFunc,
      isPrivate: isPrivate,
    });

    var $menu = $('menu').find('menu');
    $menu.append($('<menuitem label="' + name + '">'));
    return true;
  },

  // Add a new dock panel to the window of a given type.
  // Params:
  //    typeName      The type of panel to create.
  //    location      The location to 'try' docking at, as defined by
  //                  wcGLOBALS.DOCK_LOC enum.
  //    allowGroup    True to allow this panel to be tab grouped with
  //                  another already existing panel at that location.
  //                  If, for any reason, the panel can not fit at the
  //                  desired location, a floating window will be used.
  //    parentPanel   An optional panel to 'split', if not supplied the
  //                  new panel will split the central panel.
  // Returns:
  //    wcPanel       The panel that was created.
  //    false         The panel type does not exist.
  addPanel: function(typeName, location, allowGroup, parentPanel) {
    for (var i = 0; i < this._dockPanelTypeList.length; ++i) {
      if (this._dockPanelTypeList[i].name === typeName) {
        var panel = new wcPanel(typeName);
        panel.container(this.$transition);
        this._dockPanelTypeList[i].create(panel);

        if (allowGroup) {
          this._addPanelGrouped(panel, location, parentPanel);
        } else {
          this._addPanelAlone(panel, location, parentPanel);
        }
        this._update();
        return panel;
      }
    }
    return false;
  },

  // Removes a dock panel from the window.
  // Params:
  //    panel        The panel to remove.
  // Returns:
  //    true          The panel was removed.
  //    false         There was a problem.
  removePanel: function(panel) {
    if (!panel) {
      return false;
    }

    var parentFrame = panel.parent();
    if (parentFrame instanceof wcFrame) {
      // If no more panels remain in this frame, remove the frame.
      if (!parentFrame.removePanel(panel)) {
        var index = this._floatingList.indexOf(parentFrame);
        if (index !== -1) {
          this._floatingList.splice(index, 1);
        }
        index = this._frameList.indexOf(parentFrame);
        if (index !== -1) {
          this._frameList.splice(index, 1);
        }

        var parentSplitter = parentFrame.parent();
        if (parentSplitter instanceof wcSplitter) {
          parentSplitter.removeChild(parentFrame);

          var other;
          if (parentSplitter.pane(0)) {
            other = parentSplitter.pane(0);
            parentSplitter._pane[0] = null;
          } else {
            other = parentSplitter.pane(1);
            parentSplitter._pane[1] = null;
          }

          // Keep the panel in a hidden transition container so as to not
          // destroy any event handlers that may be on it.
          other.container(this.$transition);
          other.parent(null);

          index = this._splitterList.indexOf(parentSplitter);
          if (index !== -1) {
            this._splitterList.splice(index, 1);
          }

          parent = parentSplitter.parent();
          parentContainer = parentSplitter.container();
          parentSplitter.destroy();

          if (parent instanceof wcSplitter) {
            parent.removeChild(parentSplitter);
            if (!parent.pane(0)) {
              parent.pane(0, other);
            } else {
              parent.pane(1, other);
            }
          } else if (parent === this) {
            this._root = other;
            other.parent(this);
            other.container(parentContainer);
          }
          this._update();
        }
        parentFrame.destroy();
      }
      panel.destroy();
      return true;
    }
    return false;
  },

  // Moves a docking panel from its current location to another.
  // Params:
  //    panel         The panel to move.
  //    location      The location to 'try' docking at, as defined by
  //                  wcGLOBALS.DOCK_LOC enum.
  //    allowGroup    True to allow this panel to be tab groupped with
  //                  another already existing panel at that location.
  //                  If, for any reason, the panel can not fit at the
  //                  desired location, a floating window will be used.
  //    parentPanel  An optional panel to 'split', if not supplied the
  //                  new panel will split the center window.
  // Returns:
  //    wcPanel       The panel that was created.
  //    false         The panel type does not exist.
  movePanel: function(panel, location, allowGroup, parentPanel) {
    var $elem = panel.$container;
    if (panel.parent() instanceof wcFrame) {
      $elem = panel.parent().$frame;
    }
    var offset = $elem.offset();
    var width  = $elem.width();
    var height = $elem.height();

    var floating = false;
    if (panel.parent() instanceof wcFrame) {
      floating = panel.parent()._isFloating;
    }

    var parentFrame = panel.parent();
    if (parentFrame instanceof wcFrame) {

      // Remove the panel from the frame.
      for (var i = 0; i < parentFrame._panelList.length; ++i) {
        if (parentFrame._panelList[i] === panel) {
          if (parentFrame._curTab >= i) {
            parentFrame._curTab--;
          }

          // Keep the panel in a hidden transition container so as to not
          // destroy any event handlers that may be on it.
          panel.container(this.$transition);
          panel.parent(null);

          parentFrame._panelList.splice(i, 1);
          break;
        }
      }

      if (parentFrame._curTab === -1 && parentFrame._panelList.length) {
        parentFrame._curTab = 0;
      }

      parentFrame._updateTabs();
      
      // If no more panels remain in this frame, remove the frame.
      if (parentFrame._panelList.length === 0) {
        var index = this._floatingList.indexOf(parentFrame);
        if (index !== -1) {
          this._floatingList.splice(index, 1);
        }
        index = this._frameList.indexOf(parentFrame);
        if (index !== -1) {
          this._frameList.splice(index, 1);
        }

        var parentSplitter = parentFrame.parent();
        if (parentSplitter instanceof wcSplitter) {
          parentSplitter.removeChild(parentFrame);

          var other;
          if (parentSplitter.pane(0)) {
            other = parentSplitter.pane(0);
            parentSplitter._pane[0] = null;
          } else {
            other = parentSplitter.pane(1);
            parentSplitter._pane[1] = null;
          }

          // Keep the item in a hidden transition container so as to not
          // destroy any event handlers that may be on it.
          other.container(this.$transition);
          other.parent(null);

          index = this._splitterList.indexOf(parentSplitter);
          if (index !== -1) {
            this._splitterList.splice(index, 1);
          }

          parent = parentSplitter.parent();
          parentContainer = parentSplitter.container();
          parentSplitter.destroy();

          if (parent instanceof wcSplitter) {
            parent.removeChild(parentSplitter);
            if (!parent.pane(0)) {
              parent.pane(0, other);
            } else {
              parent.pane(1, other);
            }
          } else if (parent === this) {
            this._root = other;
            other.parent(this);
            other.container(parentContainer);
          }
          this._update();
        }
        parentFrame.destroy();
      }
    }

    panel.size(width, height);
    if (allowGroup) {
      this._addPanelGrouped(panel, location, parentPanel);
    } else {
      this._addPanelAlone(panel, location, parentPanel);
    }

    var frame = panel.parent();
    if (frame instanceof wcFrame && frame.panel() === panel) {
      frame.pos(offset.left + width/2 + 20, offset.top + height/2 + 20, true);

      if (floating !== frame._isFloating) {
        if (frame._isFloating) {
          panel.trigger(wcDocker.EVENT_DETACHED);
        } else {
          panel.trigger(wcDocker.EVENT_ATTACHED);
        }
      }
    }

    panel.trigger(wcDocker.EVENT_MOVED);

    this._update();
    return panel;
  },

  // Finds all instances of a given panel type.
  // Params:
  //    typeName    The type of panel.
  // Returns:
  //    [wcPanel]   A list of all panels of the given type.
  findPanels: function(typeName) {
    var result = [];
    for (var i = 0; i < this._frameList.length; ++i) {
      var frame = this._frameList[i];
      for (var a = 0; a < frame._panelList.length; ++a) {
        var panel = frame._panelList[a];
        if (panel._title === typeName) {
          result.push(panel);
        }
      }
    }

    return result;
  },

  // Trigger an event on all panels.
  // Params:
  //    eventName   The name of the event.
  //    data        A custom data parameter to pass to all handlers.
  trigger: function(eventName, data) {
    for (var i = 0; i < this._frameList.length; ++i) {
      var frame = this._frameList[i];
      for (var a = 0; a < frame._panelList.length; ++a) {
        var panel = frame._panelList[a];
        panel._trigger(eventName, data);
      }
    }
  },

  // Retreives the center layout for the window.
  center: function() {
    return this._center.panel().layout();
  },

  // Saves the current panel configuration into a meta
  // object that can be used later to restore it.
  save: function() {
    var data = {};

    data.floating = [];
    for (var i = 0; i < this._floatingList.length; ++i) {
      data.floating.push(this._floatingList[i]._save());
    }

    data.root = this._root._save();
    return data;
  },

  // Restores a previously saved configuration.
  restore: function(data) {
    this.clear();

    this._root = this._create(data.root, this, this.$container);
    this._root._restore(data.root, this);

    for (var i = 0; i < data.floating.length; ++i) {
      var panel = this._create(data.floating[i], this, this.$container);
      panel._restore(data.floating[i], this);
    }

    this._update();
  },

  // Clears out all panels.
  clear: function() {
    this._root = this._center;

    var parent = this._center.parent();
    if (parent instanceof wcSplitter) {

      if (parent.pane(0) === this._center) {
        parent._pane[0] = null;
      } else {
        parent._pane[1] = null;
      }
    }

    this._center.container(this.$transition);
    this._center.parent(this);

    for (var i = 0; i < this._splitterList.length; ++i) {
      this._splitterList[i].destroy();
    }

    for (var i = 0; i < this._frameList.length; ++i) {
      this._frameList[i].destroy();
    }

    while (this._frameList.length) this._frameList.pop();
    while (this._floatingList.length) this._floatingList.pop();
    while (this._splitterList.length) this._splitterList.pop();
  },
};

/*
  A ghost object that follows the mouse around during dock movement.
*/
function wcGhost(rect, mouse) {
  this.$ghost = null;
  this._rect;
  this._anchorMouse = false;
  this._anchor = null;

  this._init(rect, mouse);
};

wcGhost.prototype = {
  _init: function(rect, mouse) {
    this.$ghost = $('<div class="wcGhost">')
      .css('opacity', 0)
      .css('top', rect.y + 'px')
      .css('left', rect.x + 'px')
      .css('width', rect.w + 'px')
      .css('height', rect.h + 'px');

    this._anchorMouse = {
      x: rect.x - mouse.x,
      y: rect.y - mouse.y,
    };

    this._rect = {
      x: -this._anchorMouse.x,
      y: -this._anchorMouse.y,
      w: rect.w,
      h: rect.h,
    };

    this.anchor(mouse, rect);

    $('body').append(this.$ghost);
  },

  // Gets the original size of the moving widget.
  rect: function() {
    return this._rect;
  },

  // Updates the size of the layout.
  move: function(mouse) {
    if (this._anchor) {
      return;
    }

    var x = parseInt(this.$ghost.css('left'));
    var y = parseInt(this.$ghost.css('top'));

    x = mouse.x + this._anchorMouse.x;
    y = mouse.y + this._anchorMouse.y;

    this.$ghost.css('left', x + 'px');
    this.$ghost.css('top',  y + 'px');
  },

  // Change the ghost's anchor.
  // Params:
  //    mouse     The current mouse position.
  //    rect      If supplied, will change to this size,
  //              otherwise will revert to default size.
  anchor: function(mouse, anchor) {
    if (typeof mouse === 'undefined') {
      return this._anchor;
    }

    if (anchor && this._anchor && anchor.loc === this._anchor.loc && anchor.item === this._anchor.item) {
      return;
    }

    var rect = {
      x: parseInt(this.$ghost.css('left')),
      y: parseInt(this.$ghost.css('top')),
      w: parseInt(this.$ghost.css('width')),
      h: parseInt(this.$ghost.css('height')),
    };

    this._anchorMouse = {
      x: rect.x - mouse.x,
      y: rect.y - mouse.y,
    };

    this._rect.x = -this._anchorMouse.x;
    this._rect.y = -this._anchorMouse.y;

    if (!anchor) {
      if (!this._anchor) {
        return;
      }

      this._anchor = null;
      this.$ghost.show();
      this.$ghost.stop().animate({
        opacity: 0.3,
        'margin-left': this._rect.x - this._rect.w/2 + 'px',
        'margin-top': this._rect.y - 10 + 'px',
        width: this._rect.w + 'px',
        height: this._rect.h + 'px',
      }, 200);
      return;
    }

    this._anchor = anchor;
    var opacity = 0.8;
    if (anchor.self && anchor.merge) {
      opacity = 0;
      this.$ghost.hide();
    } else {
      this.$ghost.show();
    }
    this.$ghost.stop().animate({
      opacity: opacity,
      'margin-left': '2px',
      'margin-top': '2px',
      border: '0px',
      left: anchor.x + 'px',
      top: anchor.y + 'px',
      width: anchor.w + 'px',
      height: anchor.h + 'px',
    }, 200);
  },

  destroy: function() {
    this.$ghost.stop().animate({
      opacity: 0.0,
    }, {
      duration: 250,
      complete: function() {
        $(this).remove();
      },
    });
  },
};
/*
  A layout item that organizes the contents of a dock widget.
*/
function wcLayout($container, parent) {
  this.$container = $container;
  this._parent = parent;

  this._grid = [];
  this.$elem = null;

  this._init();
};

wcLayout.prototype = {
  _init: function() {
    this.$elem = $('<table class="wcLayout wcWide wcTall"></table>');
    this.$elem.append($('<tbody></tbody>'));
    this.container(this.$container);
  },

  // Resizes the grid to fit a given position.
  // Params:
  //    width     The width to expand to.
  //    height    The height to expand to.
  _resizeGrid: function(width, height) {
    this.$elem.find('tbody').children().remove();

    for (var y = 0; y <= height; ++y) {
      if (this._grid.length <= y) {
        this._grid.push([]);
      }

      for (var x = 0; x <= width; ++x) {
        if (this._grid[y].length <= x) {
          this._grid[y].push({
            $el: $('<td>'),
            x: 0,
            y: 0,
          });
        }
      }
    }

    var $elem = this.$elem.find('tbody');
    for (var y = 0; y < this._grid.length; ++y) {
      var $row = null;

      for (var x = 0; x < this._grid[y].length; ++x) {
        var item = this._grid[y][x];
        if (item.$el) {
          if (!$row) {
            $row = $('<tr>');
            this.$elem.append($row);
          }

          $row.append(item.$el);
        }
      }
    }
  },

  // Merges cells in the layout.
  // Params:
  //    x, y      Cell position to begin merge.
  //    w, h      The width and height to merge.
  // Returns:
  //    true      Cells were merged succesfully.
  //    false     Merge failed, either because the grid position was out of bounds
  //              or some of the cells were already merged.
  _mergeGrid: function(x, y, w, h) {
    if (this._grid.length <= y || this._grid[y].length <= x) {
      return false;
    }

    // Make sure each cell to be merged is not already merged somewhere else.
    for (var yy = 0; yy < h; ++yy) {
      for (var xx = 0; xx < w; ++xx) {
        var item = this._grid[y + yy][x + xx];
        if (!item.$el || item.x !== 0 || item.y !== 0) {
          return false;
        }
      }
    }

    // Now merge the cells here.
    var item = this._grid[y][x];
    if (w > 1) {
      item.$el.attr('colspan', '' + w);
      item.x = w-1;
    }
    if (h > 1) {
      item.$el.attr('rowspan', '' + h);
      item.y = h-1;
    }

    for (var yy = 0; yy < h; ++yy) {
      for (var xx = 0; xx < w; ++xx) {
        if (yy !== 0 || xx !== 0) {
          var item = this._grid[y + yy][x + xx];
          item.$el.remove();
          item.$el = null;
          item.x = -xx;
          item.y = -yy;
        }
      }
    }
    return true;
  },

  // Updates the size of the layout.
  _update: function() {
  },

  // Adds an item into the layout, expanding the grid
  // size if necessary.
  // Params:
  //    item        The DOM element to add.
  //    x, y        The grid coordinates to place the item.
  //    w, h        If supplied, will stretch the item among
  //                multiple grid elements.
  // Returns:
  //    <td>        On success, returns the <td> dom element.
  //    false       A failure happened, most likely cells could not be merged.
  addItem: function(item, x, y, w, h) {
    if (typeof x === 'undefined' || x < 0) {
      x = 0;
    }
    if (typeof y === 'undefined' || y < 0) {
      y = 0;
    }
    if (typeof w === 'undefined' || w <= 0) {
      w = 1;
    }
    if (typeof h === 'undefined' || h <= 0) {
      h = 1;
    }

    this._resizeGrid(x + w - 1, y + h - 1);
    if (!this._mergeGrid(x, y, w, h)) {
      return false;
    }

    this._grid[y][x].$el.append($(item));
    return this._grid[y][x].$el;
  },

  // Removes an item from the layout
  removeItem: function(item, x, y) {
  },

  // Gets, or Sets the visible status of the layout grid.
  // Params:
  //    enabled     If supplied, will set the grid shown or hidden.
  // Returns:
  //    bool        The current visibility of the grid.
  showGrid: function(enabled) {
    if (typeof enabled === 'undefined') {
      return this.$elem.hasClass('wcLayoutGrid');
    }

    this.$elem.toggleClass('wcLayoutGrid', enabled);
    return this.$elem.hasClass('wcLayoutGrid');
  },

  // Clears the layout.
  clear: function() {
    var showGrid = this.showGrid();
    this._init();
    this.showGrid(showGrid);
    this._grid = [];
  },

  // Checks if the mouse is in a valid anchor position for nesting another widget.
  // Params:
  //    mouse     The current mouse position.
  //    same      Whether the moving frame and this one are the same.
  checkAnchorDrop: function(mouse, same, ghost, canSplit, $elem, title) {
    var width = $elem.width();
    var height = $elem.height();
    var offset = $elem.offset();
    var top = 21;
    if (!title) {
      top = 0;
    }

    if (same) {
      // Same tabs
      if (mouse.y >= offset.top && mouse.y <= offset.top + top &&
          mouse.x >= offset.left && mouse.x <= offset.left + width) {
        ghost.anchor(mouse, {
          x: offset.left,
          y: offset.top,
          w: width,
          h: top,
          merge: true,
          loc: wcDocker.DOCK_FLOAT,
          item: this,
          self: true,
        });
        return true;
      }
    }

    // Tab ordering or adding.
    if (title) {
      if (mouse.y >= offset.top && mouse.y <= offset.top + top &&
          mouse.x >= offset.left && mouse.x <= offset.left + width) {
        ghost.anchor(mouse, {
          x: offset.left,
          y: offset.top,
          w: width,
          h: top,
          merge: true,
          loc: wcDocker.DOCK_BOTTOM,
          item: this,
          self: false,
        });
        return true;
      }
    }

    if (!canSplit) {
      return false;
    }

    if (width < height) {
      // Top docking.
      if (mouse.y >= offset.top && mouse.y <= offset.top + height*0.25 &&
          mouse.x >= offset.left && mouse.x <= offset.left + width) {
        ghost.anchor(mouse, {
          x: offset.left,
          y: offset.top,
          w: width,
          h: height*0.4,
          loc: wcDocker.DOCK_TOP,
          item: this,
          self: false,
        });
        return true;
      }

      // Bottom side docking.
      if (mouse.y >= offset.top + height*0.75 && mouse.y <= offset.top + height &&
          mouse.x >= offset.left && mouse.x <= offset.left + width) {
        ghost.anchor(mouse, {
          x: offset.left,
          y: offset.top + (height - height*0.4),
          w: width,
          h: height*0.4,
          loc: wcDocker.DOCK_BOTTOM,
          item: this,
          self: false,
        });
        return true;
      }
    }

    // Left side docking
    if (mouse.y >= offset.top && mouse.y <= offset.top + height) {
      if (mouse.x >= offset.left && mouse.x <= offset.left + width*0.25) {
        ghost.anchor(mouse, {
          x: offset.left,
          y: offset.top,
          w: width*0.4,
          h: height,
          loc: wcDocker.DOCK_LEFT,
          item: this,
          self: false,
        });
        return true;
      }

      // Right side docking
      if (mouse.x >= offset.left + width*0.75 && mouse.x <= offset.left + width) {
        ghost.anchor(mouse, {
          x: offset.left + width*0.6,
          y: offset.top,
          w: width*0.4,
          h: height,
          loc: wcDocker.DOCK_RIGHT,
          item: this,
          self: false,
        });
        return true;
      }
    }

    if (width >= height) {
      // Top docking.
      if (mouse.y >= offset.top && mouse.y <= offset.top + height*0.25 &&
          mouse.x >= offset.left && mouse.x <= offset.left + width) {
        ghost.anchor(mouse, {
          x: offset.left,
          y: offset.top,
          w: width,
          h: height*0.4,
          loc: wcDocker.DOCK_TOP,
          item: this,
          self: false,
        });
        return true;
      }

      // Bottom side docking.
      if (mouse.y >= offset.top + height*0.75 && mouse.y <= offset.top + height &&
          mouse.x >= offset.left && mouse.x <= offset.left + width) {
        ghost.anchor(mouse, {
          x: offset.left,
          y: offset.top + (height - height*0.4),
          w: width,
          h: height*0.4,
          loc: wcDocker.DOCK_BOTTOM,
          item: this,
          self: false,
        });
        return true;
      }
    }
    return false;
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
      this.$container.append(this.$elem);
    } else {
      this.$elem.remove();
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

  // Destroys the layout.
  destroy: function() {
    this.container(null);
    this.parent(null);
    this.clear();

    this.$elem.remove();
    this.$elem = null;
  },
};
/*
  The docking panel item is a container for the panels layout and the public interface the panel.
*/
function wcPanel(title) {
  this.$container = null;
  this._parent = null;

  this._title = title;

  this._layout = null;

  this._actualPos = {
    x: 0.5,
    y: 0.5,
  };

  this._actualSize = {
    x: 0,
    y: 0,
  };

  this._pos = {
    x: 0.5,
    y: 0.5,
  };

  this._size = {
    x: 200,
    y: 200,
  };

  this._minSize = {
    x: 100,
    y: 100,
  };

  this._maxSize = {
    x: Infinity,
    y: Infinity,
  };

  this._scrollable = {
    x: true,
    y: true,
  };

  this._moveable = true;
  this._closeable = true;

  this._eventList = [];

  this._init();
};

wcPanel.prototype = {
  _init: function() {
    this._layout = new wcLayout(this.$container, this);
  },

  // Saves the current panel configuration into a meta
  // object that can be used later to restore it.
  _save: function() {
    var data = {};
    data.type = 'wcPanel';
    data.panelType = this._title;
    data.minSize = {
      x: this._minSize.x,
      y: this._minSize.y,
    };
    data.maxSize = {
      x: this._maxSize.x,
      y: this._maxSize.y,
    };
    data.scrollable = {
      x: this._scrollable.x,
      y: this._scrollable.y,
    };
    data.moveable = this._moveable;
    data.closeable = this._closeable;
    return data;
  },

  // Restores a previously saved configuration.
  _restore: function(data, docker) {
    this._minSize.x = data.minSize.x;
    this._minSize.y = data.minSize.y;
    this._maxSize.x = data.maxSize.x;
    this._maxSize.y = data.maxSize.y;
    this._scrollable.x = data.scrollable.x;
    this._scrollable.y = data.scrollable.y;
    this._moveable = data.moveable;
    this._closeable = data.closeable;
  },

  // Updates the size of the layout.
  _update: function() {
    this._layout._update();
    if (!this.$container) {
      return;
    }

    var width   = this.$container.width();
    var height  = this.$container.height();
    if (this._actualSize.x !== width || this._actualSize.y !== height) {
      this._actualSize.x = width;
      this._actualSize.y = height;
      this._trigger(wcDocker.EVENT_RESIZED);
    }

    var offset  = this.$container.offset();
    if (this._actualPos.x !== offset.left || this._actualPos.y !== offset.top) {
      this._actualPos.x = offset.left;
      this._actualPos.y = offset.top;
      this._trigger(wcDocker.EVENT_MOVED);
    }
  },

  // Triggers an event of a given type onto this current panel.
  // Params:
  //    eventType     The event to trigger.
  //    data          A custom data object to pass into all handlers.
  _trigger: function(eventType, data) {
    for (var i = 0; i < this._eventList.length; ++i) {
      if (this._eventList[i].name === eventType) {
        this._eventList[i].handler(this, data);
      }
    }
  },

  // Finds the main Docker window.
  docker: function() {
    var parent = this._parent;
    while (parent && !(parent instanceof wcDocker)) {
      parent = parent._parent;
    }
    return parent;
  },

  // Gets the title for this dock widget.
  title: function() {
    return this._title;
  },

  // Retrieves the main widget container for this dock widget.
  layout: function() {
    return this._layout;
  },

  // Brings this widget into focus.
  // Params:
  //    flash     Optional, if true will flash the window.
  focus: function(flash) {
    var docker = this.docker();
    if (docker) {
      docker._focus(this._parent, flash);
    }
  },

  // Gets, or Sets the default position of the widget if it is floating.
  // Params:
  //    x, y    If supplied, sets the position (percentage value from 0 to 1).
  pos: function(x, y) {
    if (typeof x === 'undefined') {
      return {x: this._pos.x, y: this._pos.y};
    }
    this._pos.x = x;
    this._pos.y = y;
  },

  // Gets, or Sets the desired size of the widget.
  size: function(x, y) {
    if (typeof x === 'undefined') {
      return {x: this._size.x, y: this._size.y};
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

  // Gets, or Sets the maximum size of the widget.
  maxSize: function(x, y) {
    if (typeof x === 'undefined') {
      return this._maxSize;
    }
    this._maxSize.x = x;
    this._maxSize.y = y;
  },

  // Gets, or Sets the scroll position of the window (if it is scrollable).
  // Params:
  //    x, y      If supplied, sets the scroll position of the window.
  // Returns:
  //    object    The scroll position of the window.
  scroll: function(x, y) {
    if (!this.$container) {
      return {x: 0, y: 0};
    }

    if (typeof x !== 'undefined') {
      this.$container.parent().scrollLeft(x);
      this.$container.parent().scrollTop(y);
    }

    return {
      x: this.$container.parent().scrollLeft(),
      y: this.$container.parent().scrollTop(),
    };
  },

  // Gets, or Sets whether the window is scrollable.
  // Params:
  //    x, y      If supplied, assigns whether the window is scrollable
  //              for each axis.
  // Returns:
  //    object    The current scrollable status.
  scrollable: function(x, y) {
    if (typeof x !== 'undefined') {
      this._scrollable.x = x? true: false;
      this._scrollable.y = y? true: false;
    }

    return {x: this._scrollable.x, y: this._scrollable.y};
  },

  // Sets, or Gets the moveable status of the window.
  moveable: function(enabled) {
    if (typeof enabled !== 'undefined') {
      this._moveable = enabled? true: false;
    }

    return this._moveable;
  },

  // Gets, or Sets whether this dock window can be closed.
  // Params:
  //    enabled     If supplied, toggles whether it can be closed.
  // Returns:
  //    bool        The current closeable status.
  closeable: function(enabled) {
    if (typeof enabled !== 'undefined') {
      this._closeable = enabled? true: false;
      if (this._parent) {
        this._parent._update();
      }
    }

    return this._closeable;
  },

  // Forces the window to close.
  close: function() {
    if (this._parent) {
      this._parent.$close.click();
    }
  },

  // Registers an event.
  // Params:
  //    eventType     The event type, as defined by wcDocker.EVENT_...
  //    handler       A handler function to be called for the event.
  //                  Params:
  //                    panel   The panel invoking the event.
  on: function(eventType, handler) {
    this._eventList.push({
      name: eventType,
      handler: handler,
    });
  },

  // Unregisters an event.
  // Params:
  //    eventType     The event type to remove, if omitted, all events are removed.
  //    handler       The handler function to remove, if omitted, all events of
  //                  the above type are removed.
  off: function(eventType, handler) {
    if (typeof eventType === 'undefined') {
      while (this._eventList.length) this._eventList.pop();
      return;
    } else {
      for (var i = 0; i < this._eventList.length; ++i) {
        if (this._eventList[i].name === eventType) {
          if (typeof handler === 'undefined' || this._eventList[i].handler === handler) {
            this._eventList.splice(i, 1);
            i--;
          }
        }
      }
    }
  },

  // Triggers an event of a given type to all panels.
  // Params:
  //    eventType     The event to trigger.
  //    data          A custom data object to pass into all handlers.
  trigger: function(eventType, data) {
    var docker = this.docker();
    if (docker) {
      docker.trigger(eventType, data);
    }
  },

  // Retrieves the bounding rect for this widget.
  rect: function() {
    var offset = this.$container.offset();
    var width = this.$container.width();
    var height = this.$container.height();

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

    this.$container = $container;
    
    if (this.$container) {
      this._layout.container(this.$container);
    } else {
      this._layout.container(null);
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

  // Destroys this panel.
  destroy: function() {
    this._trigger(wcDocker.EVENT_CLOSED);

    this.container(null);
    this.parent(null);
    this._layout.destroy();
    this._layout = null;
    this.off();
  },
};
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

  this.$shadower = null;

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

  // Saves the current panel configuration into a meta
  // object that can be used later to restore it.
  _save: function() {
    var data = {};
    data.type = 'wcFrame';
    data.floating = this._isFloating;
    data.center = this.$frame.hasClass('wcCenter');
    data.pos = {
      x: this._pos.x,
      y: this._pos.y,
    };
    data.size = {
      x: this._size.x,
      y: this._size.y,
    };
    data.tab = this._curTab;
    data.panels = [];
    if (!data.center) {
      for (var i = 0; i < this._panelList.length; ++i) {
        data.panels.push(this._panelList[i]._save());
      }
    }
    return data;
  },

  // Restores a previously saved configuration.
  _restore: function(data, docker) {
    this._isFloating = data.floating;
    this._pos.x = data.pos.x;
    this._pos.y = data.pos.y;
    this._size.x = data.size.x;
    this._size.y = data.size.y;
    this._curTab = data.tab;
    for (var i = 0; i < data.panels.length; ++i) {
      var panel = docker._create(data.panels[i], this, this.$center);
      panel._restore(data.panels[i], docker);
      this._panelList.push(panel);
    }

    this._updateTabs();
    this._update();
  },

  // Updates the size of the frame.
  _update: function() {
    var width = this.$container.width();
    var height = this.$container.height();

    // Floating windows manage their own sizing.
    if (this._isFloating) {
      var left = (this._pos.x * width) - this._size.x/2;
      var top = (this._pos.y * height) - this._size.y/2;

      if (top < 0) {
        top = 0;
      }

      if (left + this._size.x/2 < 0) {
        left = -this._size.x/2;
      }

      if (left + this._size.x/2 > width) {
        left = width - this._size.x/2;
      }

      if (top + 21 > height) {
        top = height - 21;
      }

      this.$frame.css('left', left + 'px');
      this.$frame.css('top', top + 'px');
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

    // Move all tabbed panels to a temporary element to preserve event handlers on them.
    var $tempCenter = $('<div>');
    this.$frame.append($tempCenter);
    this.$center.children().appendTo($tempCenter);

    var $tabList = $('<ul class="wcPanelTabBar">');
    this.$title.append($tabList);

    var self = this;
    for (var i = 0; i < this._panelList.length; ++i) {
      var $tab = $('<li><span id="' + i + '" class="wcPanelTab">' + this._panelList[i].title() + '</span></li>');
      $tabList.append($tab);

      var $tabContent = $('<div class="wcPanelTabContent" id="' + i + '">');
      this.$center.append($tabContent);
      this._panelList[i].container($tabContent);
      this._panelList[i].parent(this);

      if (this._curTab !== i) {
        $tabContent.addClass('wcPanelTabContentHidden');
      } else {
        $tab.find('span').addClass('wcPanelTabActive');
      }

      $tab.find('span').on('mousedown', function(event) {
        var index = parseInt($(this).attr('id'));
        self.panel(index);
      });
    }

    $tempCenter.remove();
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
        this.$title.find('span[id="' + this._curTab + '"]').removeClass('wcPanelTabActive');
        this.$center.find('.wcPanelTabContent[id="' + this._curTab + '"]').addClass('wcPanelTabContentHidden');
        this._curTab = tabIndex;
        this.$title.find('span[id="' + tabIndex + '"]').addClass('wcPanelTabActive');
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

  // Moves a tab from a given index to another index.
  // Params:
  //    fromIndex     The current tab index to move.
  //    toIndex       The new index to move to.
  // Returns:
  //    element       The new element of the moved tab.
  //    false         If an error occurred.
  tabMove: function(fromIndex, toIndex) {
    if (fromIndex >= 0 && fromIndex < this._panelList.length &&
        toIndex >= 0 && toIndex < this._panelList.length) {
      var panel = this._panelList.splice(fromIndex, 1);
      this._panelList.splice(toIndex, 0, panel[0]);

      // Preserve the currently active tab.
      if (this._curTab === fromIndex) {
        this._curTab = toIndex;
      }

      this._updateTabs();

      return this.$title.find('span[id="' + toIndex + '"]')[0];
    }
    return false;
  },

  // Checks if the mouse is in a valid anchor position for docking a panel.
  // Params:
  //    mouse     The current mouse position.
  //    same      Whether the moving frame and this one are the same.
  checkAnchorDrop: function(mouse, same, ghost, canSplit) {
    var panel = this.panel();
    if (panel && panel.moveable()) {
      return panel.layout().checkAnchorDrop(mouse, same, ghost, (!this._isFloating && canSplit), this.$frame, panel.moveable() && panel.title());
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
      if (!this.$shadower) {
        this.$shadower = $('<div class="wcFrameShadower">');
        this.$frame.append(this.$shadower);
        this.$shadower.animate({
          opacity: 0.5,
        }, 300);
      }
    } else {
      if (this.$shadower) {
        var self = this;
        this.$shadower.animate({
          opacity: 0.0,
        }, 300)
        .queue(function(next) {
          self.$shadower.remove();
          self.$shadower = null;
          next();
        });
      }
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

    this.$container = $container;
    if (this.$container) {
      this.$container.append(this.$frame);
    } else {
      this.$frame.remove();
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
      this._panelList[i].destroy();
    }

    while (this._panelList.length) this._panelList.pop();
    this.container(null);
    this.parent(null);
  },
};
/*
  Splits an area in two, dividing it with a resize splitter bar
*/
function wcSplitter($container, parent, isHorizontal) {
  this.$container = $container;
  this._parent = parent;
  this._horizontal = isHorizontal;

  this._pane = [false, false];
  this.$pane = [];
  this.$bar;
  this._pos = 0.4;
  this._findBestPos = false;

  this._init();
};

wcSplitter.prototype = {
  _init: function() {
    this.$pane.push($('<div class="wcLayoutPane">'));
    this.$pane.push($('<div class="wcLayoutPane">'));
    this.$bar = $('<div class="wcSplitterBar">');

    if (this._horizontal) {
      this.$pane[0].addClass('wcTall');
      this.$pane[1].addClass('wcTall');
      this.$bar.addClass('wcTall').addClass('wcSplitterBarV');
    } else {
      this.$pane[0].addClass('wcWide');
      this.$pane[1].addClass('wcWide');
      this.$bar.addClass('wcWide').addClass('wcSplitterBarH');
    }

    this.container(this.$container);
  },

  // Saves the current panel configuration into a meta
  // object that can be used later to restore it.
  _save: function() {
    var data = {};
    data.type       = 'wcSplitter';
    data.horizontal = this._horizontal;
    data.pane0      = this._pane[0]? this._pane[0]._save(): null;
    data.pane1      = this._pane[1]? this._pane[1]._save(): null;
    data.pos        = this._pos;
    return data;
  },

  // Restores a previously saved configuration.
  _restore: function(data, docker) {
    this._pos  = data.pos;
    if (data.pane0) {
      this._pane[0] = docker._create(data.pane0, this, this.$pane[0]);
      this._pane[0]._restore(data.pane0, docker);
    }
    if (data.pane1) {
      this._pane[1] = docker._create(data.pane1, this, this.$pane[1]);
      this._pane[1]._restore(data.pane1, docker);
    }
  },

  // Updates the size of the splitter.
  _update: function() {
    var width = this.$container.width();
    var height = this.$container.height();

    var minSize = this.minPos();
    var maxSize = this.maxPos();

    if (this._findBestPos) {
      this._findBestPos = false;

      var size1;
      var size2;
      if (this._pane[0] && typeof this._pane[0].size === 'function') {
        size1 = this._pane[0].size();
      }

      if (this._pane[1] && typeof this._pane[1].size === 'function') {
        size2 = this._pane[1].size();

        if (size2) {
          size2.x = width  - size2.x;
          size2.y = height - size2.y;
        }
      }

      var size;
      if (size1 && size2) {
        size = {
          x: Math.min(size1.x, size2.x),
          y: Math.min(size1.y, size2.y),
        };
      } else if (size1) {
        size = size1;
      } else if (size2) {
        size = size2;
      }

      if (size) {
        if (this._horizontal) {
          this._pos = size.x / width;
        } else {
          this._pos = size.y / height;
        }
      }
    }

    if (this._horizontal) {
      var size = width * this._pos;

      if (minSize) {
        size = Math.max(minSize.x, size);
      }
      if (maxSize) {
        size = Math.min(maxSize.x, size);
      }

      this.$bar.css('left', size+1);
      this.$pane[0].css('width', size-2 + 'px');
      this.$pane[0].css('left',  '0px');
      this.$pane[0].css('right', '');
      this.$pane[1].css('left',  '');
      this.$pane[1].css('right', '0px');
      this.$pane[1].css('width', width - size - 5 + 'px');
    } else {
      var size = height * this._pos;

      if (minSize) {
        size = Math.max(minSize.y, size);
      }
      if (maxSize) {
        size = Math.min(maxSize.y, size);
      }

      this.$bar.css('top', size+1);
      this.$pane[0].css('height', size-2 + 'px');
      this.$pane[0].css('top',    '0px');
      this.$pane[0].css('bottom', '');
      this.$pane[1].css('top',    '');
      this.$pane[1].css('bottom', '0px');
      this.$pane[1].css('height', height - size - 5 + 'px');
    }

    this._pane[0]._update();
    this._pane[1]._update();
  },

  // Whether the splitter splits horizontally.
  isHorizontal: function() {
    return this._horizontal;
  },

  // Moves the slider bar based on a mouse position.
  // Params:
  //    mouse       The mouse offset position.
  moveBar: function(mouse) {
    var width = this.$container.width();
    var height = this.$container.height();
    var offset = this.$container.offset();

    mouse.x -= offset.left;
    mouse.y -= offset.top;

    var minSize = this.minPos();
    var maxSize = this.maxPos();

    if (this._horizontal) {
      this.pos((mouse.x-3) / width);
    } else {
      this.pos((mouse.y-3) / height);
    }
  },

  // Gets the minimum position of the splitter divider.
  minPos: function() {
    var width = this.$container.width();
    var height = this.$container.height();

    var minSize;
    if (this._pane[0] && typeof this._pane[0].minSize === 'function') {
      minSize = this._pane[0].minSize();
    } else {
      minSize = {x:50,y:50};
    }

    var maxSize;
    if (this._pane[1] && typeof this._pane[1].maxSize === 'function') {
      maxSize = this._pane[1].maxSize();
    } else {
      maxSize = {x:width,y:height};
    }

    maxSize.x = width  - Math.min(maxSize.x, width);
    maxSize.y = height - Math.min(maxSize.y, height);

    minSize.x = Math.max(minSize.x, maxSize.x);
    minSize.y = Math.max(minSize.y, maxSize.y);
    return minSize;
  },

  // Gets the maximum position of the splitter divider.
  maxPos: function() {
    var width = this.$container.width();
    var height = this.$container.height();

    var maxSize;
    if (this._pane[0] && typeof this._pane[0].maxSize === 'function') {
      maxSize = this._pane[0].maxSize();
    } else {
      maxSize = {x:width,y:height};
    }

    var minSize;
    if (this._pane[1] && typeof this._pane[1].minSize === 'function') {
      minSize = this._pane[1].minSize();
    } else {
      minSize = {x:50,y:50};
    }

    minSize.x = width  - minSize.x;
    minSize.y = height - minSize.y;

    maxSize.x = Math.min(minSize.x, maxSize.x);
    maxSize.y = Math.min(minSize.y, maxSize.y);
    return maxSize;
  },

  // Gets the minimum size of the widget.
  minSize: function() {
    var minSize1;
    var minSize2;
    if (this._pane[0] && typeof this._pane[0].minSize === 'function') {
      minSize1 = this._pane[0].minSize();
    }

    if (this._pane[1] && typeof this._pane[1].minSize === 'function') {
      minSize2 = this._pane[1].minSize();
    }

    if (minSize1 && minSize2) {
      if (this._horizontal) {
        minSize1.x += minSize2.x;
        minSize1.y = Math.max(minSize1.y, minSize2.y);
      } else {
        minSize1.y += minSize2.y;
        minSize1.x = Math.max(minSize1.x, minSize2.x);
      }
      return minSize1;
      return {
        x: Math.min(minSize1.x, minSize2.x),
        y: Math.min(minSize1.y, minSize2.y),
      };
    } else if (minSize1) {
      return minSize1;
    } else if (minSize2) {
      return minSize2;
    }

    return false;
  },

  // Gets the minimum size of the widget.
  maxSize: function() {
    var maxSize1;
    var maxSize2;
    if (this._pane[0] && typeof this._pane[0].maxSize === 'function') {
      maxSize1 = this._pane[0].maxSize();
    }

    if (this._pane[1] && typeof this._pane[1].maxSize === 'function') {
      maxSize2 = this._pane[1].maxSize();
    }

    if (maxSize1 && maxSize2) {
      if (this._horizontal) {
        maxSize1.x += maxSize2.x;
        maxSize1.y = Math.min(maxSize1.y, maxSize2.y);
      } else {
        maxSize1.y += maxSize2.y;
        maxSize1.x = Math.min(maxSize1.x, maxSize2.x);
      }
      return maxSize1;
      return {
        x: Math.min(maxSize1.x, maxSize2.x),
        y: Math.min(maxSize1.y, maxSize2.y),
      };
    } else if (maxSize1) {
      return maxSize1;
    } else if (maxSize2) {
      return maxSize2;
    }

    return false;
  },

  // Get, or Set a splitter position.
  // Params:
  //    pos           If supplied, assigns a new splitter percentage (0-1).
  // Returns:
  //    number        The current position.
  pos: function(pos) {
    if (typeof pos === 'undefined') {
      return this._pos;
    }
    this._pos = pos;
    return this._pos;
  },

  findBestPos: function() {
    this._findBestPos = true;
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
      this.$container.append(this.$pane[0]);
      this.$container.append(this.$pane[1]);
      this.$container.append(this.$bar);
    } else {
      this.$pane[0].remove();
      this.$pane[1].remove();
      this.$bar.remove();
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

  // Removes a child from this splitter.
  // Params:
  //    child         The child to remove.
  removeChild: function(child) {
    if (this._pane[0] === child) {
      this._pane[0] = false;
    } else if (this._pane[1] === child) {
      this._pane[1] = false;
    } else {
      return;
    }
 
    if (child) {
      child.container(null);
      child.parent(null);
    }
  },

  // Sets, or Gets the widget at a given pane
  // Params:
  //    index     The pane index, only 0 or 1 are valid.
  //    item      If supplied, assigns the item to the pane.
  // Returns:
  //    panel     The panel that exists in the pane.
  //    false     If no pane exists.
  pane: function(index, item) {
    if (index >= 0 && index < 2) {
      if (typeof item === 'undefined') {
        return this._pane[index];
      } else {
        if (item) {
          this._pane[index] = item;
          item.parent(this);
          item.container(this.$pane[index]);
          return item;
        } else if (this._pane[index]) {
          this._pane[index].container(null);
          this._pane[index] = false;
        }
      }
    }
    return false;
  },

  // Disconnects and prepares this widget for destruction.
  destroy: function() {
    if (this._pane[0]) {
      this._pane[0].destroy();
    }
    if (this._pane[1]) {
      this._pane[1].destroy();
    }

    this.container(null);
    this.parent(null);
  },
};
/*
 * jQuery contextMenu - Plugin for simple contextMenu handling
 *
 * Version: git-master
 *
 * Authors: Rodney Rehm, Addy Osmani (patches for FF)
 * Web: http://medialize.github.com/jQuery-contextMenu/
 *
 * Licensed under
 *   MIT License http://www.opensource.org/licenses/mit-license
 *   GPL v3 http://opensource.org/licenses/GPL-3.0
 *
 */

(function($, undefined){
    
    // TODO: -
        // ARIA stuff: menuitem, menuitemcheckbox und menuitemradio
        // create <menu> structure if $.support[htmlCommand || htmlMenuitem] and !opt.disableNative

// determine html5 compatibility
$.support.htmlMenuitem = ('HTMLMenuItemElement' in window);
$.support.htmlCommand = ('HTMLCommandElement' in window);
$.support.eventSelectstart = ("onselectstart" in document.documentElement);
/* // should the need arise, test for css user-select
$.support.cssUserSelect = (function(){
    var t = false,
        e = document.createElement('div');
    
    $.each('Moz|Webkit|Khtml|O|ms|Icab|'.split('|'), function(i, prefix) {
        var propCC = prefix + (prefix ? 'U' : 'u') + 'serSelect',
            prop = (prefix ? ('-' + prefix.toLowerCase() + '-') : '') + 'user-select';
            
        e.style.cssText = prop + ': text;';
        if (e.style[propCC] == 'text') {
            t = true;
            return false;
        }
        
        return true;
    });
    
    return t;
})();
*/

if (!$.ui || !$.ui.widget) {
    // duck punch $.cleanData like jQueryUI does to get that remove event
    // https://github.com/jquery/jquery-ui/blob/master/ui/jquery.ui.widget.js#L16-24
    var _cleanData = $.cleanData;
    $.cleanData = function( elems ) {
        for ( var i = 0, elem; (elem = elems[i]) != null; i++ ) {
            try {
                $( elem ).triggerHandler( "remove" );
                // http://bugs.jquery.com/ticket/8235
            } catch( e ) {}
        }
        _cleanData( elems );
    };
}

var // currently active contextMenu trigger
    $currentTrigger = null,
    // is contextMenu initialized with at least one menu?
    initialized = false,
    // window handle
    $win = $(window),
    // number of registered menus
    counter = 0,
    // mapping selector to namespace
    namespaces = {},
    // mapping namespace to options
    menus = {},
    // custom command type handlers
    types = {},
    // default values
    defaults = {
        // selector of contextMenu trigger
        selector: null,
        // where to append the menu to
        appendTo: null,
        // method to trigger context menu ["right", "left", "hover"]
        trigger: "right",
        // hide menu when mouse leaves trigger / menu elements
        autoHide: false,
        // ms to wait before showing a hover-triggered context menu
        delay: 200,
        // flag denoting if a second trigger should simply move (true) or rebuild (false) an open menu
        // as long as the trigger happened on one of the trigger-element's child nodes
        reposition: true,
        // determine position to show menu at
        determinePosition: function($menu) {
            // position to the lower middle of the trigger element
            if ($.ui && $.ui.position) {
                // .position() is provided as a jQuery UI utility
                // (...and it won't work on hidden elements)
                $menu.css('display', 'block').position({
                    my: "center top",
                    at: "center bottom",
                    of: this,
                    offset: "0 5",
                    collision: "fit"
                }).css('display', 'none');
            } else {
                // determine contextMenu position
                var offset = this.offset();
                offset.top += this.outerHeight();
                offset.left += this.outerWidth() / 2 - $menu.outerWidth() / 2;
                $menu.css(offset);
            }
        },
        // position menu
        position: function(opt, x, y) {
            var $this = this,
                offset;
            // determine contextMenu position
            if (!x && !y) {
                opt.determinePosition.call(this, opt.$menu);
                return;
            } else if (x === "maintain" && y === "maintain") {
                // x and y must not be changed (after re-show on command click)
                offset = opt.$menu.position();
            } else {
                // x and y are given (by mouse event)
                offset = {top: y, left: x};
            }
            
            // correct offset if viewport demands it
            var bottom = $win.scrollTop() + $win.height(),
                right = $win.scrollLeft() + $win.width(),
                height = opt.$menu.height(),
                width = opt.$menu.width();
            
            if (offset.top + height > bottom) {
                offset.top -= height;
            }
            
            if (offset.left + width > right) {
                offset.left -= width;
            }
            
            opt.$menu.css(offset);
        },
        // position the sub-menu
        positionSubmenu: function($menu) {
            if ($.ui && $.ui.position) {
                // .position() is provided as a jQuery UI utility
                // (...and it won't work on hidden elements)
                $menu.css('display', 'block').position({
                    my: "left top",
                    at: "right top",
                    of: this,
                    collision: "flipfit fit"
                }).css('display', '');
            } else {
                // determine contextMenu position
                var offset = {
                    top: 0,
                    left: this.outerWidth()
                };
                $menu.css(offset);
            }
        },
        // offset to add to zIndex
        zIndex: 1,
        // show hide animation settings
        animation: {
            duration: 50,
            show: 'slideDown',
            hide: 'slideUp'
        },
        // events
        events: {
            show: $.noop,
            hide: $.noop
        },
        // default callback
        callback: null,
        // list of contextMenu items
        items: {}
    },
    // mouse position for hover activation
    hoveract = {
        timer: null,
        pageX: null,
        pageY: null
    },
    // determine zIndex
    zindex = function($t) {
        var zin = 0,
            $tt = $t;

        while (true) {
            zin = Math.max(zin, parseInt($tt.css('z-index'), 10) || 0);
            $tt = $tt.parent();
            if (!$tt || !$tt.length || "html body".indexOf($tt.prop('nodeName').toLowerCase()) > -1 ) {
                break;
            }
        }
        
        return zin;
    },
    // event handlers
    handle = {
        // abort anything
        abortevent: function(e){
            e.preventDefault();
            e.stopImmediatePropagation();
        },
        
        // contextmenu show dispatcher
        contextmenu: function(e) {
            var $this = $(this);
            
            // abort native-triggered events unless we're triggering on right click
            if (e.data.trigger != 'right' && e.originalEvent) {
                return;
            }
            
            // abort event if menu is visible for this trigger
            if ($this.hasClass('context-menu-active')) {
                return;
            }
            
            if (!$this.hasClass('context-menu-disabled')) {
                // disable actual context-menu
                e.preventDefault();
                e.stopImmediatePropagation();
                
                // theoretically need to fire a show event at <menu>
                // http://www.whatwg.org/specs/web-apps/current-work/multipage/interactive-elements.html#context-menus
                // var evt = jQuery.Event("show", { data: data, pageX: e.pageX, pageY: e.pageY, relatedTarget: this });
                // e.data.$menu.trigger(evt);
                
                $currentTrigger = $this;
                if (e.data.build) {
                    var built = e.data.build($currentTrigger, e);
                    // abort if build() returned false
                    if (built === false) {
                        return;
                    }
                    
                    // dynamically build menu on invocation
                    e.data = $.extend(true, {}, defaults, e.data, built || {});

                    // abort if there are no items to display
                    if (!e.data.items || $.isEmptyObject(e.data.items)) {
                        // Note: jQuery captures and ignores errors from event handlers
                        if (window.console) {
                            (console.error || console.log)("No items specified to show in contextMenu");
                        }
                        
                        throw new Error('No Items specified');
                    }
                    
                    // backreference for custom command type creation
                    e.data.$trigger = $currentTrigger;
                    
                    op.create(e.data);
                }
                // show menu
                op.show.call($this, e.data, e.pageX, e.pageY);
            }
        },
        // contextMenu left-click trigger
        click: function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            $(this).trigger($.Event("contextmenu", { data: e.data, pageX: e.pageX, pageY: e.pageY }));
        },
        // contextMenu right-click trigger
        mousedown: function(e) {
            // register mouse down
            var $this = $(this);
            
            // hide any previous menus
            if ($currentTrigger && $currentTrigger.length && !$currentTrigger.is($this)) {
                $currentTrigger.data('contextMenu').$menu.trigger('contextmenu:hide');
            }
            
            // activate on right click
            if (e.button == 2) {
                $currentTrigger = $this.data('contextMenuActive', true);
            }
        },
        // contextMenu right-click trigger
        mouseup: function(e) {
            // show menu
            var $this = $(this);
            if ($this.data('contextMenuActive') && $currentTrigger && $currentTrigger.length && $currentTrigger.is($this) && !$this.hasClass('context-menu-disabled')) {
                e.preventDefault();
                e.stopImmediatePropagation();
                $currentTrigger = $this;
                $this.trigger($.Event("contextmenu", { data: e.data, pageX: e.pageX, pageY: e.pageY }));
            }
            
            $this.removeData('contextMenuActive');
        },
        // contextMenu hover trigger
        mouseenter: function(e) {
            var $this = $(this),
                $related = $(e.relatedTarget),
                $document = $(document);
            
            // abort if we're coming from a menu
            if ($related.is('.context-menu-list') || $related.closest('.context-menu-list').length) {
                return;
            }
            
            // abort if a menu is shown
            if ($currentTrigger && $currentTrigger.length) {
                return;
            }
            
            hoveract.pageX = e.pageX;
            hoveract.pageY = e.pageY;
            hoveract.data = e.data;
            $document.on('mousemove.contextMenuShow', handle.mousemove);
            hoveract.timer = setTimeout(function() {
                hoveract.timer = null;
                $document.off('mousemove.contextMenuShow');
                $currentTrigger = $this;
                $this.trigger($.Event("contextmenu", { data: hoveract.data, pageX: hoveract.pageX, pageY: hoveract.pageY }));
            }, e.data.delay );
        },
        // contextMenu hover trigger
        mousemove: function(e) {
            hoveract.pageX = e.pageX;
            hoveract.pageY = e.pageY;
        },
        // contextMenu hover trigger
        mouseleave: function(e) {
            // abort if we're leaving for a menu
            var $related = $(e.relatedTarget);
            if ($related.is('.context-menu-list') || $related.closest('.context-menu-list').length) {
                return;
            }
            
            try {
                clearTimeout(hoveract.timer);
            } catch(e) {}
            
            hoveract.timer = null;
        },
        
        // click on layer to hide contextMenu
        layerClick: function(e) {
            var $this = $(this),
                root = $this.data('contextMenuRoot'),
                mouseup = false,
                button = e.button,
                x = e.pageX,
                y = e.pageY,
                target, 
                offset,
                selectors;
                
            e.preventDefault();
            e.stopImmediatePropagation();
            
            setTimeout(function() {
                var $window, hideshow, possibleTarget;
                var triggerAction = ((root.trigger == 'left' && button === 0) || (root.trigger == 'right' && button === 2));
                
                // find the element that would've been clicked, wasn't the layer in the way
                if (document.elementFromPoint) {
                    root.$layer.hide();
                    target = document.elementFromPoint(x - $win.scrollLeft(), y - $win.scrollTop());
                    root.$layer.show();
                }
                
                if (root.reposition && triggerAction) {
                    if (document.elementFromPoint) {
                        if (root.$trigger.is(target) || root.$trigger.has(target).length) {
                            root.position.call(root.$trigger, root, x, y);
                            return;
                        }
                    } else {
                        offset = root.$trigger.offset();
                        $window = $(window);
                        // while this looks kinda awful, it's the best way to avoid
                        // unnecessarily calculating any positions
                        offset.top += $window.scrollTop();
                        if (offset.top <= e.pageY) {
                            offset.left += $window.scrollLeft();
                            if (offset.left <= e.pageX) {
                                offset.bottom = offset.top + root.$trigger.outerHeight();
                                if (offset.bottom >= e.pageY) {
                                    offset.right = offset.left + root.$trigger.outerWidth();
                                    if (offset.right >= e.pageX) {
                                        // reposition
                                        root.position.call(root.$trigger, root, x, y);
                                        return;
                                    }
                                }
                            }
                        }
                    }
                }
                
                if (target && triggerAction) {
                    root.$trigger.one('contextmenu:hidden', function() {
                        $(target).contextMenu({x: x, y: y});
                    });
                }

                root.$menu.trigger('contextmenu:hide');
            }, 50);
        },
        // key handled :hover
        keyStop: function(e, opt) {
            if (!opt.isInput) {
                e.preventDefault();
            }
            
            e.stopPropagation();
        },
        key: function(e) {
            var opt = $currentTrigger.data('contextMenu') || {};

            switch (e.keyCode) {
                case 9:
                case 38: // up
                    handle.keyStop(e, opt);
                    // if keyCode is [38 (up)] or [9 (tab) with shift]
                    if (opt.isInput) {
                        if (e.keyCode == 9 && e.shiftKey) {
                            e.preventDefault();
                            opt.$selected && opt.$selected.find('input, textarea, select').blur();
                            opt.$menu.trigger('prevcommand');
                            return;
                        } else if (e.keyCode == 38 && opt.$selected.find('input, textarea, select').prop('type') == 'checkbox') {
                            // checkboxes don't capture this key
                            e.preventDefault();
                            return;
                        }
                    } else if (e.keyCode != 9 || e.shiftKey) {
                        opt.$menu.trigger('prevcommand');
                        return;
                    }
                    // omitting break;
                    
                // case 9: // tab - reached through omitted break;
                case 40: // down
                    handle.keyStop(e, opt);
                    if (opt.isInput) {
                        if (e.keyCode == 9) {
                            e.preventDefault();
                            opt.$selected && opt.$selected.find('input, textarea, select').blur();
                            opt.$menu.trigger('nextcommand');
                            return;
                        } else if (e.keyCode == 40 && opt.$selected.find('input, textarea, select').prop('type') == 'checkbox') {
                            // checkboxes don't capture this key
                            e.preventDefault();
                            return;
                        }
                    } else {
                        opt.$menu.trigger('nextcommand');
                        return;
                    }
                    break;
                
                case 37: // left
                    handle.keyStop(e, opt);
                    if (opt.isInput || !opt.$selected || !opt.$selected.length) {
                        break;
                    }
                
                    if (!opt.$selected.parent().hasClass('context-menu-root')) {
                        var $parent = opt.$selected.parent().parent();
                        opt.$selected.trigger('contextmenu:blur');
                        opt.$selected = $parent;
                        return;
                    }
                    break;
                    
                case 39: // right
                    handle.keyStop(e, opt);
                    if (opt.isInput || !opt.$selected || !opt.$selected.length) {
                        break;
                    }
                    
                    var itemdata = opt.$selected.data('contextMenu') || {};
                    if (itemdata.$menu && opt.$selected.hasClass('context-menu-submenu')) {
                        opt.$selected = null;
                        itemdata.$selected = null;
                        itemdata.$menu.trigger('nextcommand');
                        return;
                    }
                    break;
                
                case 35: // end
                case 36: // home
                    if (opt.$selected && opt.$selected.find('input, textarea, select').length) {
                        return;
                    } else {
                        (opt.$selected && opt.$selected.parent() || opt.$menu)
                            .children(':not(.disabled, .not-selectable)')[e.keyCode == 36 ? 'first' : 'last']()
                            .trigger('contextmenu:focus');
                        e.preventDefault();
                        return;
                    }
                    break;
                    
                case 13: // enter
                    handle.keyStop(e, opt);
                    if (opt.isInput) {
                        if (opt.$selected && !opt.$selected.is('textarea, select')) {
                            e.preventDefault();
                            return;
                        }
                        break;
                    }
                    opt.$selected && opt.$selected.trigger('mouseup');
                    return;
                    
                case 32: // space
                case 33: // page up
                case 34: // page down
                    // prevent browser from scrolling down while menu is visible
                    handle.keyStop(e, opt);
                    return;
                    
                case 27: // esc
                    handle.keyStop(e, opt);
                    opt.$menu.trigger('contextmenu:hide');
                    return;
                    
                default: // 0-9, a-z
                    var k = (String.fromCharCode(e.keyCode)).toUpperCase();
                    if (opt.accesskeys[k]) {
                        // according to the specs accesskeys must be invoked immediately
                        opt.accesskeys[k].$node.trigger(opt.accesskeys[k].$menu
                            ? 'contextmenu:focus'
                            : 'mouseup'
                        );
                        return;
                    }
                    break;
            }
            // pass event to selected item, 
            // stop propagation to avoid endless recursion
            e.stopPropagation();
            opt.$selected && opt.$selected.trigger(e);
        },

        // select previous possible command in menu
        prevItem: function(e) {
            e.stopPropagation();
            var opt = $(this).data('contextMenu') || {};

            // obtain currently selected menu
            if (opt.$selected) {
                var $s = opt.$selected;
                opt = opt.$selected.parent().data('contextMenu') || {};
                opt.$selected = $s;
            }
            
            var $children = opt.$menu.children(),
                $prev = !opt.$selected || !opt.$selected.prev().length ? $children.last() : opt.$selected.prev(),
                $round = $prev;
            
            // skip disabled
            while ($prev.hasClass('disabled') || $prev.hasClass('not-selectable')) {
                if ($prev.prev().length) {
                    $prev = $prev.prev();
                } else {
                    $prev = $children.last();
                }
                if ($prev.is($round)) {
                    // break endless loop
                    return;
                }
            }
            
            // leave current
            if (opt.$selected) {
                handle.itemMouseleave.call(opt.$selected.get(0), e);
            }
            
            // activate next
            handle.itemMouseenter.call($prev.get(0), e);
            
            // focus input
            var $input = $prev.find('input, textarea, select');
            if ($input.length) {
                $input.focus();
            }
        },
        // select next possible command in menu
        nextItem: function(e) {
            e.stopPropagation();
            var opt = $(this).data('contextMenu') || {};

            // obtain currently selected menu
            if (opt.$selected) {
                var $s = opt.$selected;
                opt = opt.$selected.parent().data('contextMenu') || {};
                opt.$selected = $s;
            }

            var $children = opt.$menu.children(),
                $next = !opt.$selected || !opt.$selected.next().length ? $children.first() : opt.$selected.next(),
                $round = $next;

            // skip disabled
            while ($next.hasClass('disabled') || $next.hasClass('not-selectable')) {
                if ($next.next().length) {
                    $next = $next.next();
                } else {
                    $next = $children.first();
                }
                if ($next.is($round)) {
                    // break endless loop
                    return;
                }
            }
            
            // leave current
            if (opt.$selected) {
                handle.itemMouseleave.call(opt.$selected.get(0), e);
            }
            
            // activate next
            handle.itemMouseenter.call($next.get(0), e);
            
            // focus input
            var $input = $next.find('input, textarea, select');
            if ($input.length) {
                $input.focus();
            }
        },
        
        // flag that we're inside an input so the key handler can act accordingly
        focusInput: function(e) {
            var $this = $(this).closest('.context-menu-item'),
                data = $this.data(),
                opt = data.contextMenu,
                root = data.contextMenuRoot;

            root.$selected = opt.$selected = $this;
            root.isInput = opt.isInput = true;
        },
        // flag that we're inside an input so the key handler can act accordingly
        blurInput: function(e) {
            var $this = $(this).closest('.context-menu-item'),
                data = $this.data(),
                opt = data.contextMenu,
                root = data.contextMenuRoot;

            root.isInput = opt.isInput = false;
        },
        
        // :hover on menu
        menuMouseenter: function(e) {
            var root = $(this).data().contextMenuRoot;
            root.hovering = true;
        },
        // :hover on menu
        menuMouseleave: function(e) {
            var root = $(this).data().contextMenuRoot;
            if (root.$layer && root.$layer.is(e.relatedTarget)) {
                root.hovering = false;
            }
        },
        
        // :hover done manually so key handling is possible
        itemMouseenter: function(e) {
            var $this = $(this),
                data = $this.data(),
                opt = data.contextMenu,
                root = data.contextMenuRoot;
            
            root.hovering = true;

            // abort if we're re-entering
            if (e && root.$layer && root.$layer.is(e.relatedTarget)) {
                e.preventDefault();
                e.stopImmediatePropagation();
            }

            // make sure only one item is selected
            (opt.$menu ? opt : root).$menu
                .children('.hover').trigger('contextmenu:blur');

            if ($this.hasClass('disabled') || $this.hasClass('not-selectable')) {
                opt.$selected = null;
                return;
            }
            
            $this.trigger('contextmenu:focus');
        },
        // :hover done manually so key handling is possible
        itemMouseleave: function(e) {
            var $this = $(this),
                data = $this.data(),
                opt = data.contextMenu,
                root = data.contextMenuRoot;

            if (root !== opt && root.$layer && root.$layer.is(e.relatedTarget)) {
                root.$selected && root.$selected.trigger('contextmenu:blur');
                e.preventDefault();
                e.stopImmediatePropagation();
                root.$selected = opt.$selected = opt.$node;
                return;
            }
            
            $this.trigger('contextmenu:blur');
        },
        // contextMenu item click
        itemClick: function(e) {
            var $this = $(this),
                data = $this.data(),
                opt = data.contextMenu,
                root = data.contextMenuRoot,
                key = data.contextMenuKey,
                callback;

            // abort if the key is unknown or disabled or is a menu
            if (!opt.items[key] || $this.is('.disabled, .context-menu-submenu, .context-menu-separator, .not-selectable')) {
                return;
            }

            e.preventDefault();
            e.stopImmediatePropagation();

            if ($.isFunction(root.callbacks[key]) && Object.prototype.hasOwnProperty.call(root.callbacks, key)) {
                // item-specific callback
                callback = root.callbacks[key];
            } else if ($.isFunction(root.callback)) {
                // default callback
                callback = root.callback;                
            } else {
                // no callback, no action
                return;
            }

            // hide menu if callback doesn't stop that
            if (callback.call(root.$trigger, key, root) !== false) {
                root.$menu.trigger('contextmenu:hide');
            } else if (root.$menu.parent().length) {
                op.update.call(root.$trigger, root);
            }
        },
        // ignore click events on input elements
        inputClick: function(e) {
            e.stopImmediatePropagation();
        },
        
        // hide <menu>
        hideMenu: function(e, data) {
            var root = $(this).data('contextMenuRoot');
            op.hide.call(root.$trigger, root, data && data.force);
        },
        // focus <command>
        focusItem: function(e) {
            e.stopPropagation();
            var $this = $(this),
                data = $this.data(),
                opt = data.contextMenu,
                root = data.contextMenuRoot;

            $this.addClass('hover')
                .siblings('.hover').trigger('contextmenu:blur');
            
            // remember selected
            opt.$selected = root.$selected = $this;
            
            // position sub-menu - do after show so dumb $.ui.position can keep up
            if (opt.$node) {
                root.positionSubmenu.call(opt.$node, opt.$menu);
            }
        },
        // blur <command>
        blurItem: function(e) {
            e.stopPropagation();
            var $this = $(this),
                data = $this.data(),
                opt = data.contextMenu,
                root = data.contextMenuRoot;
            
            $this.removeClass('hover');
            opt.$selected = null;
        }
    },
    // operations
    op = {
        show: function(opt, x, y) {
            var $trigger = $(this),
                offset,
                css = {};

            // hide any open menus
            $('#context-menu-layer').trigger('mousedown');

            // backreference for callbacks
            opt.$trigger = $trigger;

            // show event
            if (opt.events.show.call($trigger, opt) === false) {
                $currentTrigger = null;
                return;
            }

            // create or update context menu
            op.update.call($trigger, opt);
            
            // position menu
            opt.position.call($trigger, opt, x, y);

            // make sure we're in front
            if (opt.zIndex) {
                css.zIndex = zindex($trigger) + opt.zIndex;
            }
            
            // add layer
            op.layer.call(opt.$menu, opt, css.zIndex);
            
            // adjust sub-menu zIndexes
            opt.$menu.find('ul').css('zIndex', css.zIndex + 1);
            
            // position and show context menu
            opt.$menu.css( css )[opt.animation.show](opt.animation.duration, function() {
                $trigger.trigger('contextmenu:visible');
            });
            // make options available and set state
            $trigger
                .data('contextMenu', opt)
                .addClass("context-menu-active");
            
            // register key handler
            $(document).off('keydown.contextMenu').on('keydown.contextMenu', handle.key);
            // register autoHide handler
            if (opt.autoHide) {
                // mouse position handler
                $(document).on('mousemove.contextMenuAutoHide', function(e) {
                    // need to capture the offset on mousemove,
                    // since the page might've been scrolled since activation
                    var pos = $trigger.offset();
                    pos.right = pos.left + $trigger.outerWidth();
                    pos.bottom = pos.top + $trigger.outerHeight();
                    
                    if (opt.$layer && !opt.hovering && (!(e.pageX >= pos.left && e.pageX <= pos.right) || !(e.pageY >= pos.top && e.pageY <= pos.bottom))) {
                        // if mouse in menu...
                        opt.$menu.trigger('contextmenu:hide');
                    }
                });
            }
        },
        hide: function(opt, force) {
            var $trigger = $(this);
            if (!opt) {
                opt = $trigger.data('contextMenu') || {};
            }
            
            // hide event
            if (!force && opt.events && opt.events.hide.call($trigger, opt) === false) {
                return;
            }
            
            // remove options and revert state
            $trigger
                .removeData('contextMenu')
                .removeClass("context-menu-active");
            
            if (opt.$layer) {
                // keep layer for a bit so the contextmenu event can be aborted properly by opera
                setTimeout((function($layer) {
                    return function(){
                        $layer.remove();
                    };
                })(opt.$layer), 10);
                
                try {
                    delete opt.$layer;
                } catch(e) {
                    opt.$layer = null;
                }
            }
            
            // remove handle
            $currentTrigger = null;
            // remove selected
            opt.$menu.find('.hover').trigger('contextmenu:blur');
            opt.$selected = null;
            // unregister key and mouse handlers
            //$(document).off('.contextMenuAutoHide keydown.contextMenu'); // http://bugs.jquery.com/ticket/10705
            $(document).off('.contextMenuAutoHide').off('keydown.contextMenu');
            // hide menu
            opt.$menu && opt.$menu[opt.animation.hide](opt.animation.duration, function (){
                // tear down dynamically built menu after animation is completed.
                if (opt.build) {
                    opt.$menu.remove();
                    $.each(opt, function(key, value) {
                        switch (key) {
                            case 'ns':
                            case 'selector':
                            case 'build':
                            case 'trigger':
                                return true;

                            default:
                                opt[key] = undefined;
                                try {
                                    delete opt[key];
                                } catch (e) {}
                                return true;
                        }
                    });
                }
                
                setTimeout(function() {
                    $trigger.trigger('contextmenu:hidden');
                }, 10);
            });
        },
        create: function(opt, root) {
            if (root === undefined) {
                root = opt;
            }
            // create contextMenu
            opt.$menu = $('<ul class="context-menu-list"></ul>').addClass(opt.className || "").data({
                'contextMenu': opt,
                'contextMenuRoot': root
            });
            
            $.each(['callbacks', 'commands', 'inputs'], function(i,k){
                opt[k] = {};
                if (!root[k]) {
                    root[k] = {};
                }
            });
            
            root.accesskeys || (root.accesskeys = {});
            
            // create contextMenu items
            $.each(opt.items, function(key, item){
                var $t = $('<li class="context-menu-item"></li>').addClass(item.className || ""),
                    $label = null,
                    $input = null;
                
                // iOS needs to see a click-event bound to an element to actually
                // have the TouchEvents infrastructure trigger the click event
                $t.on('click', $.noop);
                
                item.$node = $t.data({
                    'contextMenu': opt,
                    'contextMenuRoot': root,
                    'contextMenuKey': key
                });
                
                // register accesskey
                // NOTE: the accesskey attribute should be applicable to any element, but Safari5 and Chrome13 still can't do that
                if (item.accesskey) {
                    var aks = splitAccesskey(item.accesskey);
                    for (var i=0, ak; ak = aks[i]; i++) {
                        if (!root.accesskeys[ak]) {
                            root.accesskeys[ak] = item;
                            item._name = item.name.replace(new RegExp('(' + ak + ')', 'i'), '<span class="context-menu-accesskey">$1</span>');
                            break;
                        }
                    }
                }
                
                if (typeof item == "string") {
                    $t.addClass('context-menu-separator not-selectable');
                } else if (item.type && types[item.type]) {
                    // run custom type handler
                    types[item.type].call($t, item, opt, root);
                    // register commands
                    $.each([opt, root], function(i,k){
                        k.commands[key] = item;
                        if ($.isFunction(item.callback)) {
                            k.callbacks[key] = item.callback;
                        }
                    });
                } else {
                    // add label for input
                    if (item.type == 'html') {
                        $t.addClass('context-menu-html not-selectable');
                    } else if (item.type) {
                        $label = $('<label></label>').appendTo($t);
                        $('<span></span>').html(item._name || item.name).appendTo($label);
                        $t.addClass('context-menu-input');
                        opt.hasTypes = true;
                        $.each([opt, root], function(i,k){
                            k.commands[key] = item;
                            k.inputs[key] = item;
                        });
                    } else if (item.items) {
                        item.type = 'sub';
                    }
                
                    switch (item.type) {
                        case 'text':
                            $input = $('<input type="text" value="1" name="" value="">')
                                .attr('name', 'context-menu-input-' + key)
                                .val(item.value || "")
                                .appendTo($label);
                            break;
                    
                        case 'textarea':
                            $input = $('<textarea name=""></textarea>')
                                .attr('name', 'context-menu-input-' + key)
                                .val(item.value || "")
                                .appendTo($label);

                            if (item.height) {
                                $input.height(item.height);
                            }
                            break;

                        case 'checkbox':
                            $input = $('<input type="checkbox" value="1" name="" value="">')
                                .attr('name', 'context-menu-input-' + key)
                                .val(item.value || "")
                                .prop("checked", !!item.selected)
                                .prependTo($label);
                            break;

                        case 'radio':
                            $input = $('<input type="radio" value="1" name="" value="">')
                                .attr('name', 'context-menu-input-' + item.radio)
                                .val(item.value || "")
                                .prop("checked", !!item.selected)
                                .prependTo($label);
                            break;
                    
                        case 'select':
                            $input = $('<select name="">')
                                .attr('name', 'context-menu-input-' + key)
                                .appendTo($label);
                            if (item.options) {
                                $.each(item.options, function(value, text) {
                                    $('<option></option>').val(value).text(text).appendTo($input);
                                });
                                $input.val(item.selected);
                            }
                            break;
                        
                        case 'sub':
                            // FIXME: shouldn't this .html() be a .text()?
                            $('<span></span>').html(item._name || item.name).appendTo($t);
                            item.appendTo = item.$node;
                            op.create(item, root);
                            $t.data('contextMenu', item).addClass('context-menu-submenu');
                            item.callback = null;
                            break;
                        
                        case 'html':
                            $(item.html).appendTo($t);
                            break;
                        
                        default:
                            $.each([opt, root], function(i,k){
                                k.commands[key] = item;
                                if ($.isFunction(item.callback)) {
                                    k.callbacks[key] = item.callback;
                                }
                            });
                            // FIXME: shouldn't this .html() be a .text()?
                            $('<span></span>').html(item._name || item.name || "").appendTo($t);
                            break;
                    }
                    
                    // disable key listener in <input>
                    if (item.type && item.type != 'sub' && item.type != 'html') {
                        $input
                            .on('focus', handle.focusInput)
                            .on('blur', handle.blurInput);
                        
                        if (item.events) {
                            $input.on(item.events, opt);
                        }
                    }
                
                    // add icons
                    if (item.icon) {
                        $t.addClass("icon icon-" + item.icon);
                    }
                }
                
                // cache contained elements
                item.$input = $input;
                item.$label = $label;

                // attach item to menu
                $t.appendTo(opt.$menu);
                
                // Disable text selection
                if (!opt.hasTypes && $.support.eventSelectstart) {
                    // browsers support user-select: none, 
                    // IE has a special event for text-selection
                    // browsers supporting neither will not be preventing text-selection
                    $t.on('selectstart.disableTextSelect', handle.abortevent);
                }
            });
            // attach contextMenu to <body> (to bypass any possible overflow:hidden issues on parents of the trigger element)
            if (!opt.$node) {
                opt.$menu.css('display', 'none').addClass('context-menu-root');
            }
            opt.$menu.appendTo(opt.appendTo || document.body);
        },
        resize: function($menu, nested) {
            // determine widths of submenus, as CSS won't grow them automatically
            // position:absolute within position:absolute; min-width:100; max-width:200; results in width: 100;
            // kinda sucks hard...

            // determine width of absolutely positioned element
            $menu.css({position: 'absolute', display: 'block'});
            // don't apply yet, because that would break nested elements' widths
            // add a pixel to circumvent word-break issue in IE9 - #80
            $menu.data('width', Math.ceil($menu.width()) + 1);
            // reset styles so they allow nested elements to grow/shrink naturally
            $menu.css({
                position: 'static',
                minWidth: '0px',
                maxWidth: '100000px'
            });
            // identify width of nested menus
            $menu.find('> li > ul').each(function() {
                op.resize($(this), true);
            });
            // reset and apply changes in the end because nested
            // elements' widths wouldn't be calculatable otherwise
            if (!nested) {
                $menu.find('ul').andSelf().css({
                    position: '', 
                    display: '',
                    minWidth: '',
                    maxWidth: ''
                }).width(function() {
                    return $(this).data('width');
                });
            }
        },
        update: function(opt, root) {
            var $trigger = this;
            if (root === undefined) {
                root = opt;
                op.resize(opt.$menu);
            }
            // re-check disabled for each item
            opt.$menu.children().each(function(){
                var $item = $(this),
                    key = $item.data('contextMenuKey'),
                    item = opt.items[key],
                    disabled = ($.isFunction(item.disabled) && item.disabled.call($trigger, key, root)) || item.disabled === true;

                // dis- / enable item
                $item[disabled ? 'addClass' : 'removeClass']('disabled');
                
                if (item.type) {
                    // dis- / enable input elements
                    $item.find('input, select, textarea').prop('disabled', disabled);
                    
                    // update input states
                    switch (item.type) {
                        case 'text':
                        case 'textarea':
                            item.$input.val(item.value || "");
                            break;
                            
                        case 'checkbox':
                        case 'radio':
                            item.$input.val(item.value || "").prop('checked', !!item.selected);
                            break;
                            
                        case 'select':
                            item.$input.val(item.selected || "");
                            break;
                    }
                }
                
                if (item.$menu) {
                    // update sub-menu
                    op.update.call($trigger, item, root);
                }
            });
        },
        layer: function(opt, zIndex) {
            // add transparent layer for click area
            // filter and background for Internet Explorer, Issue #23
            var $layer = opt.$layer = $('<div id="context-menu-layer" style="position:fixed; z-index:' + zIndex + '; top:0; left:0; opacity: 0; filter: alpha(opacity=0); background-color: #000;"></div>')
                .css({height: $win.height(), width: $win.width(), display: 'block'})
                .data('contextMenuRoot', opt)
                .insertBefore(this)
                .on('contextmenu', handle.abortevent)
                .on('mousedown', handle.layerClick);
            
            // IE6 doesn't know position:fixed;
            if (!$.support.fixedPosition) {
                $layer.css({
                    'position' : 'absolute',
                    'height' : $(document).height()
                });
            }
            
            return $layer;
        }
    };

// split accesskey according to http://www.whatwg.org/specs/web-apps/current-work/multipage/editing.html#assigned-access-key
function splitAccesskey(val) {
    var t = val.split(/\s+/),
        keys = [];
        
    for (var i=0, k; k = t[i]; i++) {
        k = k[0].toUpperCase(); // first character only
        // theoretically non-accessible characters should be ignored, but different systems, different keyboard layouts, ... screw it.
        // a map to look up already used access keys would be nice
        keys.push(k);
    }
    
    return keys;
}

// handle contextMenu triggers
$.fn.contextMenu = function(operation) {
    if (operation === undefined) {
        this.first().trigger('contextmenu');
    } else if (operation.x && operation.y) {
        this.first().trigger($.Event("contextmenu", {pageX: operation.x, pageY: operation.y}));
    } else if (operation === "hide") {
        var $menu = this.data('contextMenu').$menu;
        $menu && $menu.trigger('contextmenu:hide');
    } else if (operation === "destroy") {
        $.contextMenu("destroy", {context: this});
    } else if ($.isPlainObject(operation)) {
        operation.context = this;
        $.contextMenu("create", operation);
    } else if (operation) {
        this.removeClass('context-menu-disabled');
    } else if (!operation) {
        this.addClass('context-menu-disabled');
    }
    
    return this;
};

// manage contextMenu instances
$.contextMenu = function(operation, options) {
    if (typeof operation != 'string') {
        options = operation;
        operation = 'create';
    }
    
    if (typeof options == 'string') {
        options = {selector: options};
    } else if (options === undefined) {
        options = {};
    }
    
    // merge with default options
    var o = $.extend(true, {}, defaults, options || {});
    var $document = $(document);
    var $context = $document;
    var _hasContext = false;
    
    if (!o.context || !o.context.length) {
        o.context = document;
    } else {
        // you never know what they throw at you...
        $context = $(o.context).first();
        o.context = $context.get(0);
        _hasContext = o.context !== document;
    }
    
    switch (operation) {
        case 'create':
            // no selector no joy
            if (!o.selector) {
                throw new Error('No selector specified');
            }
            // make sure internal classes are not bound to
            if (o.selector.match(/.context-menu-(list|item|input)($|\s)/)) {
                throw new Error('Cannot bind to selector "' + o.selector + '" as it contains a reserved className');
            }
            if (!o.build && (!o.items || $.isEmptyObject(o.items))) {
                throw new Error('No Items specified');
            }
            counter ++;
            o.ns = '.contextMenu' + counter;
            if (!_hasContext) {
                namespaces[o.selector] = o.ns;
            }
            menus[o.ns] = o;
            
            // default to right click
            if (!o.trigger) {
                o.trigger = 'right';
            }
            
            if (!initialized) {
                // make sure item click is registered first
                $document
                    .on({
                        'contextmenu:hide.contextMenu': handle.hideMenu,
                        'prevcommand.contextMenu': handle.prevItem,
                        'nextcommand.contextMenu': handle.nextItem,
                        'contextmenu.contextMenu': handle.abortevent,
                        'mouseenter.contextMenu': handle.menuMouseenter,
                        'mouseleave.contextMenu': handle.menuMouseleave
                    }, '.context-menu-list')
                    .on('mouseup.contextMenu', '.context-menu-input', handle.inputClick)
                    .on({
                        'mouseup.contextMenu': handle.itemClick,
                        'contextmenu:focus.contextMenu': handle.focusItem,
                        'contextmenu:blur.contextMenu': handle.blurItem,
                        'contextmenu.contextMenu': handle.abortevent,
                        'mouseenter.contextMenu': handle.itemMouseenter,
                        'mouseleave.contextMenu': handle.itemMouseleave
                    }, '.context-menu-item');

                initialized = true;
            }
            
            // engage native contextmenu event
            $context
                .on('contextmenu' + o.ns, o.selector, o, handle.contextmenu);
            
            if (_hasContext) {
                // add remove hook, just in case
                $context.on('remove' + o.ns, function() {
                    $(this).contextMenu("destroy");
                });
            }
            
            switch (o.trigger) {
                case 'hover':
                        $context
                            .on('mouseenter' + o.ns, o.selector, o, handle.mouseenter)
                            .on('mouseleave' + o.ns, o.selector, o, handle.mouseleave);                    
                    break;
                    
                case 'left':
                        $context.on('click' + o.ns, o.selector, o, handle.click);
                    break;
                /*
                default:
                    // http://www.quirksmode.org/dom/events/contextmenu.html
                    $document
                        .on('mousedown' + o.ns, o.selector, o, handle.mousedown)
                        .on('mouseup' + o.ns, o.selector, o, handle.mouseup);
                    break;
                */
            }
            
            // create menu
            if (!o.build) {
                op.create(o);
            }
            break;
        
        case 'destroy':
            var $visibleMenu;
            if (_hasContext) {
                // get proper options 
                var context = o.context;
                $.each(menus, function(ns, o) {
                    if (o.context !== context) {
                        return true;
                    }
                    
                    $visibleMenu = $('.context-menu-list').filter(':visible');
                    if ($visibleMenu.length && $visibleMenu.data().contextMenuRoot.$trigger.is($(o.context).find(o.selector))) {
                        $visibleMenu.trigger('contextmenu:hide', {force: true});
                    }

                    try {
                        if (menus[o.ns].$menu) {
                            menus[o.ns].$menu.remove();
                        }

                        delete menus[o.ns];
                    } catch(e) {
                        menus[o.ns] = null;
                    }

                    $(o.context).off(o.ns);
                    
                    return true;
                });
            } else if (!o.selector) {
                $document.off('.contextMenu .contextMenuAutoHide');
                $.each(menus, function(ns, o) {
                    $(o.context).off(o.ns);
                });
                
                namespaces = {};
                menus = {};
                counter = 0;
                initialized = false;
                
                $('#context-menu-layer, .context-menu-list').remove();
            } else if (namespaces[o.selector]) {
                $visibleMenu = $('.context-menu-list').filter(':visible');
                if ($visibleMenu.length && $visibleMenu.data().contextMenuRoot.$trigger.is(o.selector)) {
                    $visibleMenu.trigger('contextmenu:hide', {force: true});
                }
                
                try {
                    if (menus[namespaces[o.selector]].$menu) {
                        menus[namespaces[o.selector]].$menu.remove();
                    }
                    
                    delete menus[namespaces[o.selector]];
                } catch(e) {
                    menus[namespaces[o.selector]] = null;
                }
                
                $document.off(namespaces[o.selector]);
            }
            break;
        
        case 'html5':
            // if <command> or <menuitem> are not handled by the browser,
            // or options was a bool true,
            // initialize $.contextMenu for them
            if ((!$.support.htmlCommand && !$.support.htmlMenuitem) || (typeof options == "boolean" && options)) {
                $('menu[type="context"]').each(function() {
                    if (this.id) {
                        $.contextMenu({
                            selector: '[contextmenu=' + this.id +']',
                            items: $.contextMenu.fromMenu(this)
                        });
                    }
                }).css('display', 'none');
            }
            break;
        
        default:
            throw new Error('Unknown operation "' + operation + '"');
    }
    
    return this;
};

// import values into <input> commands
$.contextMenu.setInputValues = function(opt, data) {
    if (data === undefined) {
        data = {};
    }
    
    $.each(opt.inputs, function(key, item) {
        switch (item.type) {
            case 'text':
            case 'textarea':
                item.value = data[key] || "";
                break;

            case 'checkbox':
                item.selected = data[key] ? true : false;
                break;
                
            case 'radio':
                item.selected = (data[item.radio] || "") == item.value ? true : false;
                break;
            
            case 'select':
                item.selected = data[key] || "";
                break;
        }
    });
};

// export values from <input> commands
$.contextMenu.getInputValues = function(opt, data) {
    if (data === undefined) {
        data = {};
    }
    
    $.each(opt.inputs, function(key, item) {
        switch (item.type) {
            case 'text':
            case 'textarea':
            case 'select':
                data[key] = item.$input.val();
                break;

            case 'checkbox':
                data[key] = item.$input.prop('checked');
                break;
                
            case 'radio':
                if (item.$input.prop('checked')) {
                    data[item.radio] = item.value;
                }
                break;
        }
    });
    
    return data;
};

// find <label for="xyz">
function inputLabel(node) {
    return (node.id && $('label[for="'+ node.id +'"]').val()) || node.name;
}

// convert <menu> to items object
function menuChildren(items, $children, counter) {
    if (!counter) {
        counter = 0;
    }
    
    $children.each(function() {
        var $node = $(this),
            node = this,
            nodeName = this.nodeName.toLowerCase(),
            label,
            item;
        
        // extract <label><input>
        if (nodeName == 'label' && $node.find('input, textarea, select').length) {
            label = $node.text();
            $node = $node.children().first();
            node = $node.get(0);
            nodeName = node.nodeName.toLowerCase();
        }
        
        /*
         * <menu> accepts flow-content as children. that means <embed>, <canvas> and such are valid menu items.
         * Not being the sadistic kind, $.contextMenu only accepts:
         * <command>, <menuitem>, <hr>, <span>, <p> <input [text, radio, checkbox]>, <textarea>, <select> and of course <menu>.
         * Everything else will be imported as an html node, which is not interfaced with contextMenu.
         */
        
        // http://www.whatwg.org/specs/web-apps/current-work/multipage/commands.html#concept-command
        switch (nodeName) {
            // http://www.whatwg.org/specs/web-apps/current-work/multipage/interactive-elements.html#the-menu-element
            case 'menu':
                item = {name: $node.attr('label'), items: {}};
                counter = menuChildren(item.items, $node.children(), counter);
                break;
            
            // http://www.whatwg.org/specs/web-apps/current-work/multipage/commands.html#using-the-a-element-to-define-a-command
            case 'a':
            // http://www.whatwg.org/specs/web-apps/current-work/multipage/commands.html#using-the-button-element-to-define-a-command
            case 'button':
                item = {
                    name: $node.text(),
                    disabled: !!$node.attr('disabled'),
                    callback: (function(){ return function(){ $node.click(); }; })()
                };
                break;
            
            // http://www.whatwg.org/specs/web-apps/current-work/multipage/commands.html#using-the-command-element-to-define-a-command

            case 'menuitem':
            case 'command':
                switch ($node.attr('type')) {
                    case undefined:
                    case 'command':
                    case 'menuitem':
                        item = {
                            name: $node.attr('label'),
                            disabled: !!$node.attr('disabled'),
                            callback: (function(){ return function(){ $node.click(); }; })()
                        };
                        break;
                        
                    case 'checkbox':
                        item = {
                            type: 'checkbox',
                            disabled: !!$node.attr('disabled'),
                            name: $node.attr('label'),
                            selected: !!$node.attr('checked')
                        };
                        break;
                        
                    case 'radio':
                        item = {
                            type: 'radio',
                            disabled: !!$node.attr('disabled'),
                            name: $node.attr('label'),
                            radio: $node.attr('radiogroup'),
                            value: $node.attr('id'),
                            selected: !!$node.attr('checked')
                        };
                        break;
                        
                    default:
                        item = undefined;
                }
                break;
 
            case 'hr':
                item = '-------';
                break;
                
            case 'input':
                switch ($node.attr('type')) {
                    case 'text':
                        item = {
                            type: 'text',
                            name: label || inputLabel(node),
                            disabled: !!$node.attr('disabled'),
                            value: $node.val()
                        };
                        break;
                        
                    case 'checkbox':
                        item = {
                            type: 'checkbox',
                            name: label || inputLabel(node),
                            disabled: !!$node.attr('disabled'),
                            selected: !!$node.attr('checked')
                        };
                        break;
                        
                    case 'radio':
                        item = {
                            type: 'radio',
                            name: label || inputLabel(node),
                            disabled: !!$node.attr('disabled'),
                            radio: !!$node.attr('name'),
                            value: $node.val(),
                            selected: !!$node.attr('checked')
                        };
                        break;
                    
                    default:
                        item = undefined;
                        break;
                }
                break;
                
            case 'select':
                item = {
                    type: 'select',
                    name: label || inputLabel(node),
                    disabled: !!$node.attr('disabled'),
                    selected: $node.val(),
                    options: {}
                };
                $node.children().each(function(){
                    item.options[this.value] = $(this).text();
                });
                break;
                
            case 'textarea':
                item = {
                    type: 'textarea',
                    name: label || inputLabel(node),
                    disabled: !!$node.attr('disabled'),
                    value: $node.val()
                };
                break;
            
            case 'label':
                break;
            
            default:
                item = {type: 'html', html: $node.clone(true)};
                break;
        }
        
        if (item) {
            counter++;
            items['key' + counter] = item;
        }
    });
    
    return counter;
}

// convert html5 menu
$.contextMenu.fromMenu = function(element) {
    var $this = $(element),
        items = {};
        
    menuChildren(items, $this.children());
    
    return items;
};

// make defaults accessible
$.contextMenu.defaults = defaults;
$.contextMenu.types = types;
// export internal functions - undocumented, for hacking only!
$.contextMenu.handle = handle;
$.contextMenu.op = op;
$.contextMenu.menus = menus;

})(jQuery);

/*!
 * jQuery UI Position v1.10.0
 * http://jqueryui.com
 *
 * Copyright 2013 jQuery Foundation and other contributors
 * Released under the MIT license.
 * http://jquery.org/license
 *
 * http://api.jqueryui.com/position/
 */
(function( $, undefined ) {

$.ui = $.ui || {};

var cachedScrollbarWidth,
	max = Math.max,
	abs = Math.abs,
	round = Math.round,
	rhorizontal = /left|center|right/,
	rvertical = /top|center|bottom/,
	roffset = /[\+\-]\d+%?/,
	rposition = /^\w+/,
	rpercent = /%$/,
	_position = $.fn.position;

function getOffsets( offsets, width, height ) {
	return [
		parseInt( offsets[ 0 ], 10 ) * ( rpercent.test( offsets[ 0 ] ) ? width / 100 : 1 ),
		parseInt( offsets[ 1 ], 10 ) * ( rpercent.test( offsets[ 1 ] ) ? height / 100 : 1 )
	];
}

function parseCss( element, property ) {
	return parseInt( $.css( element, property ), 10 ) || 0;
}

function getDimensions( elem ) {
	var raw = elem[0];
	if ( raw.nodeType === 9 ) {
		return {
			width: elem.width(),
			height: elem.height(),
			offset: { top: 0, left: 0 }
		};
	}
	if ( $.isWindow( raw ) ) {
		return {
			width: elem.width(),
			height: elem.height(),
			offset: { top: elem.scrollTop(), left: elem.scrollLeft() }
		};
	}
	if ( raw.preventDefault ) {
		return {
			width: 0,
			height: 0,
			offset: { top: raw.pageY, left: raw.pageX }
		};
	}
	return {
		width: elem.outerWidth(),
		height: elem.outerHeight(),
		offset: elem.offset()
	};
}

$.position = {
	scrollbarWidth: function() {
		if ( cachedScrollbarWidth !== undefined ) {
			return cachedScrollbarWidth;
		}
		var w1, w2,
			div = $( "<div style='display:block;width:50px;height:50px;overflow:hidden;'><div style='height:100px;width:auto;'></div></div>" ),
			innerDiv = div.children()[0];

		$( "body" ).append( div );
		w1 = innerDiv.offsetWidth;
		div.css( "overflow", "scroll" );

		w2 = innerDiv.offsetWidth;

		if ( w1 === w2 ) {
			w2 = div[0].clientWidth;
		}

		div.remove();

		return (cachedScrollbarWidth = w1 - w2);
	},
	getScrollInfo: function( within ) {
		var overflowX = within.isWindow ? "" : within.element.css( "overflow-x" ),
			overflowY = within.isWindow ? "" : within.element.css( "overflow-y" ),
			hasOverflowX = overflowX === "scroll" ||
				( overflowX === "auto" && within.width < within.element[0].scrollWidth ),
			hasOverflowY = overflowY === "scroll" ||
				( overflowY === "auto" && within.height < within.element[0].scrollHeight );
		return {
			width: hasOverflowX ? $.position.scrollbarWidth() : 0,
			height: hasOverflowY ? $.position.scrollbarWidth() : 0
		};
	},
	getWithinInfo: function( element ) {
		var withinElement = $( element || window ),
			isWindow = $.isWindow( withinElement[0] );
		return {
			element: withinElement,
			isWindow: isWindow,
			offset: withinElement.offset() || { left: 0, top: 0 },
			scrollLeft: withinElement.scrollLeft(),
			scrollTop: withinElement.scrollTop(),
			width: isWindow ? withinElement.width() : withinElement.outerWidth(),
			height: isWindow ? withinElement.height() : withinElement.outerHeight()
		};
	}
};

$.fn.position = function( options ) {
	if ( !options || !options.of ) {
		return _position.apply( this, arguments );
	}

	// make a copy, we don't want to modify arguments
	options = $.extend( {}, options );

	var atOffset, targetWidth, targetHeight, targetOffset, basePosition, dimensions,
		target = $( options.of ),
		within = $.position.getWithinInfo( options.within ),
		scrollInfo = $.position.getScrollInfo( within ),
		collision = ( options.collision || "flip" ).split( " " ),
		offsets = {};

	dimensions = getDimensions( target );
	if ( target[0].preventDefault ) {
		// force left top to allow flipping
		options.at = "left top";
	}
	targetWidth = dimensions.width;
	targetHeight = dimensions.height;
	targetOffset = dimensions.offset;
	// clone to reuse original targetOffset later
	basePosition = $.extend( {}, targetOffset );

	// force my and at to have valid horizontal and vertical positions
	// if a value is missing or invalid, it will be converted to center
	$.each( [ "my", "at" ], function() {
		var pos = ( options[ this ] || "" ).split( " " ),
			horizontalOffset,
			verticalOffset;

		if ( pos.length === 1) {
			pos = rhorizontal.test( pos[ 0 ] ) ?
				pos.concat( [ "center" ] ) :
				rvertical.test( pos[ 0 ] ) ?
					[ "center" ].concat( pos ) :
					[ "center", "center" ];
		}
		pos[ 0 ] = rhorizontal.test( pos[ 0 ] ) ? pos[ 0 ] : "center";
		pos[ 1 ] = rvertical.test( pos[ 1 ] ) ? pos[ 1 ] : "center";

		// calculate offsets
		horizontalOffset = roffset.exec( pos[ 0 ] );
		verticalOffset = roffset.exec( pos[ 1 ] );
		offsets[ this ] = [
			horizontalOffset ? horizontalOffset[ 0 ] : 0,
			verticalOffset ? verticalOffset[ 0 ] : 0
		];

		// reduce to just the positions without the offsets
		options[ this ] = [
			rposition.exec( pos[ 0 ] )[ 0 ],
			rposition.exec( pos[ 1 ] )[ 0 ]
		];
	});

	// normalize collision option
	if ( collision.length === 1 ) {
		collision[ 1 ] = collision[ 0 ];
	}

	if ( options.at[ 0 ] === "right" ) {
		basePosition.left += targetWidth;
	} else if ( options.at[ 0 ] === "center" ) {
		basePosition.left += targetWidth / 2;
	}

	if ( options.at[ 1 ] === "bottom" ) {
		basePosition.top += targetHeight;
	} else if ( options.at[ 1 ] === "center" ) {
		basePosition.top += targetHeight / 2;
	}

	atOffset = getOffsets( offsets.at, targetWidth, targetHeight );
	basePosition.left += atOffset[ 0 ];
	basePosition.top += atOffset[ 1 ];

	return this.each(function() {
		var collisionPosition, using,
			elem = $( this ),
			elemWidth = elem.outerWidth(),
			elemHeight = elem.outerHeight(),
			marginLeft = parseCss( this, "marginLeft" ),
			marginTop = parseCss( this, "marginTop" ),
			collisionWidth = elemWidth + marginLeft + parseCss( this, "marginRight" ) + scrollInfo.width,
			collisionHeight = elemHeight + marginTop + parseCss( this, "marginBottom" ) + scrollInfo.height,
			position = $.extend( {}, basePosition ),
			myOffset = getOffsets( offsets.my, elem.outerWidth(), elem.outerHeight() );

		if ( options.my[ 0 ] === "right" ) {
			position.left -= elemWidth;
		} else if ( options.my[ 0 ] === "center" ) {
			position.left -= elemWidth / 2;
		}

		if ( options.my[ 1 ] === "bottom" ) {
			position.top -= elemHeight;
		} else if ( options.my[ 1 ] === "center" ) {
			position.top -= elemHeight / 2;
		}

		position.left += myOffset[ 0 ];
		position.top += myOffset[ 1 ];

		// if the browser doesn't support fractions, then round for consistent results
		if ( !$.support.offsetFractions ) {
			position.left = round( position.left );
			position.top = round( position.top );
		}

		collisionPosition = {
			marginLeft: marginLeft,
			marginTop: marginTop
		};

		$.each( [ "left", "top" ], function( i, dir ) {
			if ( $.ui.position[ collision[ i ] ] ) {
				$.ui.position[ collision[ i ] ][ dir ]( position, {
					targetWidth: targetWidth,
					targetHeight: targetHeight,
					elemWidth: elemWidth,
					elemHeight: elemHeight,
					collisionPosition: collisionPosition,
					collisionWidth: collisionWidth,
					collisionHeight: collisionHeight,
					offset: [ atOffset[ 0 ] + myOffset[ 0 ], atOffset [ 1 ] + myOffset[ 1 ] ],
					my: options.my,
					at: options.at,
					within: within,
					elem : elem
				});
			}
		});

		if ( options.using ) {
			// adds feedback as second argument to using callback, if present
			using = function( props ) {
				var left = targetOffset.left - position.left,
					right = left + targetWidth - elemWidth,
					top = targetOffset.top - position.top,
					bottom = top + targetHeight - elemHeight,
					feedback = {
						target: {
							element: target,
							left: targetOffset.left,
							top: targetOffset.top,
							width: targetWidth,
							height: targetHeight
						},
						element: {
							element: elem,
							left: position.left,
							top: position.top,
							width: elemWidth,
							height: elemHeight
						},
						horizontal: right < 0 ? "left" : left > 0 ? "right" : "center",
						vertical: bottom < 0 ? "top" : top > 0 ? "bottom" : "middle"
					};
				if ( targetWidth < elemWidth && abs( left + right ) < targetWidth ) {
					feedback.horizontal = "center";
				}
				if ( targetHeight < elemHeight && abs( top + bottom ) < targetHeight ) {
					feedback.vertical = "middle";
				}
				if ( max( abs( left ), abs( right ) ) > max( abs( top ), abs( bottom ) ) ) {
					feedback.important = "horizontal";
				} else {
					feedback.important = "vertical";
				}
				options.using.call( this, props, feedback );
			};
		}

		elem.offset( $.extend( position, { using: using } ) );
	});
};

$.ui.position = {
	fit: {
		left: function( position, data ) {
			var within = data.within,
				withinOffset = within.isWindow ? within.scrollLeft : within.offset.left,
				outerWidth = within.width,
				collisionPosLeft = position.left - data.collisionPosition.marginLeft,
				overLeft = withinOffset - collisionPosLeft,
				overRight = collisionPosLeft + data.collisionWidth - outerWidth - withinOffset,
				newOverRight;

			// element is wider than within
			if ( data.collisionWidth > outerWidth ) {
				// element is initially over the left side of within
				if ( overLeft > 0 && overRight <= 0 ) {
					newOverRight = position.left + overLeft + data.collisionWidth - outerWidth - withinOffset;
					position.left += overLeft - newOverRight;
				// element is initially over right side of within
				} else if ( overRight > 0 && overLeft <= 0 ) {
					position.left = withinOffset;
				// element is initially over both left and right sides of within
				} else {
					if ( overLeft > overRight ) {
						position.left = withinOffset + outerWidth - data.collisionWidth;
					} else {
						position.left = withinOffset;
					}
				}
			// too far left -> align with left edge
			} else if ( overLeft > 0 ) {
				position.left += overLeft;
			// too far right -> align with right edge
			} else if ( overRight > 0 ) {
				position.left -= overRight;
			// adjust based on position and margin
			} else {
				position.left = max( position.left - collisionPosLeft, position.left );
			}
		},
		top: function( position, data ) {
			var within = data.within,
				withinOffset = within.isWindow ? within.scrollTop : within.offset.top,
				outerHeight = data.within.height,
				collisionPosTop = position.top - data.collisionPosition.marginTop,
				overTop = withinOffset - collisionPosTop,
				overBottom = collisionPosTop + data.collisionHeight - outerHeight - withinOffset,
				newOverBottom;

			// element is taller than within
			if ( data.collisionHeight > outerHeight ) {
				// element is initially over the top of within
				if ( overTop > 0 && overBottom <= 0 ) {
					newOverBottom = position.top + overTop + data.collisionHeight - outerHeight - withinOffset;
					position.top += overTop - newOverBottom;
				// element is initially over bottom of within
				} else if ( overBottom > 0 && overTop <= 0 ) {
					position.top = withinOffset;
				// element is initially over both top and bottom of within
				} else {
					if ( overTop > overBottom ) {
						position.top = withinOffset + outerHeight - data.collisionHeight;
					} else {
						position.top = withinOffset;
					}
				}
			// too far up -> align with top
			} else if ( overTop > 0 ) {
				position.top += overTop;
			// too far down -> align with bottom edge
			} else if ( overBottom > 0 ) {
				position.top -= overBottom;
			// adjust based on position and margin
			} else {
				position.top = max( position.top - collisionPosTop, position.top );
			}
		}
	},
	flip: {
		left: function( position, data ) {
			var within = data.within,
				withinOffset = within.offset.left + within.scrollLeft,
				outerWidth = within.width,
				offsetLeft = within.isWindow ? within.scrollLeft : within.offset.left,
				collisionPosLeft = position.left - data.collisionPosition.marginLeft,
				overLeft = collisionPosLeft - offsetLeft,
				overRight = collisionPosLeft + data.collisionWidth - outerWidth - offsetLeft,
				myOffset = data.my[ 0 ] === "left" ?
					-data.elemWidth :
					data.my[ 0 ] === "right" ?
						data.elemWidth :
						0,
				atOffset = data.at[ 0 ] === "left" ?
					data.targetWidth :
					data.at[ 0 ] === "right" ?
						-data.targetWidth :
						0,
				offset = -2 * data.offset[ 0 ],
				newOverRight,
				newOverLeft;

			if ( overLeft < 0 ) {
				newOverRight = position.left + myOffset + atOffset + offset + data.collisionWidth - outerWidth - withinOffset;
				if ( newOverRight < 0 || newOverRight < abs( overLeft ) ) {
					position.left += myOffset + atOffset + offset;
				}
			}
			else if ( overRight > 0 ) {
				newOverLeft = position.left - data.collisionPosition.marginLeft + myOffset + atOffset + offset - offsetLeft;
				if ( newOverLeft > 0 || abs( newOverLeft ) < overRight ) {
					position.left += myOffset + atOffset + offset;
				}
			}
		},
		top: function( position, data ) {
			var within = data.within,
				withinOffset = within.offset.top + within.scrollTop,
				outerHeight = within.height,
				offsetTop = within.isWindow ? within.scrollTop : within.offset.top,
				collisionPosTop = position.top - data.collisionPosition.marginTop,
				overTop = collisionPosTop - offsetTop,
				overBottom = collisionPosTop + data.collisionHeight - outerHeight - offsetTop,
				top = data.my[ 1 ] === "top",
				myOffset = top ?
					-data.elemHeight :
					data.my[ 1 ] === "bottom" ?
						data.elemHeight :
						0,
				atOffset = data.at[ 1 ] === "top" ?
					data.targetHeight :
					data.at[ 1 ] === "bottom" ?
						-data.targetHeight :
						0,
				offset = -2 * data.offset[ 1 ],
				newOverTop,
				newOverBottom;
			if ( overTop < 0 ) {
				newOverBottom = position.top + myOffset + atOffset + offset + data.collisionHeight - outerHeight - withinOffset;
				if ( ( position.top + myOffset + atOffset + offset) > overTop && ( newOverBottom < 0 || newOverBottom < abs( overTop ) ) ) {
					position.top += myOffset + atOffset + offset;
				}
			}
			else if ( overBottom > 0 ) {
				newOverTop = position.top -  data.collisionPosition.marginTop + myOffset + atOffset + offset - offsetTop;
				if ( ( position.top + myOffset + atOffset + offset) > overBottom && ( newOverTop > 0 || abs( newOverTop ) < overBottom ) ) {
					position.top += myOffset + atOffset + offset;
				}
			}
		}
	},
	flipfit: {
		left: function() {
			$.ui.position.flip.left.apply( this, arguments );
			$.ui.position.fit.left.apply( this, arguments );
		},
		top: function() {
			$.ui.position.flip.top.apply( this, arguments );
			$.ui.position.fit.top.apply( this, arguments );
		}
	}
};

// fraction support test
(function () {
	var testElement, testElementParent, testElementStyle, offsetLeft, i,
		body = document.getElementsByTagName( "body" )[ 0 ],
		div = document.createElement( "div" );

	//Create a "fake body" for testing based on method used in jQuery.support
	testElement = document.createElement( body ? "div" : "body" );
	testElementStyle = {
		visibility: "hidden",
		width: 0,
		height: 0,
		border: 0,
		margin: 0,
		background: "none"
	};
	if ( body ) {
		$.extend( testElementStyle, {
			position: "absolute",
			left: "-1000px",
			top: "-1000px"
		});
	}
	for ( i in testElementStyle ) {
		testElement.style[ i ] = testElementStyle[ i ];
	}
	testElement.appendChild( div );
	testElementParent = body || document.documentElement;
	testElementParent.insertBefore( testElement, testElementParent.firstChild );

	div.style.cssText = "position: absolute; left: 10.7432222px;";

	offsetLeft = $( div ).offset().left;
	$.support.offsetFractions = offsetLeft > 10 && offsetLeft < 11;

	testElement.innerHTML = "";
	testElementParent.removeChild( testElement );
})();

}( jQuery ) );
