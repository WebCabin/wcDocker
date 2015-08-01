function wcThemeBuilder(myPanel) {
  this._panel = myPanel;
  this._controls = [];
  this._frames = [];
  this._frameIndex = [];

  this._borderStyles = ['none', 'dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset', 'initial', 'inherit'];

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

    var row = 0;
    for (var i = 0; i < this._controls.length; ++i) {
      var control = this._controls[i];
      if (control.create) {
        control.create.call(this, this._panel.layout(), control, row);
        row += 1;
      }
    }

    var self = this;
    var $reset = $('<button style="width:100%;" title="Reset attributes to the currently active theme.">Reset</button>');
    this._panel.layout().addItem($reset, 0, row).stretch('33%', '');
    $reset.click(function() {
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

    layout.addItem($tabArea, 0, row, 3).stretch('', '100%');

    var frame = new wcTabFrame($tabArea, this._panel);
    frame.moveable(false);
    if (control.orientation) {
      frame.tabOrientation(control.orientation);
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
      preferredFormat: 'rgb',
      change: function(color) {
        if (color) {
          control.value = color.toRgbString();
        } else {
          control.value = null;
        }
      }
    });

    if (control.isOptional) {
      $activator = $('<input type="checkbox" title="' + control.info + '"/>');
      layout.addItem($activator, 0, row).stretch('1%', '');

      $activator.attr('checked', control.isActive);
      $activator.change(function() {
        control.isActive = this.checked;
        $control.spectrum(this.checked? 'enable': 'disable');
      });

      if (!control.isActive) {
        $control.spectrum('disable');
      }
    }
  },

  addPixelControl: function(layout, control, row) {
    var $activator = null;
    var $label = null;
    var $control = null;
    var self = this;
    
    $label = $('<label class="wcAttributeLabel" title="' + control.info + '">' + control.name + ':</label>');
    layout.addItem($label, 1, row).stretch('1%', '').css('text-align', 'right');

    $control = $('<input title="' + control.info + '" type="number" step="1" min="1"/>');
    layout.addItem($control, 2, row).stretch('100%', '');
    $control.val(parseInt(control.value));
    $control.change(function() {
      control.value = $(this).val() + 'px';
    });

    if (control.isOptional) {
      $activator = $('<input type="checkbox" title="' + control.info + '"/>');
      layout.addItem($activator, 0, row).stretch('1%', '');

      $activator.attr('checked', control.isActive);
      $activator.change(function() {
        control.isActive = this.checked;
        $control.attr('disabled', !this.checked);
      });

      if (!control.isActive) {
        $control.attr('disabled', true);
      }
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
      });

      if (control.isOptional) {
        $activator = $('<input type="checkbox" title="' + control.info + '"/>');
        layout.addItem($activator, 0, row).stretch('1%', '');

        $activator.attr('checked', control.isActive);
        $activator.change(function() {
          control.isActive = this.checked;
          $control.attr('disabled', !this.checked);
        });

        if (!control.isActive) {
          $control.attr('disabled', true);
        }
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

      if (!control.selector || typeof control.value !== 'string') {
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
          value: control.value
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
          themeData += '  ' + item.key + ': ' + item.value + ';\n';
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

    var $style = $('<style id="wcCustomTheme"></style>');
    $('head').append($style);
    $style.text(themeData);
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
      control.value = $item.css(control.attribute.split(',')[0]);
      $item.remove();
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

    this._panel.on(wcDocker.EVENT.CUSTOM_TAB_CHANGED, function() {
      console.log('refreshing tabs');
      for (var i = 0; i < self._frames.length; ++i) {
        self._frames[i].update();
      }
    });
  },

  initParts: function() {
    this._controls = [{
      // Main tab frame.
      create: this.addTabFrame,
      controls: [{
        // -----------------------------------------------------------------------------------------------------------------
        name: 'Main',
        create: this.addTab,
        controls: [{
          name: 'Main',
          create: this.addSpacer
        }, {
          // Background Color
          selector: '.wcDocker, .wcPanelBackground',
          elem: '<div class="wcDocker wcPanelBackground"></div>',
          name: 'Background Color',
          info: 'The background color to use.',
          create: this.addColorControl,
          attribute: 'background-color',
          value: ''
        }, {
          // Modal Blocker Color
          selector: '.wcModalBlocker',
          elem: '<div class="wcModalBlocker"></div>',
          name: 'Modal Blocker Color',
          info: 'The color of the fullscreen blocker element that appears when a modal panel is visible.',
          create: this.addColorControl,
          attribute: 'background-color',
          value: ''
        }]
      }, {
        // -----------------------------------------------------------------------------------------------------------------
        name: 'Panels',
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
          name: 'Panel Buttons',
          create: this.addSpacer
        }, {
          // Panel Button Size
          selector: '.wcFrameButton',
          elem: '<div class="wcFrameButton"></div>',
          name: 'Button Size',
          info: 'The pixel size of the button squared',
          create: this.addPixelControl,
          attribute: 'width,height',
          value: ''
        }, {
          // Panel Font Size
          selector: '.wcFrameButton',
          elem: '<div class="wcFrameButton"></div>',
          name: 'Button Font Size',
          info: 'Font size of the button contents (if it uses text instead of an image)',
          create: this.addPixelControl,
          attribute: 'font-size',
          value: ''
        }, {
          name: '',
          create: this.addSpacer
        }, {
          create: this.addTabFrame,
          orientation: wcDocker.TAB.TOP,
          controls: [{
            // Panel button normal state
            name: 'Normal State',
            create: this.addTab,
            controls: [{
              name: 'Normal State',
              create: this.addSpacer
            }, {
              // Normal Button Text Color
              selector: '.wcFrameButton',
              elem: '<div class="wcFrameButton"></div>',
              name: 'Button Text Color',
              info: 'The normal text color of a panel button',
              create: this.addColorControl,
              attribute: 'color',
              value: ''
            }, {
              // Normal Button Color
              selector: '.wcFrameButton',
              elem: '<div class="wcFrameButton"></div>',
              name: 'Button Color',
              info: 'The normal color of a panel button',
              create: this.addColorControl,
              attribute: 'background-color',
              value: ''
            }, {
              // Normal Button Border Color
              selector: '.wcFrameButton',
              elem: '<div class="wcFrameButton"></div>',
              name: 'Button Border Color',
              info: 'The normal border color of a panel button',
              create: this.addColorControl,
              attribute: 'border-color',
              value: ''
            }, {
              // Normal Button Border Size
              selector: '.wcFrameButton',
              elem: '<div class="wcFrameButton"></div>',
              name: 'Button Border Size',
              info: 'The normal border size of a panel button',
              create: this.addPixelControl,
              attribute: 'border-width',
              value: ''
            }, {
              // Normal Button Border Style
              selector: '.wcFrameButton',
              elem: '<div class="wcFrameButton"></div>',
              name: 'Button Border Style',
              info: 'The normal border style of a panel button',
              create: this.addListControl(this._borderStyles),
              attribute: 'border-style',
              value: ''
            }]
          }, {
            // Panel button hover state
            name: 'Hover State',
            create: this.addTab,
            controls: [{
              name: 'Hover State',
              create: this.addSpacer
            }, {
              // Hover Button Text Color
              selector: '.wcFrameButton:hover, .wcFrameButtonHover',
              elem: '<div class="wcFrameButtonHover"></div>',
              name: 'Button Text Color',
              info: 'The hover text color of a panel button',
              create: this.addColorControl,
              attribute: 'color',
              value: ''
            }, {
              // Hover Button Color
              selector: '.wcFrameButton:hover, .wcFrameButtonHover',
              elem: '<div class="wcFrameButtonHover"></div>',
              name: 'Button Color',
              info: 'The hover color of a panel button',
              create: this.addColorControl,
              attribute: 'background-color',
              value: ''
            }, {
              // Hover Button Border Color
              selector: '.wcFrameButton:hover, .wcFrameButtonHover',
              elem: '<div class="wcFrameButtonHover"></div>',
              name: 'Button Border Color',
              info: 'The hover border color of a panel button',
              create: this.addColorControl,
              attribute: 'border-color',
              value: ''
            }, {
              // Hover Button Border Size
              selector: '.wcFrameButton:hover, .wcFrameButtonHover',
              elem: '<div class="wcFrameButtonHover"></div>',
              name: 'Button Border Size',
              info: 'The hover border size of a panel button',
              create: this.addPixelControl,
              attribute: 'border-width',
              value: ''
            }, {
              // Hover Button Border Style
              selector: '.wcFrameButton:hover, .wcFrameButtonHover',
              elem: '<div class="wcFrameButtonHover"></div>',
              name: 'Button Border Style',
              info: 'The hover border style of a panel button',
              create: this.addListControl(this._borderStyles),
              attribute: 'border-style',
              value: ''
            }]
          }, {
            // Panel button pressed state
            name: 'Pressed State',
            create: this.addTab,
            controls: [{
              name: 'Pressed State',
              create: this.addSpacer
            }, {
              // Pressed Button Text Color
              selector: '.wcFrameButton:active, .wcFrameButtonActive',
              elem: '<div class="wcFrameButtonActive"></div>',
              name: 'Button Text Color',
              info: 'The pressed text color of a panel button',
              create: this.addColorControl,
              attribute: 'color',
              value: ''
            }, {
              // Pressed Button Color
              selector: '.wcFrameButton:active, .wcFrameButtonActive',
              elem: '<div class="wcFrameButtonActive"></div>',
              name: 'Button Color',
              info: 'The pressed color of a panel button',
              create: this.addColorControl,
              attribute: 'background-color',
              value: ''
            }, {
              // Pressed Button Border Color
              selector: '.wcFrameButton:active, .wcFrameButtonActive',
              elem: '<div class="wcFrameButtonActive"></div>',
              name: 'Button Border Color',
              info: 'The pressed border color of a panel button',
              create: this.addColorControl,
              attribute: 'border-color',
              value: ''
            }, {
              // Pressed Button Border Size
              selector: '.wcFrameButton:active, .wcFrameButtonActive',
              elem: '<div class="wcFrameButtonActive"></div>',
              name: 'Button Border Size',
              info: 'The pressed border size of a panel button',
              create: this.addPixelControl,
              attribute: 'border-width',
              value: ''
            }, {
              // Pressed Button Border Style
              selector: '.wcFrameButton:active, .wcFrameButtonActive',
              elem: '<div class="wcFrameButtonActive"></div>',
              name: 'Button Border Style',
              info: 'The pressed border style of a panel button',
              create: this.addListControl(this._borderStyles),
              attribute: 'border-style',
              value: ''
            }]
          }]
        }]
      }, {
        // -----------------------------------------------------------------------------------------------------------------
        name: 'Layout',
        create: this.addTab,
        controls: [{
          name: 'Layout',
          create: this.addSpacer
        }, {
          selector: '.wcLayoutGrid, .wcLayoutGrid tr, .wcLayoutGrid td',
          elem: '<div class="wcLayoutGrid"></div>',
          name: 'Grid Border Color',
          info: 'When a layout grid is visible, this is the color of the grid lines',
          create: this.addColorControl,
          attribute: 'border-color',
          value: ''
        }, {
          selector: '.wcLayoutGrid, .wcLayoutGrid tr, .wcLayoutGrid td',
          elem: '<div class="wcLayoutGrid"></div>',
          name: 'Grid Border Size',
          info: 'When a layout grid is visible, this is the size of the grid lines',
          create: this.addPixelControl,
          attribute: 'border-width',
          value: ''
        }, {
          selector: '.wcLayoutGrid, .wcLayoutGrid tr, .wcLayoutGrid td',
          elem: '<div class="wcLayoutGrid"></div>',
          name: 'Grid Border Style',
          info: 'When a layout grid is visible, this is the style of the grid lines',
          create: this.addListControl(this._borderStyles),
          attribute: 'border-style',
          value: ''
        }]
      }, {
        // -----------------------------------------------------------------------------------------------------------------
        name: 'Tabs',
        create: this.addTab,
        controls: [{
          name: 'Tabs',
          create: this.addSpacer
        }, {
          selector: '.wcFrameTitleBar',
          elem: '<div class="wcFrameTitleBar"></div>',
          name: 'Height',
          info: 'The height of the tab bar.',
          create: this.addPixelControl,
          attribute: 'height',
          value: '',
          also: [{
            selector: '.wcFrameCenter',
            attribute: 'top'
          }]
        }, {
          selector: '.wcFrameTitleBar',
          elem: '<div class="wcFrameTitleBar"></div>',
          name: 'Background Bar Color',
          info: 'The color of the tab bar (behind the tabs).',
          create: this.addColorControl,
          attribute: 'background-color',
          value: ''
        }, {
          selector: '.wcFrameTitle',
          elem: '<div class="wcFrameTitle"></div>',
          name: 'Font Size',
          info: 'The font size (in pixels)',
          create: this.addPixelControl,
          attribute: 'font-size',
          value: ''
        }, {
          selector: '.wcFrameTitle',
          attribute: 'font-size',
          value: 'bold'
        }, {
          selector: '.wcFrameTitle',
          attribute: 'font-align',
          value: 'center'
        }, {
          selector: '.wcFrameTitle',
          elem: '<div class="wcFrameTitle"></div>',
          name: 'Font Color',
          info: 'The normal color of tab items',
          create: this.addColorControl,
          attribute: 'background-color',
          value: ''
        }]
      }]
    }];
  }
}