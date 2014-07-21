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
  There should only be one instance of this, although it is not enforced.
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

  this.__init();
};

wcDocker.DOCK_FLOAT  = 'float';
wcDocker.DOCK_TOP    = 'top';
wcDocker.DOCK_LEFT   = 'left';
wcDocker.DOCK_RIGHT  = 'right';
wcDocker.DOCK_BOTTOM = 'bottom';

wcDocker.EVENT_CLOSED           = 'closed';
wcDocker.EVENT_ATTACHED         = 'attached';
wcDocker.EVENT_DETACHED         = 'detached';
wcDocker.EVENT_MOVED            = 'moved';
wcDocker.EVENT_RESIZED          = 'resized';
wcDocker.EVENT_SAVE_LAYOUT      = 'save_layout';
wcDocker.EVENT_RESTORE_LAYOUT   = 'restore_layout';

wcDocker.prototype = {
///////////////////////////////////////////////////////////////////////////////////////////////////////
// Public Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

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
        panel.__container(this.$transition);
        panel._panelObject = new this._dockPanelTypeList[i].create(panel);

        if (allowGroup) {
          this.__addPanelGrouped(panel, location, parentPanel);
        } else {
          this.__addPanelAlone(panel, location, parentPanel);
        }
        this.__update();
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

    var parentFrame = panel._parent;
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

        var parentSplitter = parentFrame._parent;
        if (parentSplitter instanceof wcSplitter) {
          parentSplitter.__removeChild(parentFrame);

          var other;
          if (parentSplitter.pane(0)) {
            other = parentSplitter.pane(0);
            parentSplitter._pane[0] = null;
          } else {
            other = parentSplitter.pane(1);
            parentSplitter._pane[1] = null;
          }

          // Keep the panel in a hidden transition container so as to not
          // __destroy any event handlers that may be on it.
          other.__container(this.$transition);
          other._parent = null;

          index = this._splitterList.indexOf(parentSplitter);
          if (index !== -1) {
            this._splitterList.splice(index, 1);
          }

          var parent = parentSplitter._parent;
          parentContainer = parentSplitter.__container();
          parentSplitter.__destroy();

          if (parent instanceof wcSplitter) {
            parent.__removeChild(parentSplitter);
            if (!parent.pane(0)) {
              parent.pane(0, other);
            } else {
              parent.pane(1, other);
            }
          } else if (parent === this) {
            this._root = other;
            other._parent = this;
            other.__container(parentContainer);
          }
          this.__update();
        }
        parentFrame.__destroy();
      }
      panel.__destroy();
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
    if (panel._parent instanceof wcFrame) {
      $elem = panel._parent.$frame;
    }
    var offset = $elem.offset();
    var width  = $elem.width();
    var height = $elem.height();

    var floating = false;
    if (panel._parent instanceof wcFrame) {
      floating = panel._parent._isFloating;
    }

    var parentFrame = panel._parent;
    if (parentFrame instanceof wcFrame) {

      // Remove the panel from the frame.
      for (var i = 0; i < parentFrame._panelList.length; ++i) {
        if (parentFrame._panelList[i] === panel) {
          if (parentFrame._curTab >= i) {
            parentFrame._curTab--;
          }

          // Keep the panel in a hidden transition container so as to not
          // __destroy any event handlers that may be on it.
          panel.__container(this.$transition);
          panel._parent = null;

          parentFrame._panelList.splice(i, 1);
          break;
        }
      }

      if (parentFrame._curTab === -1 && parentFrame._panelList.length) {
        parentFrame._curTab = 0;
      }

      parentFrame.__updateTabs();
      
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

        var parentSplitter = parentFrame._parent;
        if (parentSplitter instanceof wcSplitter) {
          parentSplitter.__removeChild(parentFrame);

          var other;
          if (parentSplitter.pane(0)) {
            other = parentSplitter.pane(0);
            parentSplitter._pane[0] = null;
          } else {
            other = parentSplitter.pane(1);
            parentSplitter._pane[1] = null;
          }

          // Keep the item in a hidden transition container so as to not
          // __destroy any event handlers that may be on it.
          other.__container(this.$transition);
          other._parent = null;

          index = this._splitterList.indexOf(parentSplitter);
          if (index !== -1) {
            this._splitterList.splice(index, 1);
          }

          var parent = parentSplitter._parent;
          parentContainer = parentSplitter.__container();
          parentSplitter.__destroy();

          if (parent instanceof wcSplitter) {
            parent.__removeChild(parentSplitter);
            if (!parent.pane(0)) {
              parent.pane(0, other);
            } else {
              parent.pane(1, other);
            }
          } else if (parent === this) {
            this._root = other;
            other._parent = this;
            other.__container(parentContainer);
          }
          this.__update();
        }
        parentFrame.__destroy();
      }
    }

    panel.size(width, height);
    if (allowGroup) {
      this.__addPanelGrouped(panel, location, parentPanel);
    } else {
      this.__addPanelAlone(panel, location, parentPanel);
    }

    var frame = panel._parent;
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

    this.__update();
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
        panel.__trigger(eventName, data);
      }
    }
  },

  // Retreives the center layout for the window.
  center: function() {
    return this._center.panel();
  },

  // Assigns a basic context menu to a selector element.  The context
  // Menu is a simple list of options, no nesting or special options.
  //
  // If you wish to use a more complex context menu, you can use
  // $.contextMenu directly, see
  // http://medialize.github.io/jQuery-contextMenu/docs.html
  // for more information.
  // Params:
  //    selector      A JQuery selector string that designates the
  //                  elements who use this menu.
  //    itemList      An array with each context menu item in it, each item
  //                  is an object {name:string, callback:function(key, opts)}.
  basicMenu: function(selector, itemList) {
    var items = {};
    for (var i = 0; i < itemList.length; ++i) {
      items[itemList[i].name] = itemList[i];
    }

    $.contextMenu({
      selector: selector,
      animation: {duration: 250, show: 'fadeIn', hide: 'fadeOut'},
      reposition: false,
      autoHide: true,
      zIndex: 200,
      items: items,
    });
  },

  // Saves the current panel configuration into a meta
  // object that can be used later to restore it.
  save: function() {
    var data = {};

    data.floating = [];
    for (var i = 0; i < this._floatingList.length; ++i) {
      data.floating.push(this._floatingList[i].__save());
    }

    data.root = this._root.__save();
    return data;
  },

  // Restores a previously saved configuration.
  restore: function(data) {
    this.clear();

    this._root = this.__create(data.root, this, this.$container);
    this._root.__restore(data.root, this);

    for (var i = 0; i < data.floating.length; ++i) {
      var panel = this.__create(data.floating[i], this, this.$container);
      panel.__restore(data.floating[i], this);
    }

    this.__update();
  },

  // Clears out all panels.
  clear: function() {
    this._root = this._center;

    var parent = this._center._parent;
    if (parent instanceof wcSplitter) {

      if (parent.pane(0) === this._center) {
        parent._pane[0] = null;
      } else {
        parent._pane[1] = null;
      }
    }

    this._center.__container(this.$transition);
    this._center._parent = this;

    for (var i = 0; i < this._splitterList.length; ++i) {
      this._splitterList[i].__destroy();
    }

    for (var i = 0; i < this._frameList.length; ++i) {
      this._frameList[i].__destroy();
    }

    while (this._frameList.length) this._frameList.pop();
    while (this._floatingList.length) this._floatingList.pop();
    while (this._splitterList.length) this._splitterList.pop();
  },


///////////////////////////////////////////////////////////////////////////////////////////////////////
// Private Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

  __init: function() {
    var panel = new wcPanel('');
    panel.closeable(false);
    panel.layout().$elem.addClass('wcCenter');
    panel.size(-1, -1);
    this._center = new wcFrame(this.$container, panel, false, true);
    this._center.$frame.addClass('wcCenter');
    this._center.addPanel(panel);
    this._root = this._center;

    var self = this;
    $(window).resize(self.__resize.bind(self));
    
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
          var rect = myFrame.__rect();
          self._ghost = new wcGhost(rect, mouse);
          myFrame.__checkAnchorDrop(mouse, false, self._ghost, true);
          self._ghost.$ghost.hide();
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
              self.__focus(myFrame, true);
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
                self._ghost.__destroy();
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
    $('body').on('mousedown', '.wcPanelTab', function(event) {
      event.preventDefault();
      event.returnValue = false;
    });

    // Close button on frames should __destroy those panels.
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
        self.__update();
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
          self._draggingFrame.__anchorMove(mouse);

          if ($(event.target).hasClass('wcPanelTab')) {
            self._draggingFrameTab = event.target;
          }

          // If the window is able to be docked, give it a dark __shadow tint and
          // begin the movement process
          if (!self._draggingFrame._isFloating || event.which !== 1 || self._draggingFrameTab) {
            var rect = self._draggingFrame.__rect();
            self._ghost = new wcGhost(rect, mouse);
            self._draggingFrame.__checkAnchorDrop(mouse, true, self._ghost, true);
            // self._draggingFrame.__shadow(true);

            // Also fade out all floating windows as they are not dockable.
            // for (var a = 0; a < self._frameList.length; ++a) {
            //   if (self._frameList[a]._isFloating) {
            //     self._frameList[a].__shadow(true);
            //   }
            // }
          }
          break;
        }
      }
      if (self._draggingFrame) {
        self.__focus(self._draggingFrame);
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
          self.__focus(self._frameList[i]);
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
        self.__focus(self._draggingFrame);
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
        self._draggingSplitter.__moveBar(mouse);
        self._draggingSplitter.__update();
      } else if (self._draggingFrameSizer) {
        var mouse = {
          x: event.clientX,
          y: event.clientY,
        };

        var offset = self.$container.offset();
        mouse.x += offset.left;
        mouse.y += offset.top;

        self._draggingFrame.__resize(self._draggingFrameSizer, mouse);
        self._draggingFrame.__update();
      } else if (self._draggingFrame) {
        var mouse = {
          x: event.clientX,
          y: event.clientY,
        };

        if (self._ghost) {
          self._ghost.__move(mouse);

          var forceFloat = !(self._draggingFrame._isFloating || event.which === 1);
          var found = false;

          // Check anchoring with self.
          if (!self._draggingFrame.__checkAnchorDrop(mouse, true, self._ghost, self._draggingFrame._panelList.length > 1 && self._draggingFrameTab)) {
            self._draggingFrame.__shadow(true);
            if (!forceFloat) {
              for (var i = 0; i < self._frameList.length; ++i) {
                if (self._frameList[i] !== self._draggingFrame) {
                  if (self._frameList[i].__checkAnchorDrop(mouse, false, self._ghost, true)) {
                    // self._draggingFrame.__shadow(true);
                    return;
                  }
                }
              }

              if (self._center.__checkAnchorDrop(mouse, false, self._ghost, true)) {
                // self._draggingFrame.__shadow(true);
                return;
              }
            }

            self._ghost.anchor(mouse, null);
          } else {
            self._draggingFrame.__shadow(false);
            if (self._draggingFrameTab && $(event.target).hasClass('wcPanelTab') &&
                self._draggingFrameTab !== event.target) {
              self._draggingFrameTab = self._draggingFrame.__tabMove(parseInt($(self._draggingFrameTab).attr('id')), parseInt($(event.target).attr('id')));
            }
          }
        } else if (!self._draggingFrameTab) {
          self._draggingFrame.__move(mouse);
          self._draggingFrame.__update();
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
          self._frameList[i].__shadow(false);
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

          var frame = panel._parent;
          if (frame instanceof wcFrame) {
            frame.pos(mouse.x, mouse.y + self._ghost.__rect().h/2 - 10, true);
            frame.panel(index);
          }

          frame._size.x = self._ghost.__rect().w;
          frame._size.y = self._ghost.__rect().h;

          frame.__update();
        } else if (!anchor.self) {
          var index = self._draggingFrame._curTab;
          if (!self._draggingFrameTab) {
            self._draggingFrame.panel(0);
          }
          var panel;
          if (anchor.item) {
            panel = anchor.item._parent;
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
          var frame = panel._parent;
          if (frame instanceof wcFrame) {
            index = index + frame._panelList.length;
          }
          panel = self.movePanel(self._draggingFrame.panel(), anchor.loc, anchor.merge, panel);
          // Dragging the entire frame.
          if (!self._draggingFrameTab) {
            while (self._draggingFrame.panel())
            self.movePanel(self._draggingFrame.panel(), wcDocker.DOCK_BOTTOM, true, panel);
          }

          var frame = panel._parent;
          if (frame instanceof wcFrame) {
            frame.panel(index);
          }
        }
        self._ghost.__destroy();
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
  __update: function() {
    if (this._root) {
      this._root.__update();
    }

    for (var i = 0; i < this._floatingList.length; ++i) {
      this._floatingList[i].__update();
    }
  },

  // On window resized event.
  __resize: function(event) {
    this.__update();
  },

  // Brings a floating window to the top.
  // Params:
  //    frame     The frame to focus.
  //    flash     Whether to flash the frame.
  __focus: function(frame, flash) {
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

    frame.__focus(flash)
  },

  // For restore, creates the appropriate object type.
  __create: function(data, parent, $container) {
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
          frame.__container($container);
          frame._parent = parent;
        }
        return frame;

      case 'wcPanel':
        var panel = new wcPanel(data.panelType);
        panel.__container($container);
        panel._parent = parent;
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
  __addPanelAlone: function(panel, location, parentPanel) {
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
      var parentFrame = parentPanel._parent;
      if (parentFrame instanceof wcFrame) {
        var parentSplitter = parentFrame._parent;
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
      var parent = this._center._parent;
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
        splitter.__findBestPos();
      } else {
        splitter.pane(0, this._center);
        splitter.pane(1, frame);
        splitter.__findBestPos();
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
  __addPanelGrouped: function(panel, location, parentPanel) {
    if (parentPanel) {
      var frame = parentPanel._parent;
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
        this.__addPanelAlone(panel, location);
        return;
      }
      frame.addPanel(panel);
      return;
    }

    var needsHorizontal = location !== wcDocker.DOCK_BOTTOM;

    function ___iterateParents(item) {
      // The last item will always be the center.
      if (item === this._center) {
        this.__addPanelAlone(panel, location);
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
          ___iterateParents.call(this, left);
        } else {
          ___iterateParents.call(this, right);
        }
      }
    };

    ___iterateParents.call(this, this._root);
  },
};
