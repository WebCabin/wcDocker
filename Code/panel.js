/**
 * @class
 * The public interface for the docking panel, it contains a number of convenience
 * functions and a [layout]{@link wcLayout} that can be filled with a custom arrangement
 * of elements.
 *
 * @constructor
 * @description
 * <b><i>PRIVATE</i> - Use [wcDocker.addPanel]{@link wcDocker#addPanel}, [wcDocker.removePanel]{@link wcDocker#removePanel}, and
 * [wcDocker.movePanel]{@link wcDocker#movePanel} to manage panels, <u>this should never be constructed directly
 * by the user.</u></b>
 * @param {String} type - The name identifier for the panel.
 * @param {wcPanel~options} [options] - An options object passed from registration of the panel.
*/
function wcPanel(type, options) {

  /**
   * An options object for the [panel]{@link wcPanel} constructor.
   * @typedef wcPanel~options
   * @property {String} [icon] - A CSS classname that represents the icon that should display on this panel's tab widget.
   * @property {String} [faicon] - An icon name using the [Font-Awesome]{@link http://fortawesome.github.io/Font-Awesome/} library.
   * @property {String|Boolean} [title] - A custom title to display for this panel, if false, title bar will not be shown.
   */

  /**
   * The outer container element of the panel.
   * @member {external:jQuery~Object}
   */
  this.$container = null;
  this._parent = null;
  this.$icon = null;
  this.$title = null;
  this.$titleText = null;
  this.$loading = null;

  this._panelObject = null;
  this._initialized = false;

  this._type = type;
  this._title = type;
  this._titleVisible = true;

  this._options = options;

  this._layout = null;

  this._buttonList = [];

  this._actualPos = {
    x: 0.5,
    y: 0.5,
  };

  this._actualSize = {
    x: 0,
    y: 0,
  };

  this._resizeData = {
    time: -1,
    timeout: false,
    delta: 150,
  };

  this._pos = {
    x: 0.5,
    y: 0.5,
  };

  this._moveData = {
    time: -1,
    timeout: false,
    delta: 150,
  };

  this._size = {
    x: -1,
    y: -1,
  };

  this._minSize = {
    x: 100,
    y: 100,
  };

  this._maxSize = {
    x: Infinity,
    y: Infinity,
  };

  this._scroll = {
    x: 0,
    y: 0,
  };

  this._scrollable = {
    x: true,
    y: true,
  };

  this._collapsible = true;
  this._overflowVisible = false;
  this._moveable = true;
  this._closeable = true;
  this._resizeVisible = true;
  this._isVisible = false;

  this._events = {};

  this.__init();
};

