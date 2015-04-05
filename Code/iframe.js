/**
 * @class
 * The wcIFrame widget makes it easier to include an iFrame element into your panel.
 * Because an iFrame's contents is cleared whenever it is moved in the DOM heirarchy
 * (and changing a panels docking position causes DOM movement), special care must
 * be taken when using them.<br><br>
 *
 * This will create an iFrame element and place it in a static (non-changing) DOM
 * location. It will then sync its size and position to match the container area of
 * this wcIFrame widget. It works rather well, but has its limitations. Since the
 * iFrame is essentially on top of the window, it can not be only partially hidden.
 * If the wcIFrame container is partially hidden outside the bounds of the panel,
 * the iFrame will not be hidden.
 * {@tutorial 3.0-widgets}
 *
 * @constructor
 * @param {external:jQuery~selector|external:jQuery~Object|external:domNode} container - A container element for this layout.
 * @param {wcLayout|wcSplitter|wcDocker} parent   - The layout's parent object.
 */
function wcIFrame(container, panel) {

  this._panel = panel;
  this._layout = panel.layout();

  this.$container = $(container);
  this.$frame = null;
  this.$focus = null;

  /**
   * The iFrame element.
   * @member {external:jQuery~Object}
   */
  this.$iFrame = null;

  this._window = null;
  this._isAttached = true;
  this._hasFocus = false;
  this._isDocking = false;
  this._isHovering = false;

  this._boundEvents = [];

  this.__init();
};

