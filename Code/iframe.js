function wcIFrame(panel, container) {

  this._panel = panel;
  this._layout = panel.layout();

  this.$outer = null;
  this.$game = null;

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
    if (this.$game) {
      this.$game.addClass('ARPG_GameFrameMoving');
    }
  },

  // ---------------------------------------------------------------------------
  onEndDock: function() {
    if (this.$game && this._hasFocus) {
      this.$game.removeClass('ARPG_GameFrameMoving');
    }
  },

  // ---------------------------------------------------------------------------
  onMoveStarted: function() {
    if (this.$game) {
      // Hide the frame while it is moving.
      this.$game.addClass('ARPG_GameFrameMoving');
    }
  },

  // ---------------------------------------------------------------------------
  onMoveFinished: function() {
    if (this.$game && this._hasFocus) {
      this.$game.removeClass('ARPG_GameFrameMoving');
    }
  },

  // --------------------------------------------------------------------------------
  onMoved: function() {
    if (this.$game) {
      // Size, position, and show the frame once the move is finished.
      var pos = this.$outer.offset();
      var width = this.$outer.width();
      var height = this.$outer.height();

      this.$game.css('left', pos.left);
      this.$game.css('top', pos.top);
      this.$game.css('width', width);
      this.$game.css('height', height);
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
    if (ARPG.isPlaytesting()) {
      ARPG.stopPlaytest();
    }
  },

  // --------------------------------------------------------------------------------
  updateFrame: function() {
    if (this.$game) {
      this.$game.toggleClass('ARPG_GameFrameFloating', !this._isAttached);
      if (!this._isAttached) {
        this.$game.toggleClass('ARPG_GameFrameFloatingFocus', this._hasFocus);
      } else {
        this.$game.removeClass('ARPG_GameFrameFloatingFocus');
      }
      this.$game.toggleClass('ARPG_GameHidden', !this._panel.isVisible());
    }
  },

  // --------------------------------------------------------------------------------
  startPlaytest: function(code) {
    this.stopPlaytest();

    this.$game = $('<iframe class="ARPG_GameFrame">');
    this._panel.docker().$container.append(this.$game);
    this.$game[0].srcdoc = code;
    this.onMoved();
    this.$game.toggleClass('ARPG_GameHidden', !this._panel.isVisible());
    this.$game.toggleClass('ARPG_GameFrameFloating', !this._isAttached);
    this.$game.toggleClass('ARPG_GameFrameFloatingFocus', this._hasFocus);

    this._window = this.$game[0].contentWindow || this.$game[0];

    var self = window;
    var win = this._window;

    // Finish up the playtest
    $(this.$game).load(function() {
      win.ARPG.init();
    });

    this.$game[0].focus();
  },

  // --------------------------------------------------------------------------------
  stopPlaytest: function() {
    if (this.$game) {
      this.$game[0].srcdoc = '';
      this.$game.remove();
      this.$game = null;
      this._window = null;
    }
  },

  // --------------------------------------------------------------------------------
  __init: function() {
    this._panel.scrollable(false, false);
    // this._panel.resizeVisible(false);

    this.$outer = $('<div class="wcWide wcTall">');
    this._layout.addItem(this.$outer);

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
