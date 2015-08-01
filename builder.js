function wcThemeBuilder(myPanel) {
  this._panel = myPanel;
  this._controls = [];
  this._frames = [];
  this._frameIndex = [];
  this.$activeTheme = null;

  this._borderStyles = ['none', 'dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset', 'initial', 'inherit'];
  this._fontWeights = ['normal', 'bold', 'bolder', 'lighter', '100', '200', '300', '400', '500', '600', '700', '800', '900', 'initial', 'inherit'];

  this.$part = $('<select style="width:100%">');

  this.init();
}

wcThemeBuilder.prototype = {
  clearControls: function() {
    this._frameIndex = [];
    for (var i = this._frames.length-1; i >= 0; --i) {
      this._frameIndex.unshift(this._frames[i].tab());
      this._frames[i].destroy();
    }
    this._frames = [];
  },

  buildControls: function() {
    this.clearControls();

    this._panel.layout().clear();
    this._panel.layout().startBatch();
    this._panel.layout().$table.css('padding', '10px');

    this._panel.layout()._childFrames = [];

    var row = 0;
    for (var i = 0; i < this._controls.length; ++i) {
      var control = this._controls[i];
      if (control.create) {
        control.create.call(this, this._panel.layout(), control, row);
        row += 1;
      }
    }

    var self = this;
    var $pull = $('<button style="width:100%;" title="Pull attributes from the currently active theme.">Pull</button>');
    this._panel.layout().addItem($pull, 0, row).stretch('33%', '');
    $pull.click(function() {
      self.pull(self._controls);
      self.buildControls();
    });

    var $apply = $('<button style="width:100%;" title="Apply these attributes to the theme.">Apply</button>');
    this._panel.layout().addItem($apply, 1, row).stretch('33%', '');
    $apply.click(function() {
      var themeData = self.build();
      self.apply(themeData);
    });

    var $download = $('<button style="width:100%;" title="Download your custom theme.">Download</button>');
    this._panel.layout().addItem($download, 2, row).stretch('33%', '');
    $download.click(function() {
      var themeData = self.build();
      console.log(themeData);
    });

    this._panel.layout().finishBatch();

    // Restore previous tab selections.
    for (var i = 0; i < this._frameIndex.length; ++i) {
      this._frames[i].tab(this._frameIndex[i]);
    }
  },

  addTabFrame: function(layout, control, row) {
    var $tabArea = $('<div style="width:100%;height:100%;"></div>');

    // layout.addItem($tabArea, 0, row, 3).css('height', 'fit');

    var frame = new wcTabFrame($tabArea, this._panel);
    layout._childFrames.push(frame);
    frame.moveable(false);

    if (control.orientation) {
      frame.tabOrientation(control.orientation);
    }

    if (control.stretch) {
      layout.addItem($tabArea, 0, row, 3).stretch('', '100%');
    } else {
      layout.addItem($tabArea, 0, row, 3).css('height', 'auto');
    }

    // Iterate through each tab item.
    for (var i = 0; i < control.controls.length; ++i) {
      var subControl = control.controls[i];
      if (subControl.create) {
        subControl.create.call(this, frame, subControl, 0);
      }
    }

    // Add this tab frame into a list so we can clean it up later.
    this._frames.push(frame);
  },

  addTab: function(frame, control, row) {
    var layout = frame.addTab(control.name);
    layout.$table.css('padding', '10px');
    layout.gridAlternate(true);
    layout.showGrid(true);
    layout._childFrames = [];

    if (!control.scrollable) {
      frame.fitContents(frame.tabCount()-1, false, true);
    }

    layout.startBatch();

    // Iterate through each control within this tab.
    var row = 0;
    for (var i = 0; i < control.controls.length; ++i) {
      var subControl = control.controls[i];
      if (subControl.create) {
        subControl.create.call(this, layout, subControl, row);
        row += 1;
      }
    }

    // Finish out this tab area.
    layout.addItem('<div>', 0, row, 3).stretch('', '100%');
    layout.finishBatch();
  },

  addSpacer: function(layout, control, row) {
    if (control.name) {
      layout.addItem('<div class="wcAttributeSpacerSolid">' + control.name + '</div>', 0, row, 3).stretch('100%', '');
    } else {
      layout.addItem('<div class="wcAttributeSpacer"></div>', 0, row, 3).stretch('100%', '');
    }
  },

  addColorControl: function(layout, control, row) {
    var $activator = null;
    var $label = null;
    var $control = null;
    var self = this;
    
    $label = $('<label class="wcAttributeLabel" title="' + control.info + '">' + control.name + ':</label>');
    layout.addItem($label, 1, row).stretch('1%', '').css('text-align', 'right');

    function __setColor(color) {
      if (color) {
        control.value = color.toRgbString();
      } else {
        control.value = null;
      }
      self.onChanged();
    };

    $control = $('<input style="width:100%;" title="' + control.info + '"/>');
    layout.addItem($control, 2, row).stretch('100%', '');
    $control.spectrum({
      color: control.value,
      showAlpha: true,
      showPalette: true,
      showInput: true,
      showInitial: true,
      allowEmpty: true,
      palette: [
        ["#000","#444","#666","#999","#ccc","#eee","#f3f3f3","#fff"],
        ["#f00","#f90","#ff0","#0f0","#0ff","#00f","#90f","#f0f"],
        ["#f4cccc","#fce5cd","#fff2cc","#d9ead3","#d0e0e3","#cfe2f3","#d9d2e9","#ead1dc"],
        ["#ea9999","#f9cb9c","#ffe599","#b6d7a8","#a2c4c9","#9fc5e8","#b4a7d6","#d5a6bd"],
        ["#e06666","#f6b26b","#ffd966","#93c47d","#76a5af","#6fa8dc","#8e7cc3","#c27ba0"],
        ["#c00","#e69138","#f1c232","#6aa84f","#45818e","#3d85c6","#674ea7","#a64d79"],
        ["#900","#b45f06","#bf9000","#38761d","#134f5c","#0b5394","#351c75","#741b47"],
        ["#600","#783f04","#7f6000","#274e13","#0c343d","#073763","#20124d","#4c1130"]
      ],
      selectionPalette: [],
      maxSelectionSize: 8,
      localStorageKey: "theme.colors",
      clickoutFiresChange: false,
      preferredFormat: 'hex3',
      change: __setColor,
      move:   __setColor,
      hide:   __setColor
    });

    $activator = $('<input type="checkbox" title="' + control.info + '"/>');
    layout.addItem($activator, 0, row).stretch('1%', '');

    $activator.attr('checked', !control.isDisabled);
    $activator.change(function() {
      control.isDisabled = !this.checked;
      $control.spectrum(this.checked? 'enable': 'disable');
      self.onChanged();
    });

    if (control.isDisabled) {
      $control.spectrum('disable');
    }
  },

  addTextControl: function(layout, control, row) {
    var $activator = null;
    var $label = null;
    var $control = null;
    var self = this;
    
    $label = $('<label class="wcAttributeLabel" title="' + control.info + '">' + control.name + ':</label>');
    layout.addItem($label, 1, row).stretch('1%', '').css('text-align', 'right');

    $control = $('<input title="' + control.info + '" type="text"/>');
    layout.addItem($control, 2, row).stretch('100%', '');
    $control.val(control.value);
    $control.change(function() {
      control.value = $(this).val();
      self.onChanged();
    });

    $activator = $('<input type="checkbox" title="' + control.info + '"/>');
    layout.addItem($activator, 0, row).stretch('1%', '');

    $activator.attr('checked', !control.isDisabled);
    $activator.change(function() {
      control.isDisabled = !this.checked;
      $control.attr('disabled', !this.checked);
      self.onChanged();
    });

    if (control.isDisabled) {
      $control.attr('disabled', true);
    }
  },

  addPixelControl: function(layout, control, row) {
    var $activator = null;
    var $label = null;
    var $control = null;
    var self = this;
    
    $label = $('<label class="wcAttributeLabel" title="' + control.info + '">' + control.name + ':</label>');
    layout.addItem($label, 1, row).stretch('1%', '').css('text-align', 'right');

    $control = $('<input title="' + control.info + '" type="number" step="1"/>');
    layout.addItem($control, 2, row).stretch('100%', '');
    $control.val(parseInt(control.value));
    $control.change(function() {
      control.value = $(this).val() + 'px';
      self.onChanged();
    });

    $activator = $('<input type="checkbox" title="' + control.info + '"/>');
    layout.addItem($activator, 0, row).stretch('1%', '');

    $activator.attr('checked', !control.isDisabled);
    $activator.change(function() {
      control.isDisabled = !this.checked;
      $control.attr('disabled', !this.checked);
      self.onChanged();
    });

    if (control.isDisabled) {
      $control.attr('disabled', true);
    }
  },

  addListControl: function(items) {
    return function(layout, control, row) {
      var $activator = null;
      var $label = null;
      var $control = null;
      var self = this;
      
      $label = $('<label class="wcAttributeLabel" title="' + control.info + '">' + control.name + ':</label>');
      layout.addItem($label, 1, row).stretch('1%', '').css('text-align', 'right');

      $control = $('<select title="' + control.info + '"></select>');
      layout.addItem($control, 2, row).stretch('100%', '');

      for (var i = 0; i < items.length; ++i) {
        $control.append($('<option value="' + items[i] + '"' + (control.value === items[i]? ' selected': '') + '>' + items[i] + '</option>'));
      }

      $control.change(function() {
        control.value = $(this).val();
        self.onChanged();
      });

      $activator = $('<input type="checkbox" title="' + control.info + '"/>');
      layout.addItem($activator, 0, row).stretch('1%', '');

      $activator.attr('checked', !control.isDisabled);
      $activator.change(function() {
        control.isDisabled = !this.checked;
        $control.attr('disabled', !this.checked);
        self.onChanged();
      });

      if (control.isDisabled) {
        $control.attr('disabled', true);
      }
    };
  },

  build: function(data, controls) {
    var isRoot = false;
    if (!data) {
      data = {};
      controls = this._controls;
      isRoot = true;
    }

    for (var i = 0; i < controls.length; ++i) {
      var control = controls[i];

      if (control.controls) {
        this.build(data, control.controls);
      }

      if (!control.selector || typeof control.value !== 'string' || control.isDisabled) {
        continue;
      }

      if (!data.hasOwnProperty(control.selector)) {
        data[control.selector] = [];
      }

      var obj = data[control.selector];

      var attrs = control.attribute.split(',');
      for (var a = 0; a < attrs.length; ++a) {
        obj.push({
          key: attrs[a],
          value: control.value,
          important: control.important
        });
      }

      if (control.also) {
        for (var a = 0; a < control.also.length; ++a) {
          var also = control.also[a];
          if (!data.hasOwnProperty(also.selector)) {
            data[also.selector] = [];
          }

          var alsoObj = data[also.selector];
          attrs = also.attribute.split(',');
          for (var b = 0; b < attrs.length; ++b) {
            alsoObj.push({
              key: attrs[b],
              value: control.value
            });
          }
        }
      }
    }

    if (isRoot) {
      var themeData = '';
      for (var selector in data) {
        themeData += selector + ' {\n';
        for (var i = 0; i < data[selector].length; ++i) {
          var item = data[selector][i];
          themeData += '  ' + item.key + ': ' + item.value;
          if (item.important) {
            themeData += ' !important';
          }
          themeData += ';\n';
        }
        themeData += '}\n\n';
      }

      return themeData;
    }
  },

  apply: function(themeData) {
    $('option.custom').show().attr('selected', 'selected');
    $('#wcTheme').remove();
    $('#wcCustomTheme').remove();

    this.$activeTheme = $('<style id="wcCustomTheme"></style>');
    $('head').append(this.$activeTheme);
    this.$activeTheme.text(themeData);

    this._panel.docker().__update();
  },

  pull: function(controls) {
    for (var i = 0; i < controls.length; ++i) {
      var control = controls[i];

      if (control.controls) {
        this.pull(control.controls);
      }

      if (!control.elem) {
        continue;
      }

      var $item = $(control.elem);
      $('body').append($item);
      var attr = control.attribute.split(',')[0];
      control.value = $item.css(attr);
      if (typeof control.value === 'undefined') {
        control.isDisabled = true;
      }
      $item.remove();
    }
  },

  onChanged: function() {
    if (this.$activeTheme && this.$activeTheme.parent().length) {
      var themeData = this.build();
      this.apply(themeData);
    } else {
      this.$activeTheme = null;
    }
  },

  init: function() {
    this.initParts();
    var self = this;
    setTimeout(function() {
      self.pull(self._controls);
      self.buildControls();
    }, 100);

    this._panel.on(wcDocker.EVENT.CLOSED, function() {
      var $customTheme = $('#wcCustomTheme');
      if ($customTheme.length) {
        $('option.custom').hide();
        $('.themeSelector').val('default').change();
        $customTheme.remove();
      }
    });

    this._panel.on(wcDocker.EVENT.CUSTOM_TAB_CHANGED, function(data) {
      data.obj.update();
      var layout = data.obj.layout(data.obj.tab());
      for (var i = 0; i < layout._childFrames.length; ++i) {
        layout._childFrames[i].update();
      }
    });
  },

  initParts: function() {
    this._controls = [{
      // Main tab frame.
      create: this.addTabFrame,
      stretch: true,
      controls: [{
        // -----------------------------------------------------------------------------------------------------------------
        name: 'Main',
        scrollable: true,
        create: this.addTab,
        controls: [{
          name: 'Main',
          create: this.addSpacer
        }, {
          // Font Family
          selector: '.wcDocker',
          elem: '<div class="wcDocker"></div>',
          name: 'Font Family',
          info: 'The font family of standard text',
          create: this.addTextControl,
          attribute: 'font-family',
          value: ''
        }, {
          // Font Weight
          selector: '.wcDocker',
          elem: '<div class="wcDocker"></div>',
          name: 'Font Weight',
          info: 'The font weight of the standard text',
          create: this.addListControl(this._fontWeights),
          attribute: 'font-weight',
          value: ''
        }, {
          // Font Size
          selector: '.wcDocker',
          elem: '<div class="wcDocker"></div>',
          name: 'Font Size',
          info: 'The font size of standard text',
          create: this.addPixelControl,
          attribute: 'font-size',
          value: ''
        }, {
          // Font Color
          selector: '.wcDocker',
          elem: '<div class="wcDocker"></div>',
          name: 'Font Color',
          info: 'The font color of standard text',
          create: this.addColorControl,
          attribute: 'color',
          value: ''
        }, {
          name: '',
          create: this.addSpacer
        }, {
          name: 'Background',
          create: this.addSpacer
        }, {
          // Background Color
          selector: '.wcDocker, .wcPanelBackground',
          elem: '<div class="wcDocker"></div>',
          name: 'Background Color',
          info: 'The background color to use',
          create: this.addColorControl,
          attribute: 'background-color',
          value: ''
        }, {
          // Modal Blocker Color
          selector: '.wcModalBlocker',
          elem: '<div class="wcModalBlocker"></div>',
          name: 'Modal Blocker Color',
          info: 'The color of the fullscreen blocker element that appears when a modal panel is visible',
          create: this.addColorControl,
          attribute: 'background-color',
          value: ''
        }, {
          name: '',
          create: this.addSpacer
        }, {
          name: 'Loading Screen',
          create: this.addSpacer
        }, {
          // Loading Icon Color
          selector: '.wcLoadingIcon',
          elem: '<div class="wcLoadingIcon"></div>',
          name: 'Loading Icon Color',
          info: 'The icon color or the loading screen to use',
          create: this.addColorControl,
          attribute: 'color',
          value: ''
        }, {
          // Loading Label Color
          selector: '.wcLoadingLabel',
          elem: '<div class="wcLoadingLabel"></div>',
          name: 'Loading Label Color',
          info: 'The label color or the loading screen to use',
          create: this.addColorControl,
          attribute: 'color',
          value: ''
        }, {
          // Loading Color
          selector: '.wcLoadingBackground',
          elem: '<div class="wcLoadingBackground"></div>',
          name: 'Loading Screen Color',
          info: 'The background color or the loading screen to use',
          create: this.addColorControl,
          attribute: 'background-color',
          value: ''
        }, {
          name: '',
          create: this.addSpacer
        }, {
          name: 'Ghost',
          create: this.addSpacer
        }, {
          // Ghost Color
          selector: '.wcGhost',
          elem: '<div class="wcGhost"></div>',
          name: 'Ghost Color',
          info: 'The ghost color, this is the overlay that shows where a moving panel is being moved',
          create: this.addColorControl,
          attribute: 'background-color',
          value: ''
        }, {
        //   // Ghost Border Size
        //   selector: '.wcGhost',
        //   elem: '<div class="wcGhost"></div>',
        //   name: 'Ghost Border Size',
        //   info: 'The ghost border size',
        //   create: this.addPixelControl,
        //   attribute: 'border-width',
        //   value: ''
        // }, {
        //   // Ghost Border Style
        //   selector: '.wcGhost',
        //   elem: '<div class="wcGhost"></div>',
        //   name: 'Ghost Border Style',
        //   info: 'The ghost border style',
        //   create: this.addListControl(this._borderStyles),
        //   attribute: 'border-style',
        //   value: ''
        // }, {
        //   // Ghost Border Color
        //   selector: '.wcGhost',
        //   elem: '<div class="wcGhost"></div>',
        //   name: 'Ghost Border Color',
        //   info: 'The ghost border color',
        //   create: this.addColorControl,
        //   attribute: 'border-color',
        //   value: ''
        // }, {
          // Ghost Border Radius
          selector: '.wcGhost',
          elem: '<div class="wcGhost"></div>',
          name: 'Ghost Border Radius',
          info: 'The ghost border radius',
          create: this.addPixelControl,
          attribute: 'border-radius',
          value: ''
        }]
      }, {
        // -----------------------------------------------------------------------------------------------------------------
        name: 'Frames',
        scrollable: true,
        create: this.addTab,
        controls: [{
          name: 'Floating Frames',
          create: this.addSpacer
        }, {
          // Floating Frame Edge Border Color
          selector: '.wcFrameEdge',
          elem: '<div class="wcFrameEdge"></div>',
          name: 'Edge Color',
          info: 'The color of a floating frame',
          create: this.addColorControl,
          attribute: 'background-color',
          value: ''
        }, {
          // Floating Frame Edge Border Color
          selector: '.wcFrameEdge',
          elem: '<div class="wcFrameEdge"></div>',
          name: 'Edge Border Color',
          info: 'The border color of a floating frame',
          create: this.addColorControl,
          attribute: 'border-color',
          value: ''
        }, {
          // Floating Frame Edge Border Size
          selector: '.wcFrameEdge',
          attribute: 'border-width',
          value: '2'
        }, {
          // Floating Frame Edge Border style
          selector: '.wcFrameEdge',
          attribute: 'border-style',
          value: 'solid'
        }, {
          name: '',
          create: this.addSpacer
        }, {
          name: 'Splitter Frames',
          create: this.addSpacer
        }, {
          create: this.addTabFrame,
          controls: [{
            name: 'Moveable Splitter',
            create: this.addTab,
            controls: [{
              name: 'Moveable Splitter',
              create: this.addSpacer
            }, {
              // Splitter Bar Size
              selector: '.wcSplitterBarV',
              elem: '<div class="wcSplitterBarV"></div>',
              name: 'Splitter Size',
              info: 'The size of a splitter bar',
              create: this.addPixelControl,
              attribute: 'width',
              value: '',
              also: [{
                selector: '.wcSplitterBarH',
                attribute: 'height'
              }]
            }, {
              // Splitter Bar Color
              selector: '.wcSplitterBar',
              elem: '<div class="wcSplitterBar"></div>',
              name: 'Splitter Color',
              info: 'The color of a splitter bar',
              create: this.addColorControl,
              attribute: 'background-color',
              value: ''
            }, {
              // Splitter Bar Border Size
              selector: '.wcSplitterBar',
              elem: '<div class="wcSplitterBar"></div>',
              name: 'Splitter Border Size',
              info: 'The border size of a splitter bar',
              create: this.addPixelControl,
              attribute: 'border-width',
              value: ''
            }, {
              // Splitter Bar Border Style
              selector: '.wcSplitterBar',
              elem: '<div class="wcSplitterBar"></div>',
              name: 'Splitter Border Style',
              info: 'The border style of a splitter bar',
              create: this.addListControl(this._borderStyles),
              attribute: 'border-style',
              value: ''
            }, {
              // Splitter Bar Border Color
              selector: '.wcSplitterBar',
              elem: '<div class="wcSplitterBar"></div>',
              name: 'Splitter Border Color',
              info: 'The border color of a splitter bar',
              create: this.addColorControl,
              attribute: 'border-color',
              value: ''
            }]
          }, {
            name: 'Static Splitter',
            create: this.addTab,
            controls: [{
              name: 'Static Splitter',
              create: this.addSpacer
            }, {
              // Static Splitter Bar Size
              selector: '.wcSplitterBar.wcSplitterBarV.wcSplitterBarStatic',
              elem: '<div class="wcSplitterBar wcSplitterBarV wcSplitterBarStatic"></div>',
              name: 'Splitter Size',
              info: 'The size of a static splitter bar',
              create: this.addPixelControl,
              attribute: 'width',
              value: '',
              also: [{
                selector: '.wcSplitterBar.wcSplitterBarH.wcSplitterBarStatic',
                attribute: 'height'
              }]
            }, {
              // Static Splitter Bar Color
              selector: 'wcSplitterBar.wcSplitterBarStatic',
              elem: '<div class="wcSplitterBar wcSplitterBarStatic"></div>',
              name: 'Splitter Color',
              info: 'The color of a static splitter bar',
              create: this.addColorControl,
              attribute: 'background-color',
              value: ''
            }, {
              // Splitter Bar Border Size
              selector: '.wcSplitterBar.wcSplitterBarStatic',
              elem: '<div class="wcSplitterBar wcSplitterBarStatic"></div>',
              name: 'Splitter Border Size',
              info: 'The border size of a static splitter bar',
              create: this.addPixelControl,
              attribute: 'border-width',
              value: ''
            }, {
              // Splitter Bar Border Style
              selector: '.wcSplitterBar.wcSplitterBarStatic',
              elem: '<div class="wcSplitterBar wcSplitterBarStatic"></div>',
              name: 'Splitter Border Style',
              info: 'The border style of a static splitter bar',
              create: this.addListControl(this._borderStyles),
              attribute: 'border-style',
              value: ''
            }, {
              // Splitter Bar Border Color
              selector: '.wcSplitterBar.wcSplitterBarStatic',
              elem: '<div class="wcSplitterBar wcSplitterBarStatic"></div>',
              name: 'Splitter Border Color',
              info: 'The border color of a static splitter bar',
              create: this.addColorControl,
              attribute: 'border-color',
              value: ''
            }]
          }]
        }]
      }, {
        // -----------------------------------------------------------------------------------------------------------------
        name: 'Panels',
        scrollable: true,
        create: this.addTab,
        controls: [{
          name: 'Panels',
          create: this.addSpacer
        }, {
          // Frame Flasher Color
          selector: '.wcFrameFlasher',
          elem: '<div class="wcFrameFlasher"></div>',
          name: 'Panel Flash Color',
          info: 'The color of the panel when it focus flashes.',
          create: this.addColorControl,
          attribute: 'background-color',
          value: ''
        }, {
          // Frame Shadow Color
          selector: '.wcFrameShadower',
          elem: '<div class="wcFrameShadower"></div>',
          name: 'Panel Shadow Color',
          info: 'The color of the panel when it is being moved by the user.',
          create: this.addColorControl,
          attribute: 'background-color',
          value: ''
        }, {
          name: '',
          create: this.addSpacer
        }, {
          name: 'Panel Buttons',
          create: this.addSpacer
        }, {
          create: this.addTabFrame,
          orientation: wcDocker.TAB.TOP,
          controls: [{
            // Panel button normal state
            name: 'Button Normal State',
            create: this.addTab,
            controls: [{
              name: 'Button Normal State',
              create: this.addSpacer
            }, {
              // Panel Button Size
              selector: '.wcFrameButton',
              elem: '<div class="wcFrameButton"></div>',
              name: 'Size',
              info: 'The normal size of a panel button',
              create: this.addPixelControl,
              attribute: 'width,height',
              value: ''
            }, {
              // Panel Button Font Size
              selector: '.wcFrameButton',
              elem: '<div class="wcFrameButton"></div>',
              name: 'Font Size',
              info: 'The normal font size of a panel button',
              create: this.addPixelControl,
              attribute: 'font-size',
              value: ''
            }, {
              // Panel Button Font Weight
              selector: '.wcFrameButton',
              elem: '<div class="wcFrameButton"></div>',
              name: 'Font Weight',
              info: 'The normal font weight of a panel button',
              create: this.addListControl(this._fontWeights),
              attribute: 'font-weight',
              value: ''
            }, {
              // Normal Button Font Color
              selector: '.wcFrameButton',
              elem: '<div class="wcFrameButton"></div>',
              name: 'Font Color',
              info: 'The normal font color of a panel button',
              create: this.addColorControl,
              attribute: 'color',
              value: ''
            }, {
              name: '',
              create: this.addSpacer
            }, {
              // Normal Button Color
              selector: '.wcFrameButton',
              elem: '<div class="wcFrameButton"></div>',
              name: 'Color',
              info: 'The normal color of a panel button',
              create: this.addColorControl,
              attribute: 'background-color',
              value: ''
            }, {
              name: '',
              create: this.addSpacer
            }, {
              // Normal Button Border Size
              selector: '.wcFrameButton',
              elem: '<div class="wcFrameButton"></div>',
              name: 'Border Size',
              info: 'The normal border size of a panel button',
              create: this.addPixelControl,
              attribute: 'border-width',
              value: ''
            }, {
              // Normal Button Border Style
              selector: '.wcFrameButton',
              elem: '<div class="wcFrameButton"></div>',
              name: 'Border Style',
              info: 'The normal border style of a panel button',
              create: this.addListControl(this._borderStyles),
              attribute: 'border-style',
              value: ''
            }, {
              // Normal Button Border Color
              selector: '.wcFrameButton',
              elem: '<div class="wcFrameButton"></div>',
              name: 'Border Color',
              info: 'The normal border color of a panel button',
              create: this.addColorControl,
              attribute: 'border-color',
              value: ''
            }]
          }, {
            // Panel button hover state
            name: 'Button Hover State',
            create: this.addTab,
            controls: [{
              name: 'Button Hover State',
              create: this.addSpacer
            }, {
              // Hover Button Size
              selector: '.wcFrameButton:hover, .wcFrameButtonHover',
              elem: '<div class="wcFrameButton wcFrameButtonHover"></div>',
              name: 'Size',
              info: 'The hover size of a panel button',
              create: this.addPixelControl,
              attribute: 'width,height',
              value: ''
            }, {
              // Hover Button Font Size
              selector: '.wcFrameButton:hover, .wcFrameButtonHover',
              elem: '<div class="wcFrameButton wcFrameButtonHover"></div>',
              name: 'Font Size',
              info: 'The hover font size of a panel button',
              create: this.addPixelControl,
              attribute: 'font-size',
              value: ''
            }, {
              // Hover Button Font Weight
              selector: '.wcFrameButton:hover, .wcFrameButtonHover',
              elem: '<div class="wcFrameButton wcFrameButtonHover"></div>',
              name: 'Font Weight',
              info: 'The hover font weight of a panel button',
              create: this.addListControl(this._fontWeights),
              attribute: 'font-weight',
              value: ''
            }, {
              // Hover Button Font Color
              selector: '.wcFrameButton:hover, .wcFrameButtonHover',
              elem: '<div class="wcFrameButton wcFrameButtonHover"></div>',
              name: 'Font Color',
              info: 'The hover font color of a panel button',
              create: this.addColorControl,
              attribute: 'color',
              value: ''
            }, {
              name: '',
              create: this.addSpacer
            }, {
              // Hover Button Color
              selector: '.wcFrameButton:hover, .wcFrameButtonHover',
              elem: '<div class="wcFrameButton wcFrameButtonHover"></div>',
              name: 'Color',
              info: 'The hover color of a panel button',
              create: this.addColorControl,
              attribute: 'background-color',
              value: ''
            }, {
              name: '',
              create: this.addSpacer
            }, {
              // Hover Button Border Size
              selector: '.wcFrameButton:hover, .wcFrameButtonHover',
              elem: '<div class="wcFrameButton wcFrameButtonHover"></div>',
              name: 'Border Size',
              info: 'The hover border size of a panel button',
              create: this.addPixelControl,
              attribute: 'border-width',
              value: ''
            }, {
              // Hover Button Border Style
              selector: '.wcFrameButton:hover, .wcFrameButtonHover',
              elem: '<div class="wcFrameButton wcFrameButtonHover"></div>',
              name: 'Border Style',
              info: 'The hover border style of a panel button',
              create: this.addListControl(this._borderStyles),
              attribute: 'border-style',
              value: ''
            }, {
              // Hover Button Border Color
              selector: '.wcFrameButton:hover, .wcFrameButtonHover',
              elem: '<div class="wcFrameButton wcFrameButtonHover"></div>',
              name: 'Border Color',
              info: 'The hover border color of a panel button',
              create: this.addColorControl,
              attribute: 'border-color',
              value: ''
            }]
          }, {
            // Panel button active state
            name: 'Button Active State',
            create: this.addTab,
            controls: [{
              name: 'Button Active State',
              create: this.addSpacer
            }, {
              // Active Button Size
              selector: '.wcFrameButton:active, .wcFrameButtonActive',
              elem: '<div class="wcFrameButton wcFrameButtonActive"></div>',
              name: 'Size',
              info: 'The active size of a panel button',
              create: this.addPixelControl,
              attribute: 'width,height',
              value: ''
            }, {
              // Active Button Font Size
              selector: '.wcFrameButton:active, .wcFrameButtonActive',
              elem: '<div class="wcFrameButton wcFrameButtonActive"></div>',
              name: 'Font Size',
              info: 'The active font size of a panel button',
              create: this.addPixelControl,
              attribute: 'font-size',
              value: ''
            }, {
              // Active Button Font Weight
              selector: '.wcFrameButton:active, .wcFrameButtonActive',
              elem: '<div class="wcFrameButton wcFrameButtonActive"></div>',
              name: 'Font Weight',
              info: 'The active font weight of a panel button',
              create: this.addListControl(this._fontWeights),
              attribute: 'font-weight',
              value: ''
            }, {
              // Active Button Font Color
              selector: '.wcFrameButton:active, .wcFrameButtonActive',
              elem: '<div class="wcFrameButton wcFrameButtonActive"></div>',
              name: 'Font Color',
              info: 'The active font color of a panel button',
              create: this.addColorControl,
              attribute: 'color',
              value: ''
            }, {
              name: '',
              create: this.addSpacer
            }, {
              // Active Button Color
              selector: '.wcFrameButton:active, .wcFrameButtonActive',
              elem: '<div class="wcFrameButton wcFrameButtonActive"></div>',
              name: 'Color',
              info: 'The active color of a panel button',
              create: this.addColorControl,
              attribute: 'background-color',
              value: ''
            }, {
              name: '',
              create: this.addSpacer
            }, {
              // Active Button Border Size
              selector: '.wcFrameButton:active, .wcFrameButtonActive',
              elem: '<div class="wcFrameButton wcFrameButtonActive"></div>',
              name: 'Border Size',
              info: 'The active border size of a panel button',
              create: this.addPixelControl,
              attribute: 'border-width',
              value: ''
            }, {
              // Active Button Border Style
              selector: '.wcFrameButton:active, .wcFrameButtonActive',
              elem: '<div class="wcFrameButton wcFrameButtonActive"></div>',
              name: 'Border Style',
              info: 'The active border style of a panel button',
              create: this.addListControl(this._borderStyles),
              attribute: 'border-style',
              value: ''
            }, {
              // Active Button Border Color
              selector: '.wcFrameButton:active, .wcFrameButtonActive',
              elem: '<div class="wcFrameButton wcFrameButtonActive"></div>',
              name: 'Border Color',
              info: 'The active border color of a panel button',
              create: this.addColorControl,
              attribute: 'border-color',
              value: ''
            }]
          }]
        }]
      }, {
        // -----------------------------------------------------------------------------------------------------------------
        name: 'Layout',
        scrollable: true,
        create: this.addTab,
        controls: [{
          name: 'Layout Grid',
          create: this.addSpacer
        }, {
          // Layout grid border width
          selector: '.wcLayoutGrid, .wcLayoutGrid tr, .wcLayoutGrid td',
          elem: '<div class="wcLayoutGrid"></div>',
          name: 'Border Size',
          info: 'When a layout grid is visible, this is the size of the grid lines',
          create: this.addPixelControl,
          attribute: 'border-width',
          value: ''
        }, {
          // Layout grid border style
          selector: '.wcLayoutGrid, .wcLayoutGrid tr, .wcLayoutGrid td',
          elem: '<div class="wcLayoutGrid"></div>',
          name: 'Border Style',
          info: 'When a layout grid is visible, this is the style of the grid lines',
          create: this.addListControl(this._borderStyles),
          attribute: 'border-style',
          value: ''
        }, {
          // Layout grid border color
          selector: '.wcLayoutGrid, .wcLayoutGrid tr, .wcLayoutGrid td',
          elem: '<div class="wcLayoutGrid"></div>',
          name: 'Border Color',
          info: 'When a layout grid is visible, this is the color of the grid lines',
          create: this.addColorControl,
          attribute: 'border-color',
          value: ''
        }, {
          // Layout grid alternate color
          selector: '.wcLayoutGridAlternate tr:nth-child(even), .wcLayoutGridAltColor',
          elem: '<div class="wcLayoutGridAltColor"></div>',
          name: 'Alternate Color',
          info: 'When a layout grid alternate mode is enabled, this is the color to use for each alternate row',
          create: this.addColorControl,
          attribute: 'background-color',
          value: '',
          important: true
        }]
      }, {
        // -----------------------------------------------------------------------------------------------------------------
        name: 'Tabs',
        scrollable: true,
        create: this.addTab,
        controls: [{
          name: 'Tab Bar',
          create: this.addSpacer
        }, {
          // Tab bar height
          selector: '.wcFrameTitleBar',
          elem: '<div class="wcFrameTitleBar"></div>',
          name: 'Size',
          info: 'The size of the tab bar.',
          create: this.addPixelControl,
          attribute: 'height',
          value: '',
          also: [{
            selector: '.wcFrameCenter',
            attribute: 'top'
          }]
        }, {
          // Tab bar top offset
          selector: '.wcFrameTitle',
          elem: '<div class="wcFrameTitle"></div>',
          name: 'Top Offset',
          info: 'The top offset of the tab bar',
          create: this.addPixelControl,
          attribute: 'padding-top',
          value: ''
        }, {
          // Tab bar color
          selector: '.wcFrameTitleBar',
          elem: '<div class="wcFrameTitleBar"></div>',
          name: 'Background Color',
          info: 'The color of the tab bar',
          create: this.addColorControl,
          attribute: 'background-color',
          value: ''
        }, {
          name: '',
          create: this.addSpacer
        }, {
          // Tab bar font size
          selector: '.wcFrameTitle',
          elem: '<div class="wcFrameTitle"></div>',
          name: 'Font Size',
          info: 'The font size of the tab bar',
          create: this.addPixelControl,
          attribute: 'font-size',
          value: ''
        }, {
          // Tab bar Font Weight
          selector: '.wcFrameTitle',
          elem: '<div class="wcFrameTitle"></div>',
          name: 'Font Weight',
          info: 'The font weight of a tab bar',
          create: this.addListControl(this._fontWeights),
          attribute: 'font-weight',
          value: ''
        }, {
          // Hidden tab bar bold font weight
          selector: '.wcFrameTitle',
          attribute: 'font-weight',
          value: 'bold'
        }, {
          // Hidden tab bar center text
          selector: '.wcFrameTitle',
          attribute: 'text-align',
          value: 'center'
        }, {
          // Tab bar font color
          selector: '.wcFrameTitle',
          elem: '<div class="wcFrameTitle"></div>',
          name: 'Font Color',
          info: 'The color of the tab bar',
          create: this.addColorControl,
          attribute: 'color',
          value: ''
        }, {
          name: '',
          create: this.addSpacer
        }, {
          name: 'Tab Items',
          create: this.addSpacer
        }, {
          create: this.addTabFrame,
          controls: [{
            name: 'Tab Normal State',
            create: this.addTab,
            controls: [{
              name: 'Tab Normal State',
              create: this.addSpacer
            }, {
              // Normal tab item Font Size
              selector: '.wcPanelTab',
              elem: '<div class="wcPanelTab"></div>',
              name: 'Font Size',
              info: 'The normal font size of a tab item',
              create: this.addPixelControl,
              attribute: 'font-size',
              value: ''
            }, {
              // Normal Tab Font Weight
              selector: '.wcPanelTab',
              elem: '<div class="wcPanelTab"></div>',
              name: 'Font Weight',
              info: 'The normal font weight of a tab item',
              create: this.addListControl(this._fontWeights),
              attribute: 'font-weight',
              value: ''
            }, {
              // Normal tab item Font Color
              selector: '.wcPanelTab',
              elem: '<div class="wcPanelTab"></div>',
              name: 'Font Color',
              info: 'The normal font color of a tab item',
              create: this.addColorControl,
              attribute: 'color',
              value: ''
            }, {
              // Normal tab item text padding
              selector: '.wcPanelTab',
              elem: '<div class="wcPanelTab"></div>',
              name: 'Text Padding',
              info: 'The normal padding between text and tab border',
              create: this.addPixelControl,
              attribute: 'padding-left,padding-right',
              value: ''
            }, {
              name: '',
              create: this.addSpacer
            }, {
              // Normal tab item top padding
              selector: '.wcPanelTab',
              elem: '<div class="wcPanelTab"></div>',
              name: 'Top Offset',
              info: 'The normal top offset of a tab item',
              create: this.addPixelControl,
              attribute: 'margin-top',
              value: ''
            }, {
              // Normal tab item spacing
              selector: '.wcPanelTab',
              elem: '<div class="wcPanelTab"></div>',
              name: 'Spacing',
              info: 'The normal spacing between tab items',
              create: this.addPixelControl,
              attribute: 'margin-right',
              value: ''
            }, {
              // Normal tab item color
              selector: '.wcPanelTab',
              elem: '<div class="wcPanelTab"></div>',
              name: 'Color',
              info: 'The normal color of a tab item',
              create: this.addColorControl,
              attribute: 'background-color',
              value: ''
            }, {
              name: '',
              create: this.addSpacer
            }, {
              // Normal tab item border size
              selector: '.wcPanelTab',
              elem: '<div class="wcPanelTab"></div>',
              name: 'Border Size',
              info: 'The normal border size of a tab item',
              create: this.addPixelControl,
              attribute: 'border-width',
              value: ''
            }, {
              // Normal tab item border style
              selector: '.wcPanelTab',
              elem: '<div class="wcPanelTab"></div>',
              name: 'Border Style',
              info: 'The normal border style of a tab item',
              create: this.addListControl(this._borderStyles),
              attribute: 'border-style',
              value: ''
            }, {
              // Normal tab item border radius
              selector: '.wcPanelTab',
              elem: '<div class="wcPanelTab"></div>',
              name: 'Border Radius',
              info: 'The normal border radius of a tab item',
              create: this.addPixelControl,
              attribute: 'border-top-left-radius,border-top-right-radius',
              value: ''
            }, {
              // Normal tab item border color
              selector: '.wcPanelTab',
              elem: '<div class="wcPanelTab"></div>',
              name: 'Border Color',
              info: 'The normal border color of a tab item',
              create: this.addColorControl,
              attribute: 'border-color',
              value: ''
            }]
          }, {
            name: 'Tab Hover State',
            create: this.addTab,
            controls: [{
              name: 'Tab Hover State',
              create: this.addSpacer
            }, {
              // Hover tab item Font Size
              selector: '.wcPanelTab:hover, .wcPanelTabHover',
              elem: '<div class="wcPanelTab wcPanelTabHover"></div>',
              name: 'Font Size',
              info: 'The hover font size of a tab item',
              create: this.addPixelControl,
              attribute: 'font-size',
              value: ''
            }, {
              // Hover Tab Font Weight
              selector: '.wcPanelTab:hover, .wcPanelTabHover',
              elem: '<div class="wcPanelTab wcPanelTabHover"></div>',
              name: 'Font Weight',
              info: 'The hover font weight of a tab item',
              create: this.addListControl(this._fontWeights),
              attribute: 'font-weight',
              value: ''
            }, {
              // Hover tab item Font Color
              selector: '.wcPanelTab:hover, .wcPanelTabHover',
              elem: '<div class="wcPanelTab wcPanelTabHover"></div>',
              name: 'Font Color',
              info: 'The hover font color of a tab item',
              create: this.addColorControl,
              attribute: 'color',
              value: ''
            }, {
              // Hover tab item text padding
              selector: '.wcPanelTab:hover, .wcPanelTabHover',
              elem: '<div class="wcPanelTab wcPanelTabHover"></div>',
              name: 'Text Padding',
              info: 'The hover padding between text and tab border',
              create: this.addPixelControl,
              attribute: 'padding-left,padding-right',
              value: ''
            }, {
              name: '',
              create: this.addSpacer
            }, {
              // Hover tab item top padding
              selector: '.wcPanelTab:hover, .wcPanelTabHover',
              elem: '<div class="wcPanelTab wcPanelTabHover"></div>',
              name: 'Top Offset',
              info: 'The hover top offset of a tab item',
              create: this.addPixelControl,
              attribute: 'margin-top',
              value: ''
            }, {
              // Hover tab item spacing
              selector: '.wcPanelTab:hover, .wcPanelTabHover',
              elem: '<div class="wcPanelTab wcPanelTabHover"></div>',
              name: 'Spacing',
              info: 'The hover spacing between tab items',
              create: this.addPixelControl,
              attribute: 'margin-right',
              value: ''
            }, {
              // Hover tab item color
              selector: '.wcPanelTab:hover, .wcPanelTabHover',
              elem: '<div class="wcPanelTab wcPanelTabHover"></div>',
              name: 'Color',
              info: 'The hover color of a tab item',
              create: this.addColorControl,
              attribute: 'background-color',
              value: ''
            }, {
              name: '',
              create: this.addSpacer
            }, {
              // Hover tab item border size
              selector: '.wcPanelTab:hover, .wcPanelTabHover',
              elem: '<div class="wcPanelTab wcPanelTabHover"></div>',
              name: 'Border Size',
              info: 'The hover border size of a tab item',
              create: this.addPixelControl,
              attribute: 'border-width',
              value: ''
            }, {
              // Hover tab item border style
              selector: '.wcPanelTab:hover, .wcPanelTabHover',
              elem: '<div class="wcPanelTab wcPanelTabHover"></div>',
              name: 'Border Style',
              info: 'The hover border style of a tab item',
              create: this.addListControl(this._borderStyles),
              attribute: 'border-style',
              value: ''
            }, {
              // Hover tab item border radius
              selector: '.wcPanelTab:hover, .wcPanelTabHover',
              elem: '<div class="wcPanelTab wcPanelTabHover"></div>',
              name: 'Border Radius',
              info: 'The hover border radius of a tab item',
              create: this.addPixelControl,
              attribute: 'border-top-left-radius,border-top-right-radius',
              value: ''
            }, {
              // Hover tab item border color
              selector: '.wcPanelTab:hover, .wcPanelTabHover',
              elem: '<div class="wcPanelTab wcPanelTabHover"></div>',
              name: 'Border Color',
              info: 'The hover border color of a tab item',
              create: this.addColorControl,
              attribute: 'border-color',
              value: ''
            }]
          }, {
            name: 'Tab Active State',
            create: this.addTab,
            controls: [{
              name: 'Tab Active State',
              create: this.addSpacer
            }, {
              // Active tab item Font Size
              selector: '.wcPanelTabActive',
              elem: '<div class="wcPanelTab wcPanelTabActive"></div>',
              name: 'Font Size',
              info: 'The active font size of a tab item',
              create: this.addPixelControl,
              attribute: 'font-size',
              value: ''
            }, {
              // Active Tab Font Weight
              selector: '.wcPanelTabActive',
              elem: '<div class="wcPanelTab wcPanelTabActive"></div>',
              name: 'Font Weight',
              info: 'The active font weight of a tab item',
              create: this.addListControl(this._fontWeights),
              attribute: 'font-weight',
              value: ''
            }, {
              // Active tab item Font Color
              selector: '.wcPanelTabActive',
              elem: '<div class="wcPanelTab wcPanelTabActive"></div>',
              name: 'Font Color',
              info: 'The active font color of a tab item',
              create: this.addColorControl,
              attribute: 'color',
              value: ''
            }, {
              // Active tab item text padding
              selector: '.wcPanelTabActive',
              elem: '<div class="wcPanelTab wcPanelTabActive"></div>',
              name: 'Text Padding',
              info: 'The active padding between text and tab border',
              create: this.addPixelControl,
              attribute: 'padding-left,padding-right',
              value: ''
            }, {
              name: '',
              create: this.addSpacer
            }, {
              // Active tab item top padding
              selector: '.wcPanelTabActive',
              elem: '<div class="wcPanelTab wcPanelTabActive"></div>',
              name: 'Top Offset',
              info: 'The active top offset of a tab item',
              create: this.addPixelControl,
              attribute: 'margin-top',
              value: ''
            }, {
              // Active tab item spacing
              selector: '.wcPanelTabActive',
              elem: '<div class="wcPanelTab wcPanelTabActive"></div>',
              name: 'Spacing',
              info: 'The active spacing between tab items',
              create: this.addPixelControl,
              attribute: 'margin-right',
              value: ''
            }, {
              // Active tab item color
              selector: '.wcPanelTabActive',
              elem: '<div class="wcPanelTab wcPanelTabActive"></div>',
              name: 'Color',
              info: 'The active color of a tab item',
              create: this.addColorControl,
              attribute: 'background-color',
              value: ''
            }, {
              name: '',
              create: this.addSpacer
            }, {
              // Active tab item border size
              selector: '.wcPanelTabActive',
              elem: '<div class="wcPanelTab wcPanelTabActive"></div>',
              name: 'Border Size',
              info: 'The active border size of a tab item',
              create: this.addPixelControl,
              attribute: 'border-width',
              value: ''
            }, {
              // Active tab item border style
              selector: '.wcPanelTabActive',
              elem: '<div class="wcPanelTab wcPanelTabActive"></div>',
              name: 'Border Style',
              info: 'The active border style of a tab item',
              create: this.addListControl(this._borderStyles),
              attribute: 'border-style',
              value: ''
            }, {
              // Active tab item border radius
              selector: '.wcPanelTabActive',
              elem: '<div class="wcPanelTab wcPanelTabActive"></div>',
              name: 'Border Radius',
              info: 'The active border radius of a tab item',
              create: this.addPixelControl,
              attribute: 'border-top-left-radius,border-top-right-radius',
              value: ''
            }, {
              // Active tab item border color
              selector: '.wcPanelTabActive',
              elem: '<div class="wcPanelTab wcPanelTabActive"></div>',
              name: 'Border Color',
              info: 'The active border color of a tab item',
              create: this.addColorControl,
              attribute: 'border-color',
              value: ''
            }]
          }, {
            name: 'Tab Active Hover State',
            create: this.addTab,
            controls: [{
              name: 'Tab Active Hover State',
              create: this.addSpacer
            }, {
              // Active Hover tab item Font Size
              selector: '.wcPanelTabActive:hover, .wcPanelTabActiveHover',
              elem: '<div class="wcPanelTab wcPanelTabActive wcPanelTabActiveHover"></div>',
              name: 'Font Size',
              info: 'The active hover font size of a tab item',
              create: this.addPixelControl,
              attribute: 'font-size',
              value: ''
            }, {
              // Active Hover Tab Font Weight
              selector: '.wcPanelTabActive:hover, .wcPanelTabActiveHover',
              elem: '<div class="wcPanelTab wcPanelTabActive wcPanelTabActiveHover"></div>',
              name: 'Font Weight',
              info: 'The active hover font weight of a tab item',
              create: this.addListControl(this._fontWeights),
              attribute: 'font-weight',
              value: ''
            }, {
              // Active Hover tab item Font Color
              selector: '.wcPanelTabActive:hover, .wcPanelTabActiveHover',
              elem: '<div class="wcPanelTab wcPanelTabActive wcPanelTabActiveHover"></div>',
              name: 'Font Color',
              info: 'The active hover font color of a tab item',
              create: this.addColorControl,
              attribute: 'color',
              value: ''
            }, {
              // Active Hover tab item text padding
              selector: '.wcPanelTabActive:hover, .wcPanelTabActiveHover',
              elem: '<div class="wcPanelTab wcPanelTabActive wcPanelTabActiveHover"></div>',
              name: 'Text Padding',
              info: 'The active hover padding between text and tab border',
              create: this.addPixelControl,
              attribute: 'padding-left,padding-right',
              value: ''
            }, {
              name: '',
              create: this.addSpacer
            }, {
              // Active Hover tab item top padding
              selector: '.wcPanelTabActive:hover, .wcPanelTabActiveHover',
              elem: '<div class="wcPanelTab wcPanelTabActive wcPanelTabActiveHover"></div>',
              name: 'Top Offset',
              info: 'The active hover top offset of a tab item',
              create: this.addPixelControl,
              attribute: 'margin-top',
              value: ''
            }, {
              // Active Hover tab item spacing
              selector: '.wcPanelTabActive:hover, .wcPanelTabActiveHover',
              elem: '<div class="wcPanelTab wcPanelTabActive wcPanelTabActiveHover"></div>',
              name: 'Spacing',
              info: 'The active hover spacing between tab items',
              create: this.addPixelControl,
              attribute: 'margin-right',
              value: ''
            }, {
              // Active Hover tab item color
              selector: '.wcPanelTabActive:hover, .wcPanelTabActiveHover',
              elem: '<div class="wcPanelTab wcPanelTabActive wcPanelTabActiveHover"></div>',
              name: 'Color',
              info: 'The active hover color of a tab item',
              create: this.addColorControl,
              attribute: 'background-color',
              value: ''
            }, {
              name: '',
              create: this.addSpacer
            }, {
              // Active Hover tab item border size
              selector: '.wcPanelTabActive:hover, .wcPanelTabActiveHover',
              elem: '<div class="wcPanelTab wcPanelTabActive wcPanelTabActiveHover"></div>',
              name: 'Border Size',
              info: 'The active hover border size of a tab item',
              create: this.addPixelControl,
              attribute: 'border-width',
              value: ''
            }, {
              // Active Hover tab item border style
              selector: '.wcPanelTabActive:hover, .wcPanelTabActiveHover',
              elem: '<div class="wcPanelTab wcPanelTabActive wcPanelTabActiveHover"></div>',
              name: 'Border Style',
              info: 'The active hover border style of a tab item',
              create: this.addListControl(this._borderStyles),
              attribute: 'border-style',
              value: ''
            }, {
              // Active Hover tab item border radius
              selector: '.wcPanelTabActive:hover, .wcPanelTabActiveHover',
              elem: '<div class="wcPanelTab wcPanelTabActive wcPanelTabActiveHover"></div>',
              name: 'Border Radius',
              info: 'The active hover border radius of a tab item',
              create: this.addPixelControl,
              attribute: 'border-top-left-radius,border-top-right-radius',
              value: ''
            }, {
              // Active Hover tab item border color
              selector: '.wcPanelTabActive:hover, .wcPanelTabActiveHover',
              elem: '<div class="wcPanelTab wcPanelTabActive wcPanelTabActiveHover"></div>',
              name: 'Border Color',
              info: 'The active hover border color of a tab item',
              create: this.addColorControl,
              attribute: 'border-color',
              value: ''
            }]
          }]
        }]
      }]
    }];
  }
}