wcPanel.prototype = {
///////////////////////////////////////////////////////////////////////////////////////////////////////
// Public Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Retrieves the main [docker]{@link wcDocker} instance.
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
   * Gets, or Sets the title for this panel.
   * Titles appear in the tab widget associated with the panel.
   * @param {String|Boolean} title - If supplied, sets the new title. If false, the title bar will be removed.
   * @returns {String|Boolean} - The current title.
   */
  title: function(title) {
    if (typeof title !== 'undefined') {
      if (title === false) {
        this._titleVisible = false;
        this.$titleText.text(this._type);
      } else {
        this._title = title;
        this.$titleText.text(title);
      }

      if (this.$icon) {
        this.$titleText.prepend(this.$icon);
      }
    }

    return this._title;
  },

  /**
   * Retrieves the registration info of the panel as declared from
   * [wcDocker.registerPanelType]{@link wcDocker#registerPanelType};
   * See [wcDocker.panelTypeInfo]{@link wcDocker#panelTypeInfo}.
   * @returns {wcDocker~registerOptions} - Registered options of the panel type.
   */
  info: function() {
    return this.docker().panelTypeInfo(this._type);
  },

  /**
   * Retrieves the panel [layout]{@link wcLayout} instance.
   * @returns {wcLayout} - The layout instance.
   */
  layout: function() {
    return this._layout;
  },

  /**
   * Brings this panel into focus. If it is floating, it will be moved to the front
   * of all other panels.
   * @param {Boolean} [flash] - If true, in addition to bringing the panel into focus, it will also flash for the user.
   */
  focus: function(flash) {
    var docker = this.docker();
    if (docker) {
      docker.__focus(this._parent, flash);
      for (var i = 0; i < this._parent._panelList.length; ++i) {
        if (this._parent._panelList[i] === this) {
          this._parent.panel(i);
          break;
        }
      }
    }
  },

  /**
   * Retrieves whether this panel can be seen by the user.
   * @returns {Boolean} - Visibility state.
   */
  isVisible: function() {
    return this._isVisible;
  },

  /**
   * Creates a new custom button that will appear in the title bar when the panel is active.
   * @param {String} name               - The name of the button, to identify it later.
   * @param {String} className          - A CSS class name to apply to the button.
   * @param {String} text               - Text to apply to the button.
   * @param {String} tip                - Tooltip text for the user.
   * @param {Boolean} [isTogglable]     - If true, will make the button toggle on and off per click.
   * @param {String} [toggleClassName]  - If this button is toggleable, you can designate an optional CSS class name that will replace the original class name.
   */
  addButton: function(name, className, text, tip, isTogglable, toggleClassName) {
    this._buttonList.push({
      name: name,
      className: className,
      toggleClassName: toggleClassName,
      text: text,
      tip: tip,
      isTogglable: isTogglable,
      isToggled: false,
    });

    if (this._parent instanceof wcFrame) {
      this._parent.__update();
    }
  },

  /**
   * Removes a custom button from the panel.
   * @param {String} name - The name identifier for the button to remove.
   * @returns {Boolean} - Success or failure.
   */
  removeButton: function(name) {
    for (var i = 0; i < this._buttonList.length; ++i) {
      if (this._buttonList[i].name === name) {
        this._buttonList.splice(i, 1);
        if (this._parent instanceof wcFrame) {
          this._parent.__onTabChange();
        }

        if (this._parent instanceof wcFrame) {
          this._parent.__update();
        }

        return true;
      }
    }
    return false;
  },

  /**
   * Gets, or Sets the current toggle state of a custom button that was
   * added using [wcPanel.addButton]{@link wcPanel#addButton}.
   * @param {String} name           - The name identifier of the button.
   * @param {Boolean} [toggleState] - If supplied, will assign a new toggle state to the button.
   * @returns {Boolean} - The current toggle state of the button.
   */
  buttonState: function(name, toggleState) {
    for (var i = 0; i < this._buttonList.length; ++i) {
      if (this._buttonList[i].name === name) {
        if (typeof toggleState !== 'undefined') {
          this._buttonList[i].isToggled = toggleState;
          if (this._parent instanceof wcFrame) {
            this._parent.__onTabChange();
          }
        }

        if (this._parent instanceof wcFrame) {
          this._parent.__update();
        }

        return this._buttonList[i].isToggled;
      }
    }
    return false;
  },

  /**
   * Gets, or Sets the default position of the panel if it is floating. <b>Warning: after the panel has been initialized, this value no longer reflects the current position of the panel.</b>
   * @param {Number|String} [x] - If supplied, sets the horizontal position of the floating panel. Can be a percentage position, or a string with a 'px' or '%' suffix.
   * @param {Number|String} [y] - If supplied, sets the vertical position of the floating panel. Can be a percentage position, or a string with a 'px' or '%' suffix.
   * @returns {wcDocker~Coordinate} - The current default position of the panel.
   */
  initPos: function(x, y) {
    if (typeof x !== 'undefined') {
      var docker = this.docker();
      if (docker) {
        this._pos.x = docker.__stringToPercent(x, docker.$container.width());
      } else {
        this._pos.x = x;
      }
    }
    if (typeof y !== 'undefined') {
      var docker = this.docker();
      if (docker) {
        this._pos.y = docker.__stringToPercent(y, docker.$container.height());
      } else {
        this._pos.y = y;
      }
    }

    return {x: this._pos.x, y: this._pos.y};
  },

  /**
   * Gets, or Sets the desired size of the panel. <b>Warning: after the panel has been initialized, this value no longer reflects the current size of the panel.</b>
   * @param {Number|String} [x] - If supplied, sets the desired initial horizontal size of the panel. Can be a pixel position, or a string with a 'px' or '%' suffix.
   * @param {Number|String} [y] - If supplied, sets the desired initial vertical size of the panel. Can be a pixel position, or a string with a 'px' or '%' suffix.
   * @returns {wcDocker~Size} - The current initial size of the panel.
   */
  initSize: function(x, y) {
    if (typeof x !== 'undefined') {
      var docker = this.docker();
      if (docker) {
        this._size.x = docker.__stringToPixel(x, docker.$container.width());
      } else {
        this._size.x = x;
      }
    }
    if (typeof y !== 'undefined') {
      var docker = this.docker();
      if (docker) {
        this._size.y = docker.__stringToPixel(y, docker.$container.height());
      } else {
        this._size.y = y;
      }
    }
    return {x: this._size.x, y: this._size.y};
  },

  /**
   * Gets, or Sets the minimum size constraint of the panel.
   * @param {Number|String} [x] - If supplied, sets the desired minimum horizontal size of the panel. Can be a pixel position, or a string with a 'px' or '%' suffix.
   * @param {Number|String} [y] - If supplied, sets the desired minimum vertical size of the panel. Can be a pixel position, or a string with a 'px' or '%' suffix.
   * @returns {wcDocker~Size} - The current minimum size.
   */
  minSize: function(x, y) {
    if (typeof x !== 'undefined') {
      var docker = this.docker();
      if (docker) {
        this._minSize.x = docker.__stringToPixel(x, docker.$container.width());
      } else {
        this._minSize.x = x;
      }
    }
    if (typeof y !== 'undefined') {
      var docker = this.docker();
      if (docker) {
        this._minSize.y = docker.__stringToPixel(y, docker.$container.height());
      } else {
        this._minSize.y = y;
      }
    }
    return {x: this._minSize.x, y: this._minSize.y};
  },

  /**
   * Gets, or Sets the maximum size constraint of the panel.
   * @param {Number|String} [x] - If supplied, sets the desired maximum horizontal size of the panel. Can be a pixel position, or a string with a 'px' or '%' suffix.
   * @param {Number|String} [y] - If supplied, sets the desired maximum vertical size of the panel. Can be a pixel position, or a string with a 'px' or '%' suffix.
   * @returns {wcDocker~Size} - The current maximum size.
   */
  maxSize: function(x, y) {
    if (typeof x !== 'undefined') {
      var docker = this.docker();
      if (docker) {
        this._maxSize.x = docker.__stringToPixel(x, docker.$container.width());
      } else {
        this._maxSize.x = x;
      }
    }
    if (typeof y !== 'undefined') {
      var docker = this.docker();
      if (docker) {
        this._maxSize.y = docker.__stringToPixel(y, docker.$container.height());
      } else {
        this._maxSize.y = y;
      }
    }
    return {x: this._maxSize.x, y: this._maxSize.y};
  },

  /**
   * Retrieves the width of the panel contents.
   * @returns {Number} - Panel width.
   */
  width: function() {
    if (this.$container) {
      return this.$container.width();
    }
    return 0.0;
  },

  /**
   * Retrieves the height of the panel contents.
   * @returns {Number} - Panel height.
   */
  height: function() {
    if (this.$container) {
      return this.$container.height();
    }
    return 0.0;
  },

  /**
   * Sets the icon for the panel, shown in the panels tab widget.
   * Must be a css class name that contains the icon.
   */
  icon: function(icon) {
    if (!this.$icon) {
      this.$icon = $('<div>');
      this.$titleText.prepend(this.$icon);
    }

    this.$icon.removeClass();
    this.$icon.addClass('wcTabIcon ' + icon);
  },

  /**
   * Sets the icon for the panel, shown in the panels tab widget,
   * to an icon defined from the [Font-Awesome]{@link http://fortawesome.github.io/Font-Awesome/} library.
   */
  faicon: function(icon) {
    if (!this.$icon) {
      this.$icon = $('<div>');
      this.$titleText.prepend(this.$icon);
    }

    this.$icon.removeClass();
    this.$icon.addClass('wcTabIcon fa fa-fw fa-' + icon);
  },

  /**
   * Gets, or Sets whether the window is scrollable.
   * @param {Boolean} [x] - If supplied, assigns whether the window is scrollable in the horizontal direction.
   * @param {Boolean} [y] - If supplied, assigns whether the window is scrollable in the vertical direction.
   * @returns {wcDocker~Scrollable} - The current scrollable status.
   */
  scrollable: function(x, y) {
    if (typeof x !== 'undefined') {
      this._scrollable.x = x? true: false;
      this._scrollable.y = y? true: false;
    }

    return {x: this._scrollable.x, y: this._scrollable.y};
  },

  /**
   * Gets, or Sets the scroll position of the panel's contents if it is scrollable; See [wcPanel.scrollable]{@link wcPanel#scrollable}).
   * @param {Number} [x]        - If supplied, sets the scroll horizontal position of the panel.
   * @param {Number} [y]        - If supplied, sets the scroll vertical position of the panel.
   * @param {Number} [duration] - If supplied, will animate the scroll movement with the supplied duration (in milliseconds).
   * @returns {wcDocker~Coordinate} The current scroll position.
   */
  scroll: function(x, y, duration) {
    if (!this.$container) {
      return {x: 0, y: 0};
    }

    if (typeof x !== 'undefined') {
      if (duration) {
        this.$container.parent().stop().animate({
          scrollLeft: x,
          scrollTop: y,
        }, duration);
      } else {
        this.$container.parent().scrollLeft(x);
        this.$container.parent().scrollTop(y);
      }
    }

    return {
      x: this.$container.parent().scrollLeft(),
      y: this.$container.parent().scrollTop(),
    };
  },

  /**
   * Gets, or Sets whether this panel can be collapsed to the side or bottom.<br>
   * This only works if the collapse feature is enabled {@link wcDocker~Options}.
   * @param {Boolean} [enabled] - If supplied, assigns whether collapsing is enabled.
   * @returns {Boolean} - The current collapsible enabled state.
   */
  collapsible: function(enabled) {
    if (typeof enabled !== 'undefined') {
      this._collapsible = enabled? true: false;
    }

    return this._collapsible;
  },

  /**
   * Gets, or Sets whether overflow on this panel is visible.
   * Use this if a child element within this panel is intended to 'popup' and be visible outside of its parent area.
   * @param {Boolean} [visible] - If supplied, assigns whether overflow is visible.
   * @returns {Boolean} - The current overflow visibility.
   */
  overflowVisible: function(visible) {
    if (typeof visible !== 'undefined') {
      this._overflowVisible = visible? true: false;
    }

    return this._overflowVisible;
  },

  /**
   * Gets, or Sets whether the contents of the panel are visible on resize.
   * Use this if the panel has extremely expensive contents which take a long time to resize.
   * @param {Boolean} [visible] - If supplied, assigns whether panel contents are visible during resize.
   * @returns {Boolean} - The current resize visibility.
   */
  resizeVisible: function(visible) {
    if (typeof visible !== 'undefined') {
      this._resizeVisible = visible? true: false;
    }

    return this._resizeVisible;
  },

  /**
   * Sets, or Gets the moveable status of the window.
   * Note: Other panels can not dock beside a non-moving panel as doing so could cause it to move.
   * @param {Boolean} [enabled] - If supplied, assigns whether this panel can be moved.
   * @returns {Boolean} - Whether the panel is moveable.
   */
  moveable: function(enabled) {
    if (typeof enabled !== 'undefined') {
      this._moveable = enabled? true: false;

      this.$title.toggleClass('wcNotMoveable', !this._moveable);
    }

    return this._moveable;
  },

  /**
   * Gets, or Sets whether this dock window can be closed by the user.
   * Note: The panel can still be closed programmatically.
   * @param {Boolean} [enabled] - If supplied, toggles whether it can be closed.
   * @returns {Boolean} the current closeable status.
   */
  closeable: function(enabled) {
    if (typeof enabled !== 'undefined') {
      this._closeable = enabled? true: false;
      if (this._parent) {
        this._parent.__update();
      }
    }

    return this._closeable;
  },

  /**
   * Forces the window to close.
   */
  close: function() {
    if (this._parent) {
      this._parent.$close.click();
    }
  },

  /**
   * Shows the loading screen.
   * @param {String} [label] - An optional label to display.
   * @param {Boolean} [isSolid] - If true, the loading screen will be fully opaque and none of the background will be visible.
   */
  startLoading: function(label, isSolid) {
    if (!this.$loading) {
      this.$loading = $('<div class="wcLoadingBackground"></div>');
      if (isSolid) {
        this.$loading.addClass('wcLoadingBackgroundSolid');
      }
      this.$container.append(this.$loading);

      var $icon = $('<div class="wcLoadingIconContainer"><i class="wcLoadingIcon ' + this.docker()._options.loadingClass + '"></i></div>');
      this.$loading.append($icon);

      if (label) {
        var $label = $('<span class="wcLoadingLabel">' + label + '</span>');
        this.$loading.append($label);
      }
    }
  },

  /**
   * Hides the loading screen.
   */
  finishLoading: function() {
    if (this.$loading) {
      this.$loading.remove();
      this.$loading = null;
    }
  },

  /**
   * Registers an [event]{@link wcDocker.EVENT} associated with this panel.
   * @param {String} eventType          - The event type, can be a custom event string or a [predefined event]{@link wcDocker.EVENT}.
   * @param {wcDocker~onEvent} handler  - An event handler function to be called when the event is fired.
   * @returns {Boolean} - Event registration success or failure.
   */
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

  /**
   * Unregisters an [event]{@link wcDocker.EVENT} associated with this panel.
   * @param {wcDocker.EVENT} eventType          - The event type, can be a custom event string or a [predefined event]{@link wcDocker.EVENT}.
   * @param {wcDocker~event:onEvent} [handler]  - The handler function registered with the event. If omitted, all events registered to the event type are unregistered.
   */
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

  /**
   * Triggers an [event]{@link wcDocker.EVENT} of a given type to all panels, including itself.
   * @param {wcDocker.EVENT} eventType  - The event type, can be a custom event string or a [predefined event]{@link wcDocker.EVENT}.
   * @param {Object} [data]             - A custom data object to pass into all handlers.
   */
  trigger: function(eventType, data) {
    var docker = this.docker();
    if (docker) {
      docker.trigger(eventType, data);
    }
  },


///////////////////////////////////////////////////////////////////////////////////////////////////////
// Private Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

  // Initialize
  __init: function() {
    this._layout = new wcLayout(this.$container, this);
    this.$title = $('<div class="wcPanelTab">');
    this.$titleText = $('<div>' + this._title + '</div>');
    this.$title.append(this.$titleText);

    if (this._options.hasOwnProperty('title')) {
      this.title(this._options.title);
    }

    if (this._options.icon) {
      this.icon(this._options.icon);
    }
    if (this._options.faicon) {
      this.faicon(this._options.faicon);
    }
  },

  // Updates the size of the layout.
  __update: function() {
    this._layout.__update();
    if (!this.$container) {
      return;
    }

    if ( this._resizeVisible ) {
      this._parent.$frame.removeClass('wcHideOnResize');
    } else {
      this._parent.$frame.addClass('wcHideOnResize');
    }

    if (!this._initialized) {
      this._initialized = true;
      var self = this;
      setTimeout(function() {
        self.__trigger(wcDocker.EVENT.INIT);
      }, 0);
    }

    this.__trigger(wcDocker.EVENT.UPDATED);

    var width   = this.$container.width();
    var height  = this.$container.height();
    if (this._actualSize.x !== width || this._actualSize.y !== height) {
      this._actualSize.x = width;
      this._actualSize.y = height;

      this._resizeData.time = new Date();
      if (!this._resizeData.timeout) {
        this._resizeData.timeout = true;
        setTimeout(this.__resizeEnd.bind(this), this._resizeData.delta);
        this.__trigger(wcDocker.EVENT.RESIZE_STARTED);
      }
      this.__trigger(wcDocker.EVENT.RESIZED);
    }

    var offset  = this.$container.offset();
    if (this._actualPos.x !== offset.left || this._actualPos.y !== offset.top) {
      this._actualPos.x = offset.left;
      this._actualPos.y = offset.top;

      this._moveData.time = new Date();
      if (!this._moveData.timeout) {
        this._moveData.timeout = true;
        setTimeout(this.__moveEnd.bind(this), this._moveData.delta);
        this.__trigger(wcDocker.EVENT.MOVE_STARTED);
      }
      this.__trigger(wcDocker.EVENT.MOVED);
    }
  },

  __resizeEnd: function() {
    if (new Date() - this._resizeData.time < this._resizeData.delta) {
      setTimeout(this.__resizeEnd.bind(this), this._resizeData.delta);
    } else {
      this._resizeData.timeout = false;
      this.__trigger(wcDocker.EVENT.RESIZE_ENDED);
    }
  },

  __moveEnd: function() {
    if (new Date() - this._moveData.time < this._moveData.delta) {
      setTimeout(this.__moveEnd.bind(this), this._moveData.delta);
    } else {
      this._moveData.timeout = false;
      this.__trigger(wcDocker.EVENT.MOVE_ENDED);
    }
  },

  __isVisible: function(inView) {
    if (this._isVisible !== inView) {
      this._isVisible = inView;

      this.__trigger(wcDocker.EVENT.VISIBILITY_CHANGED);
    }
  },

  // Saves the current panel configuration into a meta
  // object that can be used later to restore it.
  __save: function() {
    var data = {};
    data.type = 'wcPanel';
    data.panelType = this._type;
    // data.title = this._title;
    data.size = {
      x: this._size.x,
      y: this._size.y,
    };
    // data.minSize = {
    //   x: this._minSize.x,
    //   y: this._minSize.y,
    // };
    // data.maxSize = {
    //   x: this._maxSize.x,
    //   y: this._maxSize.y,
    // };
    // data.scrollable = {
    //   x: this._scrollable.x,
    //   y: this._scrollable.y,
    // };
    // data.moveable = this._moveable;
    // data.closeable = this._closeable;
    // data.resizeVisible = this.resizeVisible();
    data.customData = {};
    this.__trigger(wcDocker.EVENT.SAVE_LAYOUT, data.customData);
    return data;
  },

  // Restores a previously saved configuration.
  __restore: function(data, docker) {
    // this._title = data.title;
    if (data.size) {
      this._size.x = data.size.x;
      this._size.y = data.size.y;
    }
    // this._minSize.x = data.minSize.x;
    // this._minSize.y = data.minSize.y;
    // this._maxSize.x = data.maxSize.x;
    // this._maxSize.y = data.maxSize.y;
    // this._scrollable.x = data.scrollable.x;
    // this._scrollable.y = data.scrollable.y;
    // this._moveable = data.moveable;
    // this._closeable = data.closeable;
    // this.resizeVisible(data.resizeVisible)
    this.__trigger(wcDocker.EVENT.RESTORE_LAYOUT, data.customData);
  },

  // Triggers an event of a given type onto this current panel.
  // Params:
  //    eventType     The event to trigger.
  //    data          A custom data object to pass into all handlers.
  __trigger: function(eventType, data) {
    if (!eventType) {
      return false;
    }

    if (this._events[eventType]) {
      for (var i = 0; i < this._events[eventType].length; ++i) {
        this._events[eventType][i].call(this, data);
      }
    }
  },

  // Retrieves the bounding rect for this widget.
  __rect: function() {
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
  __container: function($container) {
    if (typeof $container === 'undefined') {
      return this.$container;
    }

    this.$container = $container;
    
    if (this.$container) {
      this._layout.__container(this.$container);
      if (this.$loading) {
        this.$container.append(this.$loading);
      }
    } else {
      this._layout.__container(null);
      this.finishLoading();
    }
    return this.$container;
  },

  // Destroys this panel.
  __destroy: function() {
    this._panelObject = null;
    this.off();

    this.__container(null);
    this._parent = null;
  },
};