wcIFrame.prototype = {
///////////////////////////////////////////////////////////////////////////////////////////////////////
// Public Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Retrieves the main [docker]{@link wcDocker} instance.
   *
   * @returns {wcDocker} - The top level docker object.
   */
  docker: function() {
    var parent = this._panel;
    while (parent && !(parent instanceof wcDocker)) {
      parent = parent._parent;
    }
    return parent;
  },

  /**
   * Opens a given URL address into the iFrame.
   *
   * @param {String} url - The full, or relative, path to the page.
   */
  openURL: function(url) {
    this.__clearFrame();

    this.$iFrame = $('<iframe>iFrames not supported on your device!</iframe>');
    this.$frame.prepend(this.$iFrame);

    this.__onMoved();
    this._window = this.$iFrame[0].contentWindow || this.$iFrame[0];
    this.__updateFrame();
    this._window.location.replace(url);

    this.$iFrame[0].focus();
    this.$iFrame.hover(this.__onHoverEnter.bind(this), this.__onHoverExit.bind(this));
  },

  /**
   * Populates the iFrame with the given HTML source code using the document to write data.
   *
   * @param {String} html - The HTML source code.
   */
  openHTML: function(html) {
    this.__clearFrame();

    this.$iFrame = $('<iframe>iFrames not supported on your device!</iframe>');
    this.$frame.prepend(this.$iFrame);

    this.__onMoved();
    this._window = this.$iFrame[0].contentWindow || this.$iFrame[0];
    this.__updateFrame();

    // Write the frame source.
    this._window.document.open();
    this._window.document.write(html);
    this._window.document.close();

    this.$iFrame[0].focus();
    this.$iFrame.hover(this.__onHoverEnter.bind(this), this.__onHoverExit.bind(this));
  },

  /**
   * Populates the iFrame with the given HTML source code using the srcdoc attribute.
   * @version 3.0.0
   *
   * @param {String} html - The HTML source code.
   */
  openSRC: function(html) {
    this.__clearFrame();

    this.$iFrame = $('<iframe>iFrames not supported on your device!</iframe>');
    this.$frame.prepend(this.$iFrame);

    this.__onMoved();
    this._window = this.$iFrame[0].contentWindow || this.$iFrame[0];
    this.__updateFrame();

    // Write the frame source.
    this.$iFrame[0].srcdoc = html;
    this.$iFrame[0].focus();
    this.$iFrame.hover(this.__onHoverEnter.bind(this), this.__onHoverExit.bind(this));
  },

  /**
   * Allows the iFrame to be visible when the panel is visible.
   */
  show: function() {
    if (this.$frame) {
      this.$frame.removeClass('wcIFrameHidden');
    }
  },

  /**
   * Forces the iFrame to be hidden, regardless of whether the panel is visible.
   */
  hide: function() {
    if (this.$frame) {
      this.$frame.addClass('wcIFrameHidden');
    }
  },

  /**
   * Retrieves the window object from the iFrame element.
   *
   * @returns {Object} - The window object.
   */
  window: function() {
    return this._window;
  },

  /**
   * Destroys the iFrame element and clears all references.<br>
   * <b>Note:</b> This is automatically called when the owner panel is destroyed.
   */
  destroy: function() {
    // Remove all registered events.
    while (this._boundEvents.length){
      this._panel.off(this._boundEvents[0].event, this._boundEvents[0].handler);
      this._boundEvents.shift();
    }

    this.__clearFrame();
    this._panel = null;
    this._layout = null;
    this.$container = null;
    this.$frame.remove();
    this.$frame = null;
    this.$focus = null;
  },


///////////////////////////////////////////////////////////////////////////////////////////////////////
// Private Functions
///////////////////////////////////////////////////////////////////////////////////////////////////////

  __init: function() {
    this.$frame = $('<div class="wcIFrame">');
    this.$focus = $('<div class="wcIFrameFocus">');
    this._panel.docker().$container.append(this.$frame);
    this.$frame.append(this.$focus);

    this._boundEvents.push({event: wcDocker.EVENT.VISIBILITY_CHANGED, handler: this.__onVisibilityChanged.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT.BEGIN_DOCK,         handler: this.__onBeginDock.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT.END_DOCK,           handler: this.__onEndDock.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT.MOVE_STARTED,       handler: this.__onMoveStarted.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT.RESIZE_STARTED,     handler: this.__onMoveStarted.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT.MOVE_ENDED,         handler: this.__onMoveFinished.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT.RESIZE_ENDED,       handler: this.__onMoveFinished.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT.MOVED,              handler: this.__onMoved.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT.RESIZED,            handler: this.__onMoved.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT.ATTACHED,           handler: this.__onAttached.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT.DETACHED,           handler: this.__onDetached.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT.GAIN_FOCUS,         handler: this.__onGainFocus.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT.LOST_FOCUS,         handler: this.__onLostFocus.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT.CLOSED,             handler: this.__onClosed.bind(this)});

    for (var i = 0; i < this._boundEvents.length; ++i) {
      this._panel.on(this._boundEvents[i].event, this._boundEvents[i].handler);
    }

    $(window).blur(this.__onBlur.bind(this));
  },

  __clearFrame: function() {
    if (this.$iFrame) {
      this.$iFrame[0].srcdoc = '';
      this.$iFrame.remove();
      this.$iFrame = null;
      this._window = null;
    }
  },

  __updateFrame: function() {
    if (this.$frame && this._panel) {
      this.$frame.toggleClass('wcIFrameFloating', !this._isAttached);
      if (!this._isAttached) {
        this.$frame.toggleClass('wcIFrameFloatingFocus', this._hasFocus);
      } else {
        this.$frame.removeClass('wcIFrameFloatingFocus');
      }
      this.$frame.toggleClass('wcIFramePanelHidden', !this._panel.isVisible());
      if (this._panel._parent instanceof wcFrame) {
        this.$frame.toggleClass('wcDrawer', this._panel._parent.isCollapser());
      }
    }
  },

  __focusFix: function() {
    // Fixes a bug where the frame stops responding to mouse wheel after
    // it has been assigned and unassigned pointer-events: none in css.
    this.$frame.css('left', parseInt(this.$frame.css('left'))+1);
    this.$frame.css('left', parseInt(this.$frame.css('left'))-1);
  },

  __onHoverEnter: function() {
    this._isHovering = true;
  },

  __onHoverExit: function() {
    this._isHovering = false;
  },

  __onBlur: function() {
    if (this._isHovering) {
      this.docker().__focus(this._panel._parent);
    }
  },

  __onVisibilityChanged: function() {
    this.__updateFrame();
  },

  __onBeginDock: function() {
    if (this.$frame) {
      this._isDocking = true;
      this.$frame.addClass('wcIFrameMoving');
    }
  },

  __onEndDock: function() {
    if (this.$frame) {
      this._isDocking = false;
      this.$frame.removeClass('wcIFrameMoving');
      this.__focusFix();
    }
  },

  __onMoveStarted: function() {
    if (this.$frame && !this._isDocking) {
      this.$frame.addClass('wcIFrameMoving');
    }
  },

  __onMoveFinished: function() {
    if (this.$frame && !this._isDocking) {
      this.$frame.removeClass('wcIFrameMoving');
      this.__focusFix();
    }
  },

  __onMoved: function() {
    if (this.$frame && this._panel) {
      // Size, position, and show the frame once the move is finished.
      var dockerPos = this.docker().$container.offset();
      var pos = this.$container.offset();
      var width = this.$container.width();
      var height = this.$container.height();

      this.$frame.css('top', pos.top - dockerPos.top);
      this.$frame.css('left', pos.left - dockerPos.left);
      this.$frame.css('width', width);
      this.$frame.css('height', height);
    }
  },

  __onAttached: function() {
    this._isAttached = true;
    this.__updateFrame();
  },

  __onDetached: function() {
    this._isAttached = false;
    this.__updateFrame();
  },

  __onGainFocus: function() {
    this._hasFocus = true;
    this.__updateFrame();
  },

  __onLostFocus: function() {
    this._hasFocus = false;
    this.__updateFrame();
  },

  __onClosed: function() {
    this.destroy();
  },
};
