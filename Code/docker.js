/*!
 * Web Cabin Docker - Docking Layout Interface.
 *
 * Dependancies:
 *  JQuery 1.11.1
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


// Provide backward compatibility for IE8 and other such older browsers.
if (!Function.prototype.bind) {
  Function.prototype.bind = function (oThis) {
    if (typeof this !== "function") {
      // closest thing possible to the ECMAScript 5
      // internal IsCallable function
      throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
    }

    var aArgs = Array.prototype.slice.call(arguments, 1), 
        fToBind = this, 
        fNOP = function () {},
        fBound = function () {
          return fToBind.apply(this instanceof fNOP && oThis
                 ? this
                 : oThis,
                 aArgs.concat(Array.prototype.slice.call(arguments)));
        };

    fNOP.prototype = this.prototype;
    fBound.prototype = new fNOP();

    return fBound;
  };
}

if (!Array.prototype.indexOf)
{
  Array.prototype.indexOf = function(elt /*, from*/)
  {
    var len = this.length >>> 0;

    var from = Number(arguments[1]) || 0;
    from = (from < 0)
         ? Math.ceil(from)
         : Math.floor(from);
    if (from < 0)
      from += len;

    for (; from < len; from++)
    {
      if (from in this &&
          this[from] === elt)
        return from;
    }
    return -1;
  };
}

/*
  The main window instance.  This manages all of the docking panels and user input.
  There should only be one instance of this, although it is not enforced.

  options allows overriding default options for docker. The current fields are:
    allowContextMenu: boolean (default true) - Create the right click menu for adding/removing panels.
    hideOnResize: boolean (default false) - If true, panels will hide their content as they are being resized.
*/
function wcDocker(container, options) {
  this.$container = $(container).addClass('wcDocker');
  this.$transition = $('<div class="wcDockerTransition"></div>');
  this.$container.append(this.$transition);

  this._events = {};

  this._root = null;
  this._frameList = [];
  this._floatingList = [];

  this._splitterList = [];

  this._dockPanelTypeList = [];

  this._draggingSplitter = null;
  this._draggingFrame = null;
  this._draggingFrameSizer = null;
  this._draggingFrameTab = null;
  this._ghost = null;
  this._menuTimer = 0;

  this._resizeData = {
    time: -1,
    timeout: false,
    delta: 150,
  };

  this._defaultOptions = {
    allowContextMenu: true
  };

  this._options = {};
  for( var prop in this._defaultOptions ) {
    this._options[prop] = this._defaultOptions[prop];
  }
  for( var prop in options ) {
    this._options[prop] = options[prop];
  }

  this.__init();
};

wcDocker.DOCK_FLOAT             = 'float';
wcDocker.DOCK_TOP               = 'top';
wcDocker.DOCK_LEFT              = 'left';
wcDocker.DOCK_RIGHT             = 'right';
wcDocker.DOCK_BOTTOM            = 'bottom';

wcDocker.EVENT_UPDATED          = 'panelUpdated';
wcDocker.EVENT_CLOSED           = 'panelClosed';
wcDocker.EVENT_BUTTON           = 'panelButton';
wcDocker.EVENT_ATTACHED         = 'panelAttached';
wcDocker.EVENT_DETACHED         = 'panelDetached';
wcDocker.EVENT_MOVE_STARTED     = 'panelMoveStarted';
wcDocker.EVENT_MOVE_ENDED       = 'panelMoveEnded';
wcDocker.EVENT_MOVED            = 'panelMoved';
wcDocker.EVENT_RESIZE_STARTED   = 'panelResizeStarted';
wcDocker.EVENT_RESIZE_ENDED     = 'panelResizeEnded';
wcDocker.EVENT_RESIZED          = 'panelResized';
wcDocker.EVENT_SCROLLED         = 'panelScrolled';
wcDocker.EVENT_SAVE_LAYOUT      = 'layoutSave';
wcDocker.EVENT_RESTORE_LAYOUT   = 'layoutRestore';

wcDocker.ORIENTATION_HORIZONTAL = false;
wcDocker.ORIENTATION_VERTICAL   = true;

wcDocker.prototype = {
///////////////////////////////////////////////////////////////////////////////////////////////////////
// Public Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

  // Registers a new docking panel type to be used later.
  // Params:
  //    name          The name for this new type.
  //    options       An optional object that defines various options
  //                  to initialize the panel with.
  //    createFunc    The function that populates the contents of
  //                  a newly created dock panel of this type.
  //                  Params:
  //                    panel      The dock panel to populate.
  //    isPrivate     If true, this type will not appear to the user
  //                  as a window type to create.
  // Returns:
  //    true        The new type has been added successfully.
  //    false       Failure, the type name already exists.
  registerPanelType: function(name, optionsOrCreateFunc, isPrivate) {

    var options = optionsOrCreateFunc;
    if (typeof options === 'function') {
      options = {
        onCreate: optionsOrCreateFunc,
      };
    }

    if (typeof isPrivate != 'undefined') {
      options.isPrivate = isPrivate;
    }

    if ($.isEmptyObject(options)) {
      options = null;
    }

    for (var i = 0; i < this._dockPanelTypeList.length; ++i) {
      if (this._dockPanelTypeList[i].name === name) {
        return false;
      }
    }

    this._dockPanelTypeList.push({
      name: name,
      options: options,
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
        var panel = new wcPanel(typeName, this._dockPanelTypeList[i].options);
        panel._parent = this;
        panel.__container(this.$transition);
        panel._panelObject = new this._dockPanelTypeList[i].options.onCreate(panel);

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

    // Do not remove if this is the last moveable panel.
    if (this.__isLastPanel(panel)) {
      return false;
    }

    var parentFrame = panel._parent;
    if (parentFrame instanceof wcFrame) {
      panel.__trigger(wcDocker.EVENT_CLOSED);

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
        } else if (parentFrame === this._root) {
          this._root = null;
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
    if (this.__isLastPanel(panel)) {
      return panel;
    }

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

    panel.initSize(width, height);
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

  // Registers an event.
  // Params:
  //    eventType     The event type, as defined by wcDocker.EVENT_...
  //    handler       A handler function to be called for the event.
  //                  Params:
  //                    panel   The panel invoking the event.
  // Returns:
  //    true          The event was added.
  //    false         The event failed to add.
  on: function(eventType, handler) {
    if (!eventType) {
      return false;
    }

    if (!this._events[eventType]) {
      this._events[eventType] = [];
    }

    if (this._events[eventType].indexOf(handler) !== -1) {
      return false;
    }

    this._events[eventType].push(handler);
    return true;
  },

  // Unregisters an event.
  // Params:
  //    eventType     The event type to remove, if omitted, all events are removed.
  //    handler       The handler function to remove, if omitted, all events of
  //                  the above type are removed.
  off: function(eventType, handler) {
    if (typeof eventType === 'undefined') {
      this._events = {};
      return;
    } else {
      if (this._events[eventType]) {
        if (typeof handler === 'undefined') {
          this._events[eventType] = [];
        } else {
          for (var i = 0; i < this._events[eventType].length; ++i) {
            if (this._events[eventType][i] === handler) {
              this._events[eventType].splice(i, 1);
              break;
            }
          }
        }
      }
    }
  },

  // Trigger an event on all panels.
  // Params:
  //    eventName   The name of the event.
  //    data        A custom data parameter to pass to all handlers.
  trigger: function(eventName, data) {
    if (!eventName) {
      return false;
    }

    for (var i = 0; i < this._frameList.length; ++i) {
      var frame = this._frameList[i];
      for (var a = 0; a < frame._panelList.length; ++a) {
        var panel = frame._panelList[a];
        panel.__trigger(eventName, data);
      }
    }

    this.__trigger(eventName, data);
  },

  // Assigns a basic context menu to a selector element.  The context
  // Menu is a simple list of options, no nesting or special options.
  //
  // If you wish to use a more complex context menu, you can use
  // $.contextMenu directly, see
  // http://medialize.github.io/jQuery-contextMenu/docs.html
  // for more information.
  // Params:
  //    selector              A JQuery selector string that designates the
  //                          elements who use this menu.
  //    itemListOrBuildFunc   An array with each context menu item in it, each item
  //                          is an object {name:string, callback:function(key, opts, panel)}.
  //                          This can also be a function that dynamically builds and
  //                          returns the item list, parameters given are the $trigger object
  //                          of the menu and the menu event object.
  //    includeDefault        If true, all default panel menu options will also be shown.
  basicMenu: function(selector, itemListOrBuildFunc, includeDefault) {
    var self = this;
    if (!includeDefault) {
      $.contextMenu({
        selector: selector,
        build: function($trigger, event) {
          var separatorIndex = 0;
          var finalItems = {};
          var itemList = itemListOrBuildFunc;
          if (typeof itemListOrBuildFunc === 'function') {
            itemList = itemListOrBuildFunc($trigger, event);
          }

          for (var i = 0; i < itemList.length; ++i) {
            if ($.isEmptyObject(itemList[i])) {
              finalItems['sep' + separatorIndex++] = "---------";
              continue;
            }

            var callback = itemList[i].callback;
            if (callback) {
              (function(listItem, callback) {
                listItem.callback = function(key, opts) {
                  var panel = null;
                  var $frame = opts.$trigger.parents('.wcFrame').first();
                  if ($frame.length) {
                    for (var a = 0; a < self._frameList.length; ++a) {
                      if ($frame[0] === self._frameList[a].$frame[0]) {
                        panel = self._frameList[a].panel();
                      }
                    }
                  }

                  callback(key, opts, panel);
                };
              })(itemList[i], callback);
            }
            finalItems[itemList[i].name] = itemList[i];
          }

          return {
            animation: {duration: 250, show: 'fadeIn', hide: 'fadeOut'},
            reposition: false,
            autoHide: true,
            zIndex: 200,
            items: finalItems,
          };
        }
      });
    } else {
      $.contextMenu({
        selector: selector,
        build: function($trigger, event) {
          var myFrame;
          for (var i = 0; i < self._frameList.length; ++i) {
            var $frame = $trigger.hasClass('wcFrame') && $trigger || $trigger.parents('.wcFrame');
            if (self._frameList[i].$frame[0] === $frame[0]) {
              myFrame = self._frameList[i];
              break;
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
            if (!type.options.isPrivate) {
              var icon = null;
              var faicon = null;
              if (type.options) {
                if (type.options.faicon) {
                  faicon = type.options.faicon;
                }
                if (type.options.icon) {
                  icon = type.options.icon;
                }
              }
              windowTypes[type.name] = {
                name: type.name,
                icon: icon,
                faicon: faicon,
                className: 'wcMenuCreatePanel',
              };
            }
          }

          var separatorIndex = 0;
          var finalItems = {};
          var itemList = itemListOrBuildFunc;
          if (typeof itemListOrBuildFunc === 'function') {
            itemList = itemListOrBuildFunc($trigger, event);
          }

          for (var i = 0; i < itemList.length; ++i) {
            if ($.isEmptyObject(itemList[i])) {
              finalItems['sep' + separatorIndex++] = "---------";
              continue;
            }

            var callback = itemList[i].callback;
            if (callback) {
              (function(listItem, callback) {
                listItem.callback = function(key, opts) {
                  var panel = null;
                  var $frame = opts.$trigger.parents('.wcFrame').first();
                  if ($frame.length) {
                    for (var a = 0; a < self._frameList.length; ++a) {
                      if ($frame[0] === self._frameList[a].$frame[0]) {
                        panel = self._frameList[a].panel();
                      }
                    }
                  }

                  callback(key, opts, panel);
                };
              })(itemList[i], callback);
            }
            finalItems[itemList[i].name] = itemList[i];
          }

          var items = finalItems;
          if (!$.isEmptyObject(finalItems)) {
            items['sep' + separatorIndex++] = "---------";
          }

          if (isTitle) {
            items['Close Panel'] = {
              name: 'Close Tab',
              faicon: 'close',
              disabled: !myFrame.panel().closeable() || self.__isLastPanel(myFrame.panel()),
            };
            if (!myFrame._isFloating) {
              items['Detach Panel'] = {
                name: 'Detach Tab',
                faicon: 'level-down',
                disabled: !myFrame.panel().moveable() || self.__isLastPanel(myFrame.panel()),
              };
            }

            items['sep' + separatorIndex++] = "---------";
    
            items.fold1 = {
              name: 'Add Tab',
              faicon: 'columns',
              items: windowTypes,
              disabled: !(!myFrame._isFloating && myFrame.panel().moveable()),
              className: 'wcMenuCreatePanel',
            };
            items['sep' + separatorIndex++] = "---------";

            items['Flash Panel'] = {
              name: 'Flash Panel',
              faicon: 'lightbulb-o',
            };
          } else {
            items['Close Panel'] = {
              name: 'Close Panel',
              faicon: 'close',
              disabled: !myFrame.panel().closeable() || self.__isLastPanel(myFrame.panel()),
            };
            if (!myFrame._isFloating) {
              items['Detach Panel'] = {
                name: 'Detach Panel',
                faicon: 'level-down',
                disabled: !myFrame.panel().moveable() || self.__isLastPanel(myFrame.panel()),
              };
            }

            items['sep' + separatorIndex++] = "---------";

            items.fold1 = {
              name: 'Insert Panel',
              faicon: 'columns',
              items: windowTypes,
              disabled: !(!myFrame._isFloating && myFrame.panel().moveable()),
              className: 'wcMenuCreatePanel',
            };
            items['sep' + separatorIndex++] = "---------";

            items['Flash Panel'] = {
              name: 'Flash Panel',
              faicon: 'lightbulb-o',
            };
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
    }
  },

  // Bypasses the next context menu event.
  // Use this during a mouse up event in which you do not want the
  // context menu to appear.
  bypassMenu: function() {
    if (this._menuTimer) {
      clearTimeout(this._menuTimer);
    }

    for (var i in $.contextMenu.menus) {
      var menuSelector = $.contextMenu.menus[i].selector;
      $(menuSelector).contextMenu(false);
    }

    var self = this;
    this._menuTimer = setTimeout(function() {
      for (var i in $.contextMenu.menus) {
        var menuSelector = $.contextMenu.menus[i].selector;
        $(menuSelector).contextMenu(true);
      }
      self._menuTimer = null;
    }, 0);
  },

  // Saves the current panel configuration into a meta
  // string that can be used later to restore it.
  save: function() {
    var data = {};

    data.floating = [];
    for (var i = 0; i < this._floatingList.length; ++i) {
      data.floating.push(this._floatingList[i].__save());
    }

    data.root = this._root.__save();
    
    return JSON.stringify(data, function(key, value) {
      if (value == Infinity) {
        return "Infinity";
      }
      return value;
    });
  },

  // Restores a previously saved configuration.
  restore: function(dataString) {
    var data = JSON.parse(dataString, function(key, value) {
      if (value === 'Infinity') {
        return Infinity;
      }
      return value;
    });

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
    this._root = null;

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
    this._root = null;

    var self = this;
    $(window).resize(self.__resize.bind(self));
    
    // Setup our context menus.
    if ( this._options.allowContextMenu ) {
      this.basicMenu('.wcFrame', [], true);
    }

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

    $('body').on('selectstart', '.wcFrameTitle, .wcPanelTab, .wcFrameButton', function(event) {
      event.preventDefault();
    });

    // Close button on frames should destroy those panels.
    $('body').on('mousedown', '.wcFrame > .wcFrameButton', function() {
      self.$container.addClass('wcDisableSelection');
    });

    $('body').on('click', '.wcFrame > .wcFrameButton', function() {
      self.$container.removeClass('wcDisableSelection');
      var frame;
      for (var i = 0; i < self._frameList.length; ++i) {
        var frame = self._frameList[i];
        if (frame.$close[0] === this) {
          var panel = frame.panel();
          self.removePanel(panel);
          self.__update();
          return;
        }
        if (frame.$tabLeft[0] === this) {
          frame._leftTab--;
          if (frame._leftTab < 0) {
            frame._leftTab = 0;
          }
          frame.__updateTabs();
          return;
        }
        if (frame.$tabRight[0] === this) {
          frame._leftTab++;
          frame.__updateTabs();
          return;
        }

        for (var a = 0; a < frame._buttonList.length; ++a) {
          if (frame._buttonList[a][0] === this) {
            var $button = frame._buttonList[a];
            var result = {
              name: $button.data('name'),
              isToggled: false,
            }

            if ($button.hasClass('wcFrameButtonToggler')) {
              $button.toggleClass('wcFrameButtonToggled');
              if ($button.hasClass('wcFrameButtonToggled')) {
                result.isToggled = true;
              }
            }

            var panel = frame.panel();
            panel.buttonState(result.name, result.isToggled);
            panel.__trigger(wcDocker.EVENT_BUTTON, result);
            return;
          }
        }
      }
    });

    // Middle mouse button on a panel tab to close it.
    $('body').on('mouseup', '.wcPanelTab', function(event) {
      if (event.which !== 2) {
        return;
      }

      var index = parseInt($(this).attr('id'));

      for (var i = 0; i < self._frameList.length; ++i) {
        var frame = self._frameList[i];
        if (frame.$title[0] === $(this).parent()[0]) {
          var panel = frame._panelList[index];
          if (self._removingPanel === panel) {
            self.removePanel(panel);
            self.__update();
          }
          return;
        }
      }
    });

    // Mouse down on a splitter bar will allow you to resize them.
    $('body').on('mousedown', '.wcSplitterBar', function(event) {
      if (event.which !== 1) {
        return true;
      }

      self.$container.addClass('wcDisableSelection');
      for (var i = 0; i < self._splitterList.length; ++i) {
        if (self._splitterList[i].$bar[0] === this) {
          self._draggingSplitter = self._splitterList[i];
          self._draggingSplitter.$pane[0].addClass('wcResizing');
          self._draggingSplitter.$pane[1].addClass('wcResizing');
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
      if ($(event.target).hasClass('wcFrameButton')) {
        return false;
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

          var $panelTab = $(event.target).hasClass('wcPanelTab')? $(event.target): $(event.target).parent('.wcPanelTab');
          if ($panelTab && $panelTab.length) {
            var index = parseInt($panelTab.attr('id'));
            self._draggingFrame.panel(index);
            
            if (event.which === 2) {
              self._draggingFrame = null;
              return;
            }
            self._draggingFrameTab = event.target;
          }

          // If the window is able to be docked, give it a dark shadow tint and
          // begin the movement process
          if (!self._draggingFrame._isFloating || event.which !== 1 || self._draggingFrameTab) {
            var rect = self._draggingFrame.__rect();
            self._ghost = new wcGhost(rect, mouse);
            self._draggingFrame.__checkAnchorDrop(mouse, true, self._ghost, true);
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
        if (self._frameList[i].panel().layout().$elem[0] == this) {
          setTimeout(function() {
            self.__focus(self._frameList[i]);
          }, 10);
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
            }

            self._ghost.anchor(mouse, null);
          } else {
            self._draggingFrame.__shadow(false);
            var $panelTab = $(event.target).hasClass('wcPanelTab')? $(event.target): $(event.target).parent('.wcPanelTab');
            if (self._draggingFrameTab && $panelTab && $panelTab.length && self._draggingFrameTab !== event.target) {
              self._draggingFrameTab = self._draggingFrame.__tabMove(parseInt($(self._draggingFrameTab).attr('id')), parseInt($panelTab.attr('id')));
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

          var mouse = {
            x: event.clientX,
            y: event.clientY,
          };

          if (self._draggingFrameTab || !self.__isLastFrame(self._draggingFrame)) {
            var panel = self.movePanel(self._draggingFrame.panel(), wcDocker.DOCK_FLOAT, false);
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
          }
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
          panel._parent.panel(panel._parent._panelList.length-1, true);
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
        self._ghost = null;
      }

      if ( self._draggingSplitter ) { 
        self._draggingSplitter.$pane[0].removeClass('wcResizing');
        self._draggingSplitter.$pane[1].removeClass('wcResizing');
      }

      self._draggingSplitter = null;
      self._draggingFrame = null;
      self._draggingFrameSizer = null;
      self._draggingFrameTab = null;
      self._removingPanel = null;
      return true;
    });

    // Middle mouse button on a panel tab to close it.
    $('body').on('mousedown', '.wcPanelTab', function(event) {
      if (event.which !== 2) {
        return;
      }

      var index = parseInt($(this).attr('id'));

      for (var i = 0; i < self._frameList.length; ++i) {
        var frame = self._frameList[i];
        if (frame.$title[0] === $(this).parent()[0]) {
          var panel = frame._panelList[index];
          self._removingPanel = panel;
          return;
        }
      }
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
    this._resizeData.time = new Date();
    if (!this._resizeData.timeout) {
      this._resizeData.timeout = true;
      setTimeout(this.__resizeEnd.bind(this), this._resizeData.delta);
      this.__trigger(wcDocker.EVENT_RESIZE_STARTED);
    }
    this.__trigger(wcDocker.EVENT_RESIZED);
    this.__update();
  },

  // On window resize event ended.
  __resizeEnd: function() {
    if (new Date() - this._resizeData.time < this._resizeData.delta) {
      setTimeout(this.__resizeEnd.bind(this), this._resizeData.delta);
    } else {
      this._resizeData.timeout = false;
      this.__trigger(wcDocker.EVENT_RESIZE_ENDED);
    }
  },

  // Brings a floating window to the top.
  // Params:
  //    frame     The frame to focus.
  //    flash     Whether to flash the frame.
  __focus: function(frame, flash) {
    if (frame._isFloating) {
      // frame.$frame.remove();
      for (var i = 0; i < this._floatingList.length; ++i) {
        if (this._floatingList[i].$frame.hasClass('wcFloatingFocus')) {
          this._floatingList[i].$frame.removeClass('wcFloatingFocus');
          if (this._floatingList[i] !== frame) {
            $('body').append(this._floatingList[i].$frame);
          }
          break;
        }
      }

      frame.$frame.addClass('wcFloatingFocus');

      // var posList = [];
      // for (var i = 0; i < frame._panelList.length; ++i) {
      //   posList.push(frame._panelList[i].scroll());
      // }
      // $('body').append(frame.$frame);
      // for (var i = 0; i < posList.length; ++i) {
      //   frame._panelList[i].scroll(posList[i].x, posList[i].y);
      // }
    }

    frame.__focus(flash)
  },

  // Triggers an event exclusively on the docker and none of its panels.
  // Params:
  //    eventName   The name of the event.
  //    data        A custom data parameter to pass to all handlers.
  __trigger: function(eventName, data) {
    if (!eventName) {
      return;
    }

    if (this._events[eventName]) {
      for (var i = 0; i < this._events[eventName].length; ++i) {
        this._events[eventName][i].call(this, data);
      }
    }
  },

  // Checks a given panel to see if it is the final remaining
  // moveable panel in the docker.
  // Params:
  //    panel     The panel.
  // Returns:
  //    true      The panel is the last.
  //    false     The panel is not the last.
  __isLastPanel: function(panel) {
    for (var i = 0; i < this._frameList.length; ++i) {
      var testFrame = this._frameList[i];
      if (testFrame._isFloating) {
        continue;
      }
      for (var a = 0; a < testFrame._panelList.length; ++a) {
        var testPanel = testFrame._panelList[a];
        if (testPanel !== panel && testPanel.moveable()) {
          return false;
        }
      }
    }

    return true;
  },

  // Checks a given frame to see if it is the final remaining
  // moveable frame in the docker.
  // Params:
  //    frame     The frame.
  // Returns:
  //    true      The panel is the last.
  //    false     The panel is not the last.
  __isLastFrame: function(frame) {
    for (var i = 0; i < this._frameList.length; ++i) {
      var testFrame = this._frameList[i];
      if (testFrame._isFloating || testFrame === frame) {
        continue;
      }
      for (var a = 0; a < testFrame._panelList.length; ++a) {
        var testPanel = testFrame._panelList[a];
        if (testPanel.moveable()) {
          return false;
        }
      }
    }

    return true;
  },

  // For restore, creates the appropriate object type.
  __create: function(data, parent, $container) {
    switch (data.type) {
      case 'wcSplitter':
        var splitter = new wcSplitter($container, parent, data.horizontal);
        splitter.scrollable(0, false, false);
        splitter.scrollable(1, false, false);
        return splitter;

      case 'wcFrame':
        var frame = new wcFrame($container, parent, data.floating);
        this._frameList.push(frame);
        if (data.floating) {
          this._floatingList.push(frame);
        }
        return frame;

      case 'wcPanel':
        for (var i = 0; i < this._dockPanelTypeList.length; ++i) {
          if (this._dockPanelTypeList[i].name === data.panelType) {
            var panel = new wcPanel(data.panelType, this._dockPanelTypeList[i].options);
            panel._parent = parent;
            panel.__container(this.$transition);
            panel._panelObject = new this._dockPanelTypeList[i].options.onCreate(panel);
            panel.__container($container);
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
      this.__focus(frame);
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
            splitter.scrollable(0, false, false);
            splitter.scrollable(1, false, false);
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

    var frame = new wcFrame(this.$transition, this, false);
    this._frameList.push(frame);

    if (!this._root) {
      this._root = frame;
      frame.__container(this.$container);
    } else {
      var splitter = new wcSplitter(this.$container, this, location !== wcDocker.DOCK_BOTTOM && location !== wcDocker.DOCK_TOP);
      if (splitter) {
        frame._parent = splitter;
        splitter.scrollable(0, false, false);
        splitter.scrollable(1, false, false);

        if (location === wcDocker.DOCK_LEFT || location === wcDocker.DOCK_TOP) {
          splitter.pane(0, frame);
          splitter.pane(1, this._root);
          splitter.__findBestPos();
        } else {
          splitter.pane(0, this._root);
          splitter.pane(1, frame);
          splitter.__findBestPos();
        }

        this._root = splitter;
      }
    }

    frame.addPanel(panel);
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
      if (item instanceof wcSplitter) {
        var left = item.pane(0);
        var right = item.pane(1);

        // Check if the orientation of the splitter is one that we want.
        if (item.orientation() === needsHorizontal) {
          // Make sure the dock panel is on the proper side.
          if (left instanceof wcFrame && (location === wcDocker.DOCK_LEFT || location === wcDocker.DOCK_TOP)) {
            left.addPanel(panel);
            return true;
          } else if (right instanceof wcFrame && (location === wcDocker.DOCK_RIGHT || location === wcDocker.DOCK_BOTTOM)) {
            right.addPanel(panel);
            return true;
          }

          // This splitter was not valid, continue iterating through parents.
        }

        // If it isn't, iterate to which ever pane is not a dock panel.
        if (!(left instanceof wcFrame)) {
          return ___iterateParents.call(this, left);
        } else {
          return ___iterateParents.call(this, right);
        }
      }
      return false;
    };

    if (!___iterateParents.call(this, this._root)) {
      // If we did not manage to find a place for this panel, last resort is to put it in its own frame.
      this.__addPanelAlone(panel, location);
    }
  },
};
