function wcIFrame(container, panel) {

  this._panel = panel;
  this._layout = panel.layout();

  this.$container = $(container);
  this.$frame = null;

  this._window = null;
  this._isAttached = true;
  this._hasFocus = false;

  this.__init();
};

wcIFrame.prototype = {
  // ---------------------------------------------------------------------------
  onVisibilityChanged: function() {
    this.updateFrame();
  },

  // ---------------------------------------------------------------------------
  onBeginDock: function() {
    if (this.$frame) {
      this.$frame.addClass('wcIFrameMoving');
    }
  },

  // ---------------------------------------------------------------------------
  onEndDock: function() {
    if (this.$frame && this._hasFocus) {
      this.$frame.removeClass('wcIFrameMoving');
    }
  },

  // ---------------------------------------------------------------------------
  onMoveStarted: function() {
    if (this.$frame) {
      // Hide the frame while it is moving.
      this.$frame.addClass('wcIFrameMoving');
    }
  },

  // ---------------------------------------------------------------------------
  onMoveFinished: function() {
    if (this.$frame) {
      this.$frame.removeClass('wcIFrameMoving');
    }
  },

  // --------------------------------------------------------------------------------
  onMoved: function() {
    if (this.$frame) {
      // Size, position, and show the frame once the move is finished.
      var pos = this.$container.offset();
      var width = this.$container.width();
      var height = this.$container.height();

      this.$frame.css('left', pos.left);
      this.$frame.css('top', pos.top);
      this.$frame.css('width', width);
      this.$frame.css('height', height);
    }
  },

  // ---------------------------------------------------------------------------
  onAttached: function() {
    this._isAttached = true;
    this.updateFrame();
  },

  // ---------------------------------------------------------------------------
  onDetached: function() {
    this._isAttached = false;
    this.updateFrame();
  },

  // ---------------------------------------------------------------------------
  onGainFocus: function() {
    this._hasFocus = true;
    this.updateFrame();
  },

  // ---------------------------------------------------------------------------
  onLostFocus: function() {
    this._hasFocus = false;
    this.updateFrame();
  },

  // --------------------------------------------------------------------------------
  onClosed: function() {
    if (this.$frame) {
      this.$frame[0].srcdoc = '';
      this.$frame.remove();
      this.$frame = null;
      this._window = null;
    }
  },

  // --------------------------------------------------------------------------------
  updateFrame: function() {
    if (this.$frame) {
      this.$frame.toggleClass('wcIFrameFloating', !this._isAttached);
      if (!this._isAttached) {
        this.$frame.toggleClass('wcIFrameFloatingFocus', this._hasFocus);
      } else {
        this.$frame.removeClass('wcIFrameFloatingFocus');
      }
      this.$frame.toggleClass('wcIFramePanelHidden', !this._panel.isVisible());
    }
  },

  // --------------------------------------------------------------------------------
  openURL: function(url, crossDomain) {
    this.onClosed();

    this.$frame = $('<iframe class="wcIFrame">');
    this._panel.docker().$container.append(this.$frame);
    this.onMoved();
    this._window = this.$frame[0].contentWindow || this.$frame[0];
    this.updateFrame();

    var URL = url;
    if (crossDomain) {
      URL += '&output=embed';
    }
    this._window.location.replace(URL);
  },

  // --------------------------------------------------------------------------------
  openSRC: function(src) {
    this.onClosed();

    this.$frame = $('<iframe class="wcIFrame">');
    this._panel.docker().$container.append(this.$frame);
    this.onMoved();
    this._window = this.$frame[0].contentWindow || this.$frame[0];
    this.updateFrame();

    // Write the frame source.
    this._window.document.open();
    this._window.document.write(src);
    this._window.document.close();
  },

  // --------------------------------------------------------------------------------
  show: function() {
    if (this.$frame) {
      this.$frame.removeClass('wcIFrameHidden');
    }
  },

  // --------------------------------------------------------------------------------
  hide: function() {
    if (this.$frame) {
      this.$frame.addClass('wcIFrameHidden');
    }
  },

  // --------------------------------------------------------------------------------
  __init: function() {
    this._panel.on(wcDocker.EVENT_VISIBILITY_CHANGED, this.onVisibilityChanged.bind(this));
    this._panel.on(wcDocker.EVENT_BEGIN_DOCK,         this.onBeginDock.bind(this));
    this._panel.on(wcDocker.EVENT_END_DOCK,           this.onEndDock.bind(this));
    this._panel.on(wcDocker.EVENT_MOVE_STARTED,       this.onMoveStarted.bind(this));
    this._panel.on(wcDocker.EVENT_RESIZE_STARTED,     this.onMoveStarted.bind(this));
    this._panel.on(wcDocker.EVENT_MOVE_ENDED,         this.onMoveFinished.bind(this));
    this._panel.on(wcDocker.EVENT_RESIZE_ENDED,       this.onMoveFinished.bind(this));
    this._panel.on(wcDocker.EVENT_MOVED,              this.onMoved.bind(this));
    this._panel.on(wcDocker.EVENT_RESIZED,            this.onMoved.bind(this));
    this._panel.on(wcDocker.EVENT_ATTACHED,           this.onAttached.bind(this));
    this._panel.on(wcDocker.EVENT_DETACHED,           this.onDetached.bind(this));
    this._panel.on(wcDocker.EVENT_GAIN_FOCUS,         this.onGainFocus.bind(this));
    this._panel.on(wcDocker.EVENT_LOST_FOCUS,         this.onLostFocus.bind(this));
    this._panel.on(wcDocker.EVENT_CLOSED,             this.onClosed.bind(this));
  },
};
