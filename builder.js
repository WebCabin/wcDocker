function wcThemeBuilder(myPanel) {
  this._panel = myPanel;
  this._controls = [];
  this._frames = [];
  this._frameIndex = [];
  this.$activeTheme = null;
  this._lastCheckbox = null;
  this._isLastDisabled = false;
  this.$part = $('<select style="width:100%">');

  this._fontWeights = ['normal', 'bold', 'bolder', 'lighter', '100', '200', '300', '400', '500', '600', '700', '800', '900', 'initial', 'inherit'];
  this._borderStyles = [{display: 'none', value: ''}, 'dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset', 'initial', 'inherit'];
  this._shadowStyle = [{display: 'normal', value: ''}, 'inset', 'initial', 'inherit'];

  this._parseBoxShadowStyle = function(value) {
    value = value.toLowerCase();
    if (value.indexOf('inset') > -1) {
      return 'inset';
    } else if (value.indexOf('initial') > -1) {
      return 'initial';
    } else if (value.indexOf('inherit') > -1) {
      return 'inherit';
    }
    return '';
  };

  this._parseBoxShadowColor = function(value) {
    value = value.toLowerCase();
    var start = value.indexOf('rgb');
    if (start > -1) {
      var end = value.indexOf(')');
      return value.substring(start, end+1);
    }

    start = value.indexOf('#');
    if (start > -1) {
      var end = value.indexOf(' ');
      if (end === -1) {
        end = value.length;
      }

      return value.substring(start, end+1).replace(';', '');
    }
  };

  this._parseBoxShadowAttribute = function(index) {
    return function(value) {
      var count = 0;
      value = value.replace(/\s(?![^)]*(\(|$))/g, '');
      var values = value.split(' ');
      for (var i = 0; i < values.length; ++i) {
        var attr = values[i].trim().replace('px', '');
        if (!isNaN(attr)) {
          count += 1;
          if (count === index) {
            return attr.toString() + 'px';
          }
        }
      }
      return '0px';
    };
  };

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
      var blob = new Blob([themeData], {type: "text/plain;charset=utf-8"});
      saveAs(blob, "myTheme.css");
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
      clickoutFiresChange: true,
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
      preferredFormat: 'hex3',
      change: __setColor,
      move:   __setColor,
      hide:   __setColor
    });

    if (!control.grouped) {
      $activator = $('<input type="checkbox" title="' + control.info + '"/>');
      layout.addItem($activator, 0, row).stretch('1%', '');

      $activator.attr('checked', !control.isDisabled);
      this._lastCheckbox = $activator;
    } else {
      $activator = this._lastCheckbox;
    }

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

    $control = $('<input class="wcAttributeControl" title="' + control.info + '" type="text"/>');
    layout.addItem($control, 2, row).stretch('100%', '');
    $control.val(control.value);
    $control.change(function() {
      control.value = $(this).val();
      self.onChanged();
    });

    if (!control.grouped) {
      $activator = $('<input type="checkbox" title="' + control.info + '"/>');
      layout.addItem($activator, 0, row).stretch('1%', '');

      $activator.attr('checked', !control.isDisabled);
      this._lastCheckbox = $activator;
    } else {
      $activator = this._lastCheckbox;
    }

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

    $control = $('<input class="wcAttributeControl" title="' + control.info + '" type="number" step="1"/>');
    layout.addItem($control, 2, row).stretch('100%', '');
    $control.val(parseInt(control.value));
    $control.change(function() {
      control.value = $(this).val() + 'px';
      self.onChanged();
    });

    if (!control.grouped) {
      $activator = $('<input type="checkbox" title="' + control.info + '"/>');
      layout.addItem($activator, 0, row).stretch('1%', '');

      $activator.attr('checked', !control.isDisabled);
      this._lastCheckbox = $activator;
    } else {
      $activator = this._lastCheckbox;
    }

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

      $control = $('<select class="wcAttributeControl" title="' + control.info + '"></select>');
      layout.addItem($control, 2, row).stretch('100%', '');

      for (var i = 0; i < items.length; ++i) {
        var display = '';
        var value = '';
        if (typeof items[i] === 'string') {
          display = items[i];
          value = items[i];
        } else {
          display = items[i].display;
          value = items[i].value;
        }
        $control.append($('<option value="' + value + '"' + (control.value === value? ' selected': '') + '>' + display + '</option>'));
      }

      $control.change(function() {
        control.value = $(this).val();
        self.onChanged();
      });

      if (!control.grouped) {
        $activator = $('<input type="checkbox" title="' + control.info + '"/>');
        layout.addItem($activator, 0, row).stretch('1%', '');

        $activator.attr('checked', !control.isDisabled);
        this._lastCheckbox = $activator;
      } else {
        $activator = this._lastCheckbox;
      }

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
        // If we are in append mode, try to find an already existing attribute
        if (control.append) {
          var found = false;
          for (var b = 0; b < obj.length; ++b) {
            if (obj[b].key === attrs[a]) {
              obj[b].value += ' ' + control.value;
              found = true;
              break;
            }
          }
          if (found) {
            continue;
          }
        }

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
    var objMapping = {};
    var tempItems = [];

    for (var i = 0; i < controls.length; ++i) {
      var control = controls[i];
      control.isDisabled = false;

      if (control.controls) {
        this.pull(control.controls);
      }

      if (!control.selector || !control.elem) {
        continue;
      }

      var $item = null;

      // FIrst see if we already have this element mapped.
      if (objMapping.hasOwnProperty(control.selector)) {
        $item = objMapping[control.selector];
      } else {
        $item = $(control.elem);
        $('body').append($item);
        tempItems.push($item);
        objMapping[control.selector] = $item;
      }

      var attr = control.attribute.split(',')[0];
      var value = $item.css(attr);
      if (value === 'none') {
        control.isDisabled = true;
      } else if (control.parser) {
        control.value = control.parser(value);
      } else {
        control.value = value;
      }

      if (control.grouped && this._isLastDisabled) {
        control.isDisabled = true;
      }

      if (!control.grouped) {
        this._isLastDisabled = control.isDisabled;
      }
    }

    // Now clean up any temporary elements.
    for (var i = 0; i < tempItems.length; ++i) {
      tempItems[i].remove();
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
    this.initControls();
    var self = this;
    this._panel.on(wcDocker.EVENT.INIT, function() {
      setTimeout(function() {
        self.pull(self._controls);
        self.buildControls();
      }, 100);
    });

    this._panel.addButton('Info', 'fa fa-question', '?', 'Show information about this panel.');
    this._panel.on(wcDocker.EVENT.BUTTON, function(data) {
      // Use the preivously defined common function to popup the Info Panel.
      var infoPanel = self._panel.docker().addPanel('Info Panel', wcDocker.DOCK.MODAL, null);
      infoPanel.layout().$table.find('span').text('The theme builder panel allows you to design your own custom wcDocker themes without having to mess with CSS code directly! Press "Pull" to gather all current theme settings from the window and assign them into the displayed attributes. Press "Apply" to override the current visible theme with your custom theme (and display any further changes live!). Press "Download" to download a copy of your new theme!');
    });

    this._panel.on(wcDocker.EVENT.CLOSED, function() {
      var $customTheme = $('#wcCustomTheme');
      if ($customTheme.length) {
        $('option.custom').hide();
        $('.themeSelector').val('default').change();
        $customTheme.remove();
      }
    });

    this._panel.on(wcDocker.EVENT.CUSTOM_TAB_CHANGED, function(data) {
      for (var i = 0; i < self._frames.length; ++i) {
        self._frames[i].update();
      }
      // data.obj.update();
      // var layout = data.obj.layout(data.obj.tab());
      // for (var i = 0; i < layout._childFrames.length; ++i) {
      //   layout._childFrames[i].update();
      // }
    });
  },

  initControls: function() {
    this._controls = [{
      // Main tab frame.
      create: this.addTabFrame,
      stretch: true,
      controls: [{
        // -----------------------------------------------------------------------------------------------------------------
        // -----------------------------------------------------------------------------------------------------------------
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
          name: 'Color',
          info: 'The background color to use',
          create: this.addColorControl,
          attribute: 'background-color',
          value: ''
        }, {
          // Background Box Shadow style
          selector: '.wcDocker, .wcPanelBackground',
          elem: '<div class="wcDocker"></div>',
          name: 'Box-Shadow Style',
          info: 'The box shadow style',
          create: this.addListControl(this._shadowStyle),
          parser: this._parseBoxShadowStyle,
          attribute: 'box-shadow',
          value: ''
        }, {
          // Background Box Shadow h-shadow
          selector: '.wcDocker, .wcPanelBackground',
          elem: '<div class="wcDocker"></div>',
          name: 'Box-Shadow Left Offset',
          info: 'The box shadow horizontal offset from the left (can be negative)',
          create: this.addPixelControl,
          parser: this._parseBoxShadowAttribute(1),
          attribute: 'box-shadow',
          append: true,
          grouped: true,
          value: '0px'
        }, {
          // Background Box Shadow v-shadow
          selector: '.wcDocker, .wcPanelBackground',
          elem: '<div class="wcDocker"></div>',
          name: 'Box-Shadow Top Offset',
          info: 'The box shadow vertical offset from the top (can be negative)',
          create: this.addPixelControl,
          parser: this._parseBoxShadowAttribute(2),
          attribute: 'box-shadow',
          append: true,
          grouped: true,
          value: '0px'
        }, {
          // Background Box Shadow Blur
          selector: '.wcDocker, .wcPanelBackground',
          elem: '<div class="wcDocker"></div>',
          name: 'Box-Shadow Blur',
          info: 'The box shadow blur',
          create: this.addPixelControl,
          parser: this._parseBoxShadowAttribute(3),
          attribute: 'box-shadow',
          append: true,
          grouped: true,
          value: '0px'
        }, {
          // Background Box Shadow Blur
          selector: '.wcDocker, .wcPanelBackground',
          elem: '<div class="wcDocker"></div>',
          name: 'Box-Shadow Spread',
          info: 'The box shadow spread',
          create: this.addPixelControl,
          parser: this._parseBoxShadowAttribute(4),
          attribute: 'box-shadow',
          append: true,
          grouped: true,
          value: '0px'
        }, {
          // Background Box Shadow Color
          selector: '.wcDocker, .wcPanelBackground',
          elem: '<div class="wcDocker"></div>',
          name: 'Box-Shadow Color',
          info: 'The box shadow color',
          create: this.addColorControl,
          parser: this._parseBoxShadowColor,
          attribute: 'box-shadow',
          append: true,
          grouped: true,
          value: ''
        }, {
          name: '',
          create: this.addSpacer
        }, {
          name: 'Modal Blocker',
          create: this.addSpacer
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
          // Ghost Border Radius
          selector: '.wcGhost',
          elem: '<div class="wcGhost"></div>',
          name: 'Ghost Border Radius',
          info: 'The ghost border radius',
          create: this.addPixelControl,
          attribute: 'border-radius',
          value: '0px'
        }]
      }, {
        // -----------------------------------------------------------------------------------------------------------------
        // -----------------------------------------------------------------------------------------------------------------
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
          // -----------------------------------------------------------------------------------------------------------------
          // -----------------------------------------------------------------------------------------------------------------
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
              name: 'Size',
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
              name: 'Color',
              info: 'The color of a splitter bar',
              create: this.addColorControl,
              attribute: 'background-color',
              value: ''
            }, {
              // Splitter Bar Border Style
              selector: '.wcSplitterBar',
              elem: '<div class="wcSplitterBar"></div>',
              name: 'Border Style',
              info: 'The border style of a splitter bar',
              create: this.addListControl(this._borderStyles),
              attribute: 'border-style',
              value: ''
            }, {
              // Splitter Bar Border Size
              selector: '.wcSplitterBar',
              elem: '<div class="wcSplitterBar"></div>',
              name: 'Border Size',
              info: 'The border size of a splitter bar',
              create: this.addPixelControl,
              attribute: 'border-width',
              value: '0px'
            }, {
              // Splitter Bar Border Color
              selector: '.wcSplitterBar',
              elem: '<div class="wcSplitterBar"></div>',
              name: 'Border Color',
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
              name: 'Size',
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
              name: 'Color',
              info: 'The color of a static splitter bar',
              create: this.addColorControl,
              attribute: 'background-color',
              value: ''
            }, {
              // Splitter Bar Border Style
              selector: '.wcSplitterBar.wcSplitterBarStatic',
              elem: '<div class="wcSplitterBar wcSplitterBarStatic"></div>',
              name: 'Border Style',
              info: 'The border style of a static splitter bar',
              create: this.addListControl(this._borderStyles),
              attribute: 'border-style',
              value: ''
            }, {
              // Splitter Bar Border Size
              selector: '.wcSplitterBar.wcSplitterBarStatic',
              elem: '<div class="wcSplitterBar wcSplitterBarStatic"></div>',
              name: 'Border Size',
              info: 'The border size of a static splitter bar',
              create: this.addPixelControl,
              attribute: 'border-width',
              value: '0px'
            }, {
              // Splitter Bar Border Color
              selector: '.wcSplitterBar.wcSplitterBarStatic',
              elem: '<div class="wcSplitterBar wcSplitterBarStatic"></div>',
              name: 'Border Color',
              info: 'The border color of a static splitter bar',
              create: this.addColorControl,
              attribute: 'border-color',
              value: ''
            }]
          }]
        }]
      }, {
        // -----------------------------------------------------------------------------------------------------------------
        // -----------------------------------------------------------------------------------------------------------------
        // -----------------------------------------------------------------------------------------------------------------
        name: 'Panels',
        scrollable: true,
        create: this.addTab,
        controls: [{
          name: 'Panels',
          create: this.addSpacer
        }, {
          // Panel Flasher Color
          selector: '.wcFrameFlasher',
          elem: '<div class="wcFrameFlasher"></div>',
          name: 'Flash Color',
          info: 'The color of the panel when it focus flashes.',
          create: this.addColorControl,
          attribute: 'background-color',
          value: ''
        }, {
          // Panel Shadow Color
          selector: '.wcFrameShadower',
          elem: '<div class="wcFrameShadower"></div>',
          name: 'Shadow Color',
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
          // -----------------------------------------------------------------------------------------------------------------
          // -----------------------------------------------------------------------------------------------------------------
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
              // Normal Button Border Style
              selector: '.wcFrameButton',
              elem: '<div class="wcFrameButton"></div>',
              name: 'Border Style',
              info: 'The normal border style of a panel button',
              create: this.addListControl(this._borderStyles),
              attribute: 'border-style',
              value: ''
            }, {
              // Normal Button Border Size
              selector: '.wcFrameButton',
              elem: '<div class="wcFrameButton"></div>',
              name: 'Border Size',
              info: 'The normal border size of a panel button',
              create: this.addPixelControl,
              attribute: 'border-width',
              value: '0px'
            }, {
              // Normal Button Border Color
              selector: '.wcFrameButton',
              elem: '<div class="wcFrameButton"></div>',
              name: 'Border Color',
              info: 'The normal border color of a panel button',
              create: this.addColorControl,
              attribute: 'border-color',
              value: ''
            }, {
              name: '',
              create: this.addSpacer
            }, {
              // Box Shadow style
              selector: '.wcFrameButton',
              elem: '<div class="wcFrameButton"></div>',
              name: 'Box-Shadow Style',
              info: 'The box shadow style',
              create: this.addListControl(this._shadowStyle),
              parser: this._parseBoxShadowStyle,
              attribute: 'box-shadow',
              value: ''
            }, {
              // Box Shadow h-shadow
              selector: '.wcFrameButton',
              elem: '<div class="wcFrameButton"></div>',
              name: 'Box-Shadow Left Offset',
              info: 'The box shadow horizontal offset from the left (can be negative)',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(1),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow v-shadow
              selector: '.wcFrameButton',
              elem: '<div class="wcFrameButton"></div>',
              name: 'Box-Shadow Top Offset',
              info: 'The box shadow vertical offset from the top (can be negative)',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(2),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow Blur
              selector: '.wcFrameButton',
              elem: '<div class="wcFrameButton"></div>',
              name: 'Box-Shadow Blur',
              info: 'The box shadow blur',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(3),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow Blur
              selector: '.wcFrameButton',
              elem: '<div class="wcFrameButton"></div>',
              name: 'Box-Shadow Spread',
              info: 'The box shadow spread',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(4),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow Color
              selector: '.wcFrameButton',
              elem: '<div class="wcFrameButton"></div>',
              name: 'Box-Shadow Color',
              info: 'The box shadow color',
              create: this.addColorControl,
              parser: this._parseBoxShadowColor,
              attribute: 'box-shadow',
              append: true,
              grouped: true,
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
              // Hover Button Border Style
              selector: '.wcFrameButton:hover, .wcFrameButtonHover',
              elem: '<div class="wcFrameButton wcFrameButtonHover"></div>',
              name: 'Border Style',
              info: 'The hover border style of a panel button',
              create: this.addListControl(this._borderStyles),
              attribute: 'border-style',
              value: ''
            }, {
              // Hover Button Border Size
              selector: '.wcFrameButton:hover, .wcFrameButtonHover',
              elem: '<div class="wcFrameButton wcFrameButtonHover"></div>',
              name: 'Border Size',
              info: 'The hover border size of a panel button',
              create: this.addPixelControl,
              attribute: 'border-width',
              value: '0px'
            }, {
              // Hover Button Border Color
              selector: '.wcFrameButton:hover, .wcFrameButtonHover',
              elem: '<div class="wcFrameButton wcFrameButtonHover"></div>',
              name: 'Border Color',
              info: 'The hover border color of a panel button',
              create: this.addColorControl,
              attribute: 'border-color',
              value: ''
            }, {
              name: '',
              create: this.addSpacer
            }, {
              // Box Shadow style
              selector: '.wcFrameButton:hover, .wcFrameButtonHover',
              elem: '<div class="wcFrameButton wcFrameButtonHover"></div>',
              name: 'Box-Shadow Style',
              info: 'The box shadow style',
              create: this.addListControl(this._shadowStyle),
              parser: this._parseBoxShadowStyle,
              attribute: 'box-shadow',
              value: ''
            }, {
              // Box Shadow h-shadow
              selector: '.wcFrameButton:hover, .wcFrameButtonHover',
              elem: '<div class="wcFrameButton wcFrameButtonHover"></div>',
              name: 'Box-Shadow Left Offset',
              info: 'The box shadow horizontal offset from the left (can be negative)',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(1),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow v-shadow
              selector: '.wcFrameButton:hover, .wcFrameButtonHover',
              elem: '<div class="wcFrameButton wcFrameButtonHover"></div>',
              name: 'Box-Shadow Top Offset',
              info: 'The box shadow vertical offset from the top (can be negative)',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(2),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow Blur
              selector: '.wcFrameButton:hover, .wcFrameButtonHover',
              elem: '<div class="wcFrameButton wcFrameButtonHover"></div>',
              name: 'Box-Shadow Blur',
              info: 'The box shadow blur',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(3),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow Blur
              selector: '.wcFrameButton:hover, .wcFrameButtonHover',
              elem: '<div class="wcFrameButton wcFrameButtonHover"></div>',
              name: 'Box-Shadow Spread',
              info: 'The box shadow spread',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(4),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow Color
              selector: '.wcFrameButton:hover, .wcFrameButtonHover',
              elem: '<div class="wcFrameButton wcFrameButtonHover"></div>',
              name: 'Box-Shadow Color',
              info: 'The box shadow color',
              create: this.addColorControl,
              parser: this._parseBoxShadowColor,
              attribute: 'box-shadow',
              append: true,
              grouped: true,
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
              // Active Button Border Style
              selector: '.wcFrameButton:active, .wcFrameButtonActive',
              elem: '<div class="wcFrameButton wcFrameButtonActive"></div>',
              name: 'Border Style',
              info: 'The active border style of a panel button',
              create: this.addListControl(this._borderStyles),
              attribute: 'border-style',
              value: ''
            }, {
              // Active Button Border Size
              selector: '.wcFrameButton:active, .wcFrameButtonActive',
              elem: '<div class="wcFrameButton wcFrameButtonActive"></div>',
              name: 'Border Size',
              info: 'The active border size of a panel button',
              create: this.addPixelControl,
              attribute: 'border-width',
              value: '0px'
            }, {
              // Active Button Border Color
              selector: '.wcFrameButton:active, .wcFrameButtonActive',
              elem: '<div class="wcFrameButton wcFrameButtonActive"></div>',
              name: 'Border Color',
              info: 'The active border color of a panel button',
              create: this.addColorControl,
              attribute: 'border-color',
              value: ''
            }, {
              name: '',
              create: this.addSpacer
            }, {
              // Box Shadow style
              selector: '.wcFrameButton:active, .wcFrameButtonActive',
              elem: '<div class="wcFrameButton wcFrameButtonActive"></div>',
              name: 'Box-Shadow Style',
              info: 'The box shadow style',
              create: this.addListControl(this._shadowStyle),
              parser: this._parseBoxShadowStyle,
              attribute: 'box-shadow',
              value: ''
            }, {
              // Box Shadow h-shadow
              selector: '.wcFrameButton:active, .wcFrameButtonActive',
              elem: '<div class="wcFrameButton wcFrameButtonActive"></div>',
              name: 'Box-Shadow Left Offset',
              info: 'The box shadow horizontal offset from the left (can be negative)',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(1),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow v-shadow
              selector: '.wcFrameButton:active, .wcFrameButtonActive',
              elem: '<div class="wcFrameButton wcFrameButtonActive"></div>',
              name: 'Box-Shadow Top Offset',
              info: 'The box shadow vertical offset from the top (can be negative)',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(2),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow Blur
              selector: '.wcFrameButton:active, .wcFrameButtonActive',
              elem: '<div class="wcFrameButton wcFrameButtonActive"></div>',
              name: 'Box-Shadow Blur',
              info: 'The box shadow blur',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(3),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow Blur
              selector: '.wcFrameButton:active, .wcFrameButtonActive',
              elem: '<div class="wcFrameButton wcFrameButtonActive"></div>',
              name: 'Box-Shadow Spread',
              info: 'The box shadow spread',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(4),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow Color
              selector: '.wcFrameButton:active, .wcFrameButtonActive',
              elem: '<div class="wcFrameButton wcFrameButtonActive"></div>',
              name: 'Box-Shadow Color',
              info: 'The box shadow color',
              create: this.addColorControl,
              parser: this._parseBoxShadowColor,
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: ''
            }]
          }]
        }]
      }, {
        // -----------------------------------------------------------------------------------------------------------------
        // -----------------------------------------------------------------------------------------------------------------
        // -----------------------------------------------------------------------------------------------------------------
        name: 'Layout',
        scrollable: true,
        create: this.addTab,
        controls: [{
          name: 'Layout Grid',
          create: this.addSpacer
        }, {
          // Layout grid alternate color
          selector: '.wcLayoutGridAlternate tr:nth-child(even), .wcLayoutGridAltColor',
          elem: '<div class="wcLayoutGridAltColor"></div>',
          name: 'Odd Row Color',
          info: 'When a layout grid alternate mode is enabled, this is the color to use for each alternate row',
          create: this.addColorControl,
          attribute: 'background-color',
          value: '',
          important: true
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
          // Layout grid border width
          selector: '.wcLayoutGrid, .wcLayoutGrid tr, .wcLayoutGrid td',
          elem: '<div class="wcLayoutGrid"></div>',
          name: 'Border Size',
          info: 'When a layout grid is visible, this is the size of the grid lines',
          create: this.addPixelControl,
          attribute: 'border-width',
          value: '0px'
        }, {
          // Layout grid border color
          selector: '.wcLayoutGrid, .wcLayoutGrid tr, .wcLayoutGrid td',
          elem: '<div class="wcLayoutGrid"></div>',
          name: 'Border Color',
          info: 'When a layout grid is visible, this is the color of the grid lines',
          create: this.addColorControl,
          attribute: 'border-color',
          value: ''
        }]
      }, {
        // -----------------------------------------------------------------------------------------------------------------
        // -----------------------------------------------------------------------------------------------------------------
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
          name: 'Color',
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
          // -----------------------------------------------------------------------------------------------------------------
          // -----------------------------------------------------------------------------------------------------------------
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
              // Normal tab item Font padding
              selector: '.wcPanelTab',
              elem: '<div class="wcPanelTab"></div>',
              name: 'Font Padding',
              info: 'The normal padding between text and tab border',
              create: this.addPixelControl,
              attribute: 'padding-left,padding-right',
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
              // Normal tab item border style
              selector: '.wcPanelTab',
              elem: '<div class="wcPanelTab"></div>',
              name: 'Border Style',
              info: 'The normal border style of a tab item',
              create: this.addListControl(this._borderStyles),
              attribute: 'border-style',
              value: ''
            }, {
              // Normal tab item border size
              selector: '.wcPanelTab',
              elem: '<div class="wcPanelTab"></div>',
              name: 'Border Size',
              info: 'The normal border size of a tab item',
              create: this.addPixelControl,
              attribute: 'border-width',
              value: '0px'
            }, {
              // Normal tab item border radius
              selector: '.wcPanelTab',
              elem: '<div class="wcPanelTab"></div>',
              name: 'Border Radius',
              info: 'The normal border radius of a tab item',
              create: this.addPixelControl,
              attribute: 'border-top-left-radius,border-top-right-radius',
              value: '0px'
            }, {
              // Normal tab item border color
              selector: '.wcPanelTab',
              elem: '<div class="wcPanelTab"></div>',
              name: 'Border Color',
              info: 'The normal border color of a tab item',
              create: this.addColorControl,
              attribute: 'border-color',
              value: ''
            }, {
              name: '',
              create: this.addSpacer
            }, {
              // Box Shadow style
              selector: '.wcPanelTab',
              elem: '<div class="wcPanelTab"></div>',
              name: 'Box-Shadow Style',
              info: 'The box shadow style',
              create: this.addListControl(this._shadowStyle),
              parser: this._parseBoxShadowStyle,
              attribute: 'box-shadow',
              value: ''
            }, {
              // Box Shadow h-shadow
              selector: '.wcPanelTab',
              elem: '<div class="wcPanelTab"></div>',
              name: 'Box-Shadow Left Offset',
              info: 'The box shadow horizontal offset from the left (can be negative)',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(1),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow v-shadow
              selector: '.wcPanelTab',
              elem: '<div class="wcPanelTab"></div>',
              name: 'Box-Shadow Top Offset',
              info: 'The box shadow vertical offset from the top (can be negative)',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(2),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow Blur
              selector: '.wcPanelTab',
              elem: '<div class="wcPanelTab"></div>',
              name: 'Box-Shadow Blur',
              info: 'The box shadow blur',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(3),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow Blur
              selector: '.wcPanelTab',
              elem: '<div class="wcPanelTab"></div>',
              name: 'Box-Shadow Spread',
              info: 'The box shadow spread',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(4),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow Color
              selector: '.wcPanelTab',
              elem: '<div class="wcPanelTab"></div>',
              name: 'Box-Shadow Color',
              info: 'The box shadow color',
              create: this.addColorControl,
              parser: this._parseBoxShadowColor,
              attribute: 'box-shadow',
              append: true,
              grouped: true,
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
              // Hover tab item Font Padding
              selector: '.wcPanelTab:hover, .wcPanelTabHover',
              elem: '<div class="wcPanelTab wcPanelTabHover"></div>',
              name: 'Font Padding',
              info: 'The hover padding between text and tab border',
              create: this.addPixelControl,
              attribute: 'padding-left,padding-right',
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
              // Hover tab item border style
              selector: '.wcPanelTab:hover, .wcPanelTabHover',
              elem: '<div class="wcPanelTab wcPanelTabHover"></div>',
              name: 'Border Style',
              info: 'The hover border style of a tab item',
              create: this.addListControl(this._borderStyles),
              attribute: 'border-style',
              value: ''
            }, {
              // Hover tab item border size
              selector: '.wcPanelTab:hover, .wcPanelTabHover',
              elem: '<div class="wcPanelTab wcPanelTabHover"></div>',
              name: 'Border Size',
              info: 'The hover border size of a tab item',
              create: this.addPixelControl,
              attribute: 'border-width',
              value: '0px'
            }, {
              // Hover tab item border radius
              selector: '.wcPanelTab:hover, .wcPanelTabHover',
              elem: '<div class="wcPanelTab wcPanelTabHover"></div>',
              name: 'Border Radius',
              info: 'The hover border radius of a tab item',
              create: this.addPixelControl,
              attribute: 'border-top-left-radius,border-top-right-radius',
              value: '0px'
            }, {
              // Hover tab item border color
              selector: '.wcPanelTab:hover, .wcPanelTabHover',
              elem: '<div class="wcPanelTab wcPanelTabHover"></div>',
              name: 'Border Color',
              info: 'The hover border color of a tab item',
              create: this.addColorControl,
              attribute: 'border-color',
              value: ''
            }, {
              name: '',
              create: this.addSpacer
            }, {
              // Box Shadow style
              selector: '.wcPanelTab:hover, .wcPanelTabHover',
              elem: '<div class="wcPanelTab wcPanelTabHover"></div>',
              name: 'Box-Shadow Style',
              info: 'The box shadow style',
              create: this.addListControl(this._shadowStyle),
              parser: this._parseBoxShadowStyle,
              attribute: 'box-shadow',
              value: ''
            }, {
              // Box Shadow h-shadow
              selector: '.wcPanelTab:hover, .wcPanelTabHover',
              elem: '<div class="wcPanelTab wcPanelTabHover"></div>',
              name: 'Box-Shadow Left Offset',
              info: 'The box shadow horizontal offset from the left (can be negative)',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(1),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow v-shadow
              selector: '.wcPanelTab:hover, .wcPanelTabHover',
              elem: '<div class="wcPanelTab wcPanelTabHover"></div>',
              name: 'Box-Shadow Top Offset',
              info: 'The box shadow vertical offset from the top (can be negative)',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(2),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow Blur
              selector: '.wcPanelTab:hover, .wcPanelTabHover',
              elem: '<div class="wcPanelTab wcPanelTabHover"></div>',
              name: 'Box-Shadow Blur',
              info: 'The box shadow blur',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(3),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow Blur
              selector: '.wcPanelTab:hover, .wcPanelTabHover',
              elem: '<div class="wcPanelTab wcPanelTabHover"></div>',
              name: 'Box-Shadow Spread',
              info: 'The box shadow spread',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(4),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow Color
              selector: '.wcPanelTab:hover, .wcPanelTabHover',
              elem: '<div class="wcPanelTab wcPanelTabHover"></div>',
              name: 'Box-Shadow Color',
              info: 'The box shadow color',
              create: this.addColorControl,
              parser: this._parseBoxShadowColor,
              attribute: 'box-shadow',
              append: true,
              grouped: true,
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
              // Active tab item Font Padding
              selector: '.wcPanelTabActive',
              elem: '<div class="wcPanelTab wcPanelTabActive"></div>',
              name: 'Font Padding',
              info: 'The active padding between text and tab border',
              create: this.addPixelControl,
              attribute: 'padding-left,padding-right',
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
              // Active tab item border style
              selector: '.wcPanelTabActive',
              elem: '<div class="wcPanelTab wcPanelTabActive"></div>',
              name: 'Border Style',
              info: 'The active border style of a tab item',
              create: this.addListControl(this._borderStyles),
              attribute: 'border-style',
              value: ''
            }, {
              // Active tab item border size
              selector: '.wcPanelTabActive',
              elem: '<div class="wcPanelTab wcPanelTabActive"></div>',
              name: 'Border Size',
              info: 'The active border size of a tab item',
              create: this.addPixelControl,
              attribute: 'border-width',
              value: '0px'
            }, {
              // Active tab item border radius
              selector: '.wcPanelTabActive',
              elem: '<div class="wcPanelTab wcPanelTabActive"></div>',
              name: 'Border Radius',
              info: 'The active border radius of a tab item',
              create: this.addPixelControl,
              attribute: 'border-top-left-radius,border-top-right-radius',
              value: '0px'
            }, {
              // Active tab item border color
              selector: '.wcPanelTabActive',
              elem: '<div class="wcPanelTab wcPanelTabActive"></div>',
              name: 'Border Color',
              info: 'The active border color of a tab item',
              create: this.addColorControl,
              attribute: 'border-color',
              value: ''
            }, {
              name: '',
              create: this.addSpacer
            }, {
              // Box Shadow style
              selector: '.wcPanelTabActive',
              elem: '<div class="wcPanelTab wcPanelTabActive"></div>',
              name: 'Box-Shadow Style',
              info: 'The box shadow style',
              create: this.addListControl(this._shadowStyle),
              parser: this._parseBoxShadowStyle,
              attribute: 'box-shadow',
              value: ''
            }, {
              // Box Shadow h-shadow
              selector: '.wcPanelTabActive',
              elem: '<div class="wcPanelTab wcPanelTabActive"></div>',
              name: 'Box-Shadow Left Offset',
              info: 'The box shadow horizontal offset from the left (can be negative)',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(1),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow v-shadow
              selector: '.wcPanelTabActive',
              elem: '<div class="wcPanelTab wcPanelTabActive"></div>',
              name: 'Box-Shadow Top Offset',
              info: 'The box shadow vertical offset from the top (can be negative)',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(2),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow Blur
              selector: '.wcPanelTabActive',
              elem: '<div class="wcPanelTab wcPanelTabActive"></div>',
              name: 'Box-Shadow Blur',
              info: 'The box shadow blur',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(3),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow Blur
              selector: '.wcPanelTabActive',
              elem: '<div class="wcPanelTab wcPanelTabActive"></div>',
              name: 'Box-Shadow Spread',
              info: 'The box shadow spread',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(4),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow Color
              selector: '.wcPanelTabActive',
              elem: '<div class="wcPanelTab wcPanelTabActive"></div>',
              name: 'Box-Shadow Color',
              info: 'The box shadow color',
              create: this.addColorControl,
              parser: this._parseBoxShadowColor,
              attribute: 'box-shadow',
              append: true,
              grouped: true,
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
              // Active Hover tab item Font Padding
              selector: '.wcPanelTabActive:hover, .wcPanelTabActiveHover',
              elem: '<div class="wcPanelTab wcPanelTabActive wcPanelTabActiveHover"></div>',
              name: 'Font Padding',
              info: 'The active hover padding between text and tab border',
              create: this.addPixelControl,
              attribute: 'padding-left,padding-right',
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
              // Active Hover tab item border style
              selector: '.wcPanelTabActive:hover, .wcPanelTabActiveHover',
              elem: '<div class="wcPanelTab wcPanelTabActive wcPanelTabActiveHover"></div>',
              name: 'Border Style',
              info: 'The active hover border style of a tab item',
              create: this.addListControl(this._borderStyles),
              attribute: 'border-style',
              value: ''
            }, {
              // Active Hover tab item border size
              selector: '.wcPanelTabActive:hover, .wcPanelTabActiveHover',
              elem: '<div class="wcPanelTab wcPanelTabActive wcPanelTabActiveHover"></div>',
              name: 'Border Size',
              info: 'The active hover border size of a tab item',
              create: this.addPixelControl,
              attribute: 'border-width',
              value: '0px'
            }, {
              // Active Hover tab item border radius
              selector: '.wcPanelTabActive:hover, .wcPanelTabActiveHover',
              elem: '<div class="wcPanelTab wcPanelTabActive wcPanelTabActiveHover"></div>',
              name: 'Border Radius',
              info: 'The active hover border radius of a tab item',
              create: this.addPixelControl,
              attribute: 'border-top-left-radius,border-top-right-radius',
              value: '0px'
            }, {
              // Active Hover tab item border color
              selector: '.wcPanelTabActive:hover, .wcPanelTabActiveHover',
              elem: '<div class="wcPanelTab wcPanelTabActive wcPanelTabActiveHover"></div>',
              name: 'Border Color',
              info: 'The active hover border color of a tab item',
              create: this.addColorControl,
              attribute: 'border-color',
              value: ''
            }, {
              name: '',
              create: this.addSpacer
            }, {
              // Box Shadow style
              selector: '.wcPanelTabActive:hover, .wcPanelTabActiveHover',
              elem: '<div class="wcPanelTab wcPanelTabActive wcPanelTabActiveHover"></div>',
              name: 'Box-Shadow Style',
              info: 'The box shadow style',
              create: this.addListControl(this._shadowStyle),
              parser: this._parseBoxShadowStyle,
              attribute: 'box-shadow',
              value: ''
            }, {
              // Box Shadow h-shadow
              selector: '.wcPanelTabActive:hover, .wcPanelTabActiveHover',
              elem: '<div class="wcPanelTab wcPanelTabActive wcPanelTabActiveHover"></div>',
              name: 'Box-Shadow Left Offset',
              info: 'The box shadow horizontal offset from the left (can be negative)',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(1),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow v-shadow
              selector: '.wcPanelTabActive:hover, .wcPanelTabActiveHover',
              elem: '<div class="wcPanelTab wcPanelTabActive wcPanelTabActiveHover"></div>',
              name: 'Box-Shadow Top Offset',
              info: 'The box shadow vertical offset from the top (can be negative)',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(2),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow Blur
              selector: '.wcPanelTabActive:hover, .wcPanelTabActiveHover',
              elem: '<div class="wcPanelTab wcPanelTabActive wcPanelTabActiveHover"></div>',
              name: 'Box-Shadow Blur',
              info: 'The box shadow blur',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(3),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow Blur
              selector: '.wcPanelTabActive:hover, .wcPanelTabActiveHover',
              elem: '<div class="wcPanelTab wcPanelTabActive wcPanelTabActiveHover"></div>',
              name: 'Box-Shadow Spread',
              info: 'The box shadow spread',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(4),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow Color
              selector: '.wcPanelTabActive:hover, .wcPanelTabActiveHover',
              elem: '<div class="wcPanelTab wcPanelTabActive wcPanelTabActiveHover"></div>',
              name: 'Box-Shadow Color',
              info: 'The box shadow color',
              create: this.addColorControl,
              parser: this._parseBoxShadowColor,
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: ''
            }]
          }]
        }]
      }, {
        // -----------------------------------------------------------------------------------------------------------------
        // -----------------------------------------------------------------------------------------------------------------
        // -----------------------------------------------------------------------------------------------------------------
        name: 'Menus',
        scrollable: true,
        create: this.addTab,
        controls: [{
          name: 'Context Menu',
          create: this.addSpacer
        }, {
          // Menu Border Style
          selector: '.wcMenuList, .context-menu-list',
          elem: '<ul class="context-menu-list"></ul>',
          name: 'Border Style',
          info: 'The border style of the context menu',
          create: this.addListControl(this._borderStyles),
          attribute: 'border-style',
          value: ''
        }, {
          // Menu Border Size
          selector: '.wcMenuList, .context-menu-list',
          elem: '<ul class="context-menu-list"></ul>',
          name: 'Border Size',
          info: 'The border size of the context menu',
          create: this.addPixelControl,
          attribute: 'border-width',
          value: '0px'
        }, {
          // Menu Border Color
          selector: '.wcMenuList, .context-menu-list',
          elem: '<ul class="context-menu-list"></ul>',
          name: 'Border Color',
          info: 'The border color of the context menu',
          create: this.addColorControl,
          attribute: 'border-color',
          value: ''
        }, {
          name: '',
          create: this.addSpacer
        }, {
          name: 'Menu Separator Bar',
          create: this.addSpacer
        }, {
          // Menu Separator Color
          selector: '.wcMenuSeparator, .context-menu-separator',
          elem: '<li class="context-menu-separator"></li>',
          name: 'Color',
          info: 'The background color of the context menu separator bar',
          create: this.addColorControl,
          attribute: 'background-color',
          value: ''
        }, {
          // Menu Separator Border Style
          selector: '.wcMenuSeparator, .context-menu-separator',
          elem: '<li class="context-menu-separator"></li>',
          name: 'Border Style',
          info: 'The border style of the context menu separator bar',
          create: this.addListControl(this._borderStyles),
          attribute: 'border-style',
          value: ''
        }, {
          // Menu Separator Border Size
          selector: '.wcMenuSeparator, .context-menu-separator',
          elem: '<li class="context-menu-separator"></li>',
          name: 'Border Size',
          info: 'The border size of the context menu separator bar',
          create: this.addPixelControl,
          attribute: 'border-width',
          value: '0px'
        }, {
          // Menu Separator Border Color
          selector: '.wcMenuSeparator, .context-menu-separator',
          elem: '<li class="context-menu-separator"></li>',
          name: 'Border Color',
          info: 'The border color of the context menu separator bar',
          create: this.addColorControl,
          attribute: 'border-color',
          value: ''
        }, {
          name: '',
          create: this.addSpacer
        }, {
          name: 'Menu Items',
          create: this.addSpacer
        }, {
          // -----------------------------------------------------------------------------------------------------------------
          // -----------------------------------------------------------------------------------------------------------------
          create: this.addTabFrame,
          controls: [{
            name: 'Menu Normal State',
            create: this.addTab,
            controls: [{
              name: 'Menu Normal State',
              create: this.addSpacer
            }, {
              // Menu Font Family
              selector: '.wcMenuList, .wcMenuItem, .context-menu-list, .context-menu-item',
              elem: '<li class="context-menu-list context-menu-item"></li>',
              name: 'Font Family',
              info: 'The normal font family of the context menu.',
              create: this.addTextControl,
              attribute: 'font-family',
              value: ''
            }, {
              // Menu Font Weight
              selector: '.wcMenuList, .wcMenuItem, .context-menu-list, .context-menu-item',
              elem: '<li class="context-menu-list context-menu-item"></li>',
              name: 'Font Weight',
              info: 'The normal font weight of the context menu.',
              create: this.addListControl(this._fontWeights),
              attribute: 'font-weight',
              value: ''
            }, {
              // Menu Font Size
              selector: '.wcMenuList, .wcMenuItem, .context-menu-list, .context-menu-item',
              elem: '<li class="context-menu-list context-menu-item"></li>',
              name: 'Font Size',
              info: 'The normal font size of the context menu.',
              create: this.addPixelControl,
              attribute: 'font-size',
              value: ''
            }, {
              // Menu Font Color
              selector: '.wcMenuList, .wcMenuItem, .context-menu-list, .context-menu-item',
              elem: '<li class="context-menu-list context-menu-item"></li>',
              name: 'Font Color',
              info: 'The normal font color of the context menu.',
              create: this.addColorControl,
              attribute: 'color',
              value: ''
            }, {
              name: '',
              create: this.addSpacer
            }, {
              // Menu Color
              selector: '.wcMenuList, .wcMenuItem, .context-menu-list, .context-menu-item',
              elem: '<li class="context-menu-list context-menu-item"></li>',
              name: 'Color',
              info: 'The normal background color of the context menu',
              create: this.addColorControl,
              attribute: 'background-color',
              value: ''
            }]
          }, {
            name: 'Menu Hover State',
            create: this.addTab,
            controls: [{
              name: 'Menu Hover State',
              create: this.addSpacer
            }, {
              // Menu Font Family
              selector: '.wcMenuItemHover, .wcMenuItem:hover, .context-menu-item.hover',
              elem: '<li class="context-menu-list context-menu-item wcMenuItemHover"></li>',
              name: 'Font Family',
              info: 'The hover font family of the context menu.',
              create: this.addTextControl,
              attribute: 'font-family',
              value: ''
            }, {
              // Menu Font Weight
              selector: '.wcMenuItemHover, .wcMenuItem:hover, .context-menu-item.hover',
              elem: '<li class="context-menu-list context-menu-item wcMenuItemHover"></li>',
              name: 'Font Weight',
              info: 'The hover font weight of the context menu.',
              create: this.addListControl(this._fontWeights),
              attribute: 'font-weight',
              value: ''
            }, {
              // Menu Font Size
              selector: '.wcMenuItemHover, .wcMenuItem:hover, .context-menu-item.hover',
              elem: '<li class="context-menu-list context-menu-item wcMenuItemHover"></li>',
              name: 'Font Size',
              info: 'The hover font size of the context menu.',
              create: this.addPixelControl,
              attribute: 'font-size',
              value: ''
            }, {
              // Menu Font Color
              selector: '.wcMenuItemHover, .wcMenuItem:hover, .context-menu-item.hover',
              elem: '<li class="context-menu-list context-menu-item wcMenuItemHover"></li>',
              name: 'Font Color',
              info: 'The hover font color of the context menu.',
              create: this.addColorControl,
              attribute: 'color',
              value: ''
            }, {
              name: '',
              create: this.addSpacer
            }, {
              // Menu Color
              selector: '.wcMenuItemHover, .wcMenuItem:hover, .context-menu-item.hover',
              elem: '<li class="context-menu-list context-menu-item wcMenuItemHover"></li>',
              name: 'Color',
              info: 'The hover background color of the context menu',
              create: this.addColorControl,
              attribute: 'background-color',
              value: ''
            }]
          }, {
            name: 'Menu Disabled State',
            create: this.addTab,
            controls: [{
              name: 'Menu Disabled State',
              create: this.addSpacer
            }, {
              // Menu Font Family
              selector: '.wcMenuItem.disabled, .context-menu-item.disabled',
              elem: '<li class="context-menu-list context-menu-item disabled"></li>',
              name: 'Font Family',
              info: 'The disabled font family of the context menu.',
              create: this.addTextControl,
              attribute: 'font-family',
              value: ''
            }, {
              // Menu Font Weight
              selector: '.wcMenuItem.disabled, .context-menu-item.disabled',
              elem: '<li class="context-menu-list context-menu-item disabled"></li>',
              name: 'Font Weight',
              info: 'The disabled font weight of the context menu.',
              create: this.addListControl(this._fontWeights),
              attribute: 'font-weight',
              value: ''
            }, {
              // Menu Font Size
              selector: '.wcMenuItem.disabled, .context-menu-item.disabled',
              elem: '<li class="context-menu-list context-menu-item disabled"></li>',
              name: 'Font Size',
              info: 'The disabled font size of the context menu.',
              create: this.addPixelControl,
              attribute: 'font-size',
              value: ''
            }, {
              // Menu Font Color
              selector: '.wcMenuItem.disabled, .context-menu-item.disabled',
              elem: '<li class="context-menu-list context-menu-item disabled"></li>',
              name: 'Font Color',
              info: 'The disabled font color of the context menu.',
              create: this.addColorControl,
              attribute: 'color',
              value: ''
            }, {
              name: '',
              create: this.addSpacer
            }, {
              // Menu Color
              selector: '.wcMenuItem.disabled, .context-menu-item.disabled',
              elem: '<li class="context-menu-list context-menu-item disabled"></li>',
              name: 'Color',
              info: 'The disabled background color of the context menu',
              create: this.addColorControl,
              attribute: 'background-color',
              value: ''
            }]
          }]
        }]
      }, {
        // -----------------------------------------------------------------------------------------------------------------
        // -----------------------------------------------------------------------------------------------------------------
        // -----------------------------------------------------------------------------------------------------------------
        name: 'Scrollbar',
        scrollable: true,
        create: this.addTab,
        controls: [{
          name: 'Scrollbar (Chrome Only)',
          create: this.addSpacer
        }, {
          // Scrollbar Size
          selector: '.wcScrollbar, ::-webkit-scrollbar',
          elem: '<div class="wcScrollbar"></div>',
          name: 'Size',
          info: 'The thickness of the scrollbar',
          create: this.addPixelControl,
          attribute: 'width,height',
          value: ''
        }, {
          // Scrollbar Color
          selector: '.wcScrollbar, ::-webkit-scrollbar, .wcScrollbarCorner, ::-webkit-scrollbar-corner',
          elem: '<div class="wcScrollbar"></div>',
          name: 'Color',
          info: 'The color of the scrollbar',
          create: this.addColorControl,
          attribute: 'background-color',
          value: ''
        }, {
          name: '',
          create: this.addSpacer
        }, {
          // Scrollbar Border Style
          selector: '.wcScrollbarTrack, ::-webkit-scrollbar-track',
          elem: '<div class="wcScrollbarTrack"></div>',
          name: 'Border Style',
          info: 'The border style of the scrollbar track',
          create: this.addListControl(this._borderStyles),
          attribute: 'border-style',
          value: ''
        }, {
          // Scrollbar Border Size
          selector: '.wcScrollbarTrack, ::-webkit-scrollbar-track',
          elem: '<div class="wcScrollbarTrack"></div>',
          name: 'Border Size',
          info: 'The border size of the scrollbar track',
          create: this.addPixelControl,
          attribute: 'border-width',
          value: '0px'
        }, {
          // Scrollbar Border Radius
          selector: '.wcScrollbarTrack, ::-webkit-scrollbar-track',
          elem: '<div class="wcScrollbarTrack"></div>',
          name: 'Border Radius',
          info: 'The border radius of the scrollbar track',
          create: this.addPixelControl,
          attribute: 'border-radius',
          value: '0px'
        }, {
          // Scrollbar Border Color
          selector: '.wcScrollbarTrack, ::-webkit-scrollbar-track',
          elem: '<div class="wcScrollbarTrack"></div>',
          name: 'Border Color',
          info: 'The border color of the scrollbar track',
          create: this.addColorControl,
          attribute: 'border-color',
          value: ''
        }, {
          name: '',
          create: this.addSpacer
        }, {
          // Box Shadow style
          selector: '.wcScrollbarTrack, ::-webkit-scrollbar-track',
          elem: '<div class="wcScrollbarTrack"></div>',
          name: 'Box-Shadow Style',
          info: 'The box shadow style',
          create: this.addListControl(this._shadowStyle),
          parser: this._parseBoxShadowStyle,
          attribute: 'box-shadow',
          value: ''
        }, {
          // Box Shadow h-shadow
          selector: '.wcScrollbarTrack, ::-webkit-scrollbar-track',
          elem: '<div class="wcScrollbarTrack"></div>',
          name: 'Box-Shadow Left Offset',
          info: 'The box shadow horizontal offset from the left (can be negative)',
          create: this.addPixelControl,
          parser: this._parseBoxShadowAttribute(1),
          attribute: 'box-shadow',
          append: true,
          grouped: true,
          value: '0px'
        }, {
          // Box Shadow v-shadow
          selector: '.wcScrollbarTrack, ::-webkit-scrollbar-track',
          elem: '<div class="wcScrollbarTrack"></div>',
          name: 'Box-Shadow Top Offset',
          info: 'The box shadow vertical offset from the top (can be negative)',
          create: this.addPixelControl,
          parser: this._parseBoxShadowAttribute(2),
          attribute: 'box-shadow',
          append: true,
          grouped: true,
          value: '0px'
        }, {
          // Box Shadow Blur
          selector: '.wcScrollbarTrack, ::-webkit-scrollbar-track',
          elem: '<div class="wcScrollbarTrack"></div>',
          name: 'Box-Shadow Blur',
          info: 'The box shadow blur',
          create: this.addPixelControl,
          parser: this._parseBoxShadowAttribute(3),
          attribute: 'box-shadow',
          append: true,
          grouped: true,
          value: '0px'
        }, {
          // Box Shadow Blur
          selector: '.wcScrollbarTrack, ::-webkit-scrollbar-track',
          elem: '<div class="wcScrollbarTrack"></div>',
          name: 'Box-Shadow Spread',
          info: 'The box shadow spread',
          create: this.addPixelControl,
          parser: this._parseBoxShadowAttribute(4),
          attribute: 'box-shadow',
          append: true,
          grouped: true,
          value: '0px'
        }, {
          // Box Shadow Color
          selector: '.wcScrollbarTrack, ::-webkit-scrollbar-track',
          elem: '<div class="wcScrollbarTrack"></div>',
          name: 'Box-Shadow Color',
          info: 'The box shadow color',
          create: this.addColorControl,
          parser: this._parseBoxShadowColor,
          attribute: 'box-shadow',
          append: true,
          grouped: true,
          value: ''
        }, {
          name: '',
          create: this.addSpacer
        }, {
          name: 'Scrollbar Thumb Control (Chrome Only)',
          create: this.addSpacer
        }, {
          // -----------------------------------------------------------------------------------------------------------------
          // -----------------------------------------------------------------------------------------------------------------
          create: this.addTabFrame,
          controls: [{
            name: 'Thumb Normal State',
            create: this.addTab,
            controls: [{
              name: 'Thumb Normal State',
              create: this.addSpacer
            }, {
              // Normal Border Style
              selector: '.wcScrollbarThumb, ::-webkit-scrollbar-thumb',
              elem: '<div class="wcScrollbarThumb"></div>',
              name: 'Border Style',
              info: 'The normal border style of the scrollbar thumb control',
              create: this.addListControl(this._borderStyles),
              attribute: 'border-style',
              value: ''
            }, {
              // Normal Thumb Border Size
              selector: '.wcScrollbarThumb, ::-webkit-scrollbar-thumb',
              elem: '<div class="wcScrollbarThumb"></div>',
              name: 'Border Size',
              info: 'The normal border size of the scrollbar thumb control',
              create: this.addPixelControl,
              attribute: 'border-width',
              value: '0px'
            }, {
              // Normal Thumb Track Radius
              selector: '.wcScrollbarThumb, ::-webkit-scrollbar-thumb',
              elem: '<div class="wcScrollbarThumb"></div>',
              name: 'Border Radius',
              info: 'The normal border radius of the scrollbar thumb control',
              create: this.addPixelControl,
              attribute: 'border-radius',
              value: '0px'
            }, {
              // Normal Border Color
              selector: '.wcScrollbarThumb, ::-webkit-scrollbar-thumb',
              elem: '<div class="wcScrollbarThumb"></div>',
              name: 'Border Color',
              info: 'The normal border color of the scrollbar thumb control',
              create: this.addColorControl,
              attribute: 'border-color',
              value: ''
            }, {
              name: '',
              create: this.addSpacer
            }, {
              // Box Shadow style
              selector: '.wcScrollbarThumb, ::-webkit-scrollbar-thumb',
              elem: '<div class="wcScrollbarThumb"></div>',
              name: 'Box-Shadow Style',
              info: 'The box shadow style',
              create: this.addListControl(this._shadowStyle),
              parser: this._parseBoxShadowStyle,
              attribute: 'box-shadow',
              value: ''
            }, {
              // Box Shadow h-shadow
              selector: '.wcScrollbarThumb, ::-webkit-scrollbar-thumb',
              elem: '<div class="wcScrollbarThumb"></div>',
              name: 'Box-Shadow Left Offset',
              info: 'The box shadow horizontal offset from the left (can be negative)',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(1),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow v-shadow
              selector: '.wcScrollbarThumb, ::-webkit-scrollbar-thumb',
              elem: '<div class="wcScrollbarThumb"></div>',
              name: 'Box-Shadow Top Offset',
              info: 'The box shadow vertical offset from the top (can be negative)',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(2),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow Blur
              selector: '.wcScrollbarThumb, ::-webkit-scrollbar-thumb',
              elem: '<div class="wcScrollbarThumb"></div>',
              name: 'Box-Shadow Blur',
              info: 'The box shadow blur',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(3),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow Blur
              selector: '.wcScrollbarThumb, ::-webkit-scrollbar-thumb',
              elem: '<div class="wcScrollbarThumb"></div>',
              name: 'Box-Shadow Spread',
              info: 'The box shadow spread',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(4),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow Color
              selector: '.wcScrollbarThumb, ::-webkit-scrollbar-thumb',
              elem: '<div class="wcScrollbarThumb"></div>',
              name: 'Box-Shadow Color',
              info: 'The box shadow color',
              create: this.addColorControl,
              parser: this._parseBoxShadowColor,
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: ''
            }]
          }, {
            name: 'Thumb Hover State',
            create: this.addTab,
            controls: [{
              name: 'Thumb Hover State',
              create: this.addSpacer
            }, {
              // Normal Border Style
              selector: '.wcScrollbarThumbHover, .wcScrollBarThumb:hover, ::-webkit-scrollbar-thumb:hover',
              elem: '<div class="wcScrollbarThumb wcScrollbarThumbHover"></div>',
              name: 'Border Style',
              info: 'The normal border style of the scrollbar thumb control',
              create: this.addListControl(this._borderStyles),
              attribute: 'border-style',
              value: ''
            }, {
              // Normal Thumb Border Size
              selector: '.wcScrollbarThumbHover, .wcScrollBarThumb:hover, ::-webkit-scrollbar-thumb:hover',
              elem: '<div class="wcScrollbarThumb wcScrollbarThumbHover"></div>',
              name: 'Border Size',
              info: 'The normal border size of the scrollbar thumb control',
              create: this.addPixelControl,
              attribute: 'border-width',
              value: '0px'
            }, {
              // Normal Thumb Track Radius
              selector: '.wcScrollbarThumbHover, .wcScrollBarThumb:hover, ::-webkit-scrollbar-thumb:hover',
              elem: '<div class="wcScrollbarThumb wcScrollbarThumbHover"></div>',
              name: 'Border Radius',
              info: 'The normal border radius of the scrollbar thumb control',
              create: this.addPixelControl,
              attribute: 'border-radius',
              value: '0px'
            }, {
              // Normal Border Color
              selector: '.wcScrollbarThumbHover, .wcScrollBarThumb:hover, ::-webkit-scrollbar-thumb:hover',
              elem: '<div class="wcScrollbarThumb wcScrollbarThumbHover"></div>',
              name: 'Border Color',
              info: 'The normal border color of the scrollbar thumb control',
              create: this.addColorControl,
              attribute: 'border-color',
              value: ''
            }, {
              name: '',
              create: this.addSpacer
            }, {
              // Box Shadow style
              selector: '.wcScrollbarThumbHover, .wcScrollBarThumb:hover, ::-webkit-scrollbar-thumb:hover',
              elem: '<div class="wcScrollbarThumb wcScrollbarThumbHover"></div>',
              name: 'Box-Shadow Style',
              info: 'The box shadow style',
              create: this.addListControl(this._shadowStyle),
              parser: this._parseBoxShadowStyle,
              attribute: 'box-shadow',
              value: ''
            }, {
              // Box Shadow h-shadow
              selector: '.wcScrollbarThumbHover, .wcScrollBarThumb:hover, ::-webkit-scrollbar-thumb:hover',
              elem: '<div class="wcScrollbarThumb wcScrollbarThumbHover"></div>',
              name: 'Box-Shadow Left Offset',
              info: 'The box shadow horizontal offset from the left (can be negative)',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(1),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow v-shadow
              selector: '.wcScrollbarThumbHover, .wcScrollBarThumb:hover, ::-webkit-scrollbar-thumb:hover',
              elem: '<div class="wcScrollbarThumb wcScrollbarThumbHover"></div>',
              name: 'Box-Shadow Top Offset',
              info: 'The box shadow vertical offset from the top (can be negative)',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(2),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow Blur
              selector: '.wcScrollbarThumbHover, .wcScrollBarThumb:hover, ::-webkit-scrollbar-thumb:hover',
              elem: '<div class="wcScrollbarThumb wcScrollbarThumbHover"></div>',
              name: 'Box-Shadow Blur',
              info: 'The box shadow blur',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(3),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow Blur
              selector: '.wcScrollbarThumbHover, .wcScrollBarThumb:hover, ::-webkit-scrollbar-thumb:hover',
              elem: '<div class="wcScrollbarThumb wcScrollbarThumbHover"></div>',
              name: 'Box-Shadow Spread',
              info: 'The box shadow spread',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(4),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow Color
              selector: '.wcScrollbarThumbHover, .wcScrollBarThumb:hover, ::-webkit-scrollbar-thumb:hover',
              elem: '<div class="wcScrollbarThumb wcScrollbarThumbHover"></div>',
              name: 'Box-Shadow Color',
              info: 'The box shadow color',
              create: this.addColorControl,
              parser: this._parseBoxShadowColor,
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: ''
            }]
          }, {
            name: 'Thumb Active State',
            create: this.addTab,
            controls: [{
              name: 'Thumb Active State',
              create: this.addSpacer
            }, {
              // Normal Border Style
              selector: '.wcScrollbarThumbActive, .wcScrollBarThumb:active, ::-webkit-scrollbar-thumb:active',
              elem: '<div class="wcScrollbarThumb wcScrollbarThumbActive"></div>',
              name: 'Border Style',
              info: 'The normal border style of the scrollbar thumb control',
              create: this.addListControl(this._borderStyles),
              attribute: 'border-style',
              value: ''
            }, {
              // Normal Thumb Border Size
              selector: '.wcScrollbarThumbActive, .wcScrollBarThumb:active, ::-webkit-scrollbar-thumb:active',
              elem: '<div class="wcScrollbarThumb wcScrollbarThumbActive"></div>',
              name: 'Border Size',
              info: 'The normal border size of the scrollbar thumb control',
              create: this.addPixelControl,
              attribute: 'border-width',
              value: '0px'
            }, {
              // Normal Thumb Track Radius
              selector: '.wcScrollbarThumbActive, .wcScrollBarThumb:active, ::-webkit-scrollbar-thumb:active',
              elem: '<div class="wcScrollbarThumb wcScrollbarThumbActive"></div>',
              name: 'Border Radius',
              info: 'The normal border radius of the scrollbar thumb control',
              create: this.addPixelControl,
              attribute: 'border-radius',
              value: '0px'
            }, {
              // Normal Border Color
              selector: '.wcScrollbarThumbActive, .wcScrollBarThumb:active, ::-webkit-scrollbar-thumb:active',
              elem: '<div class="wcScrollbarThumb wcScrollbarThumbActive"></div>',
              name: 'Border Color',
              info: 'The normal border color of the scrollbar thumb control',
              create: this.addColorControl,
              attribute: 'border-color',
              value: ''
            }, {
              name: '',
              create: this.addSpacer
            }, {
              // Box Shadow style
              selector: '.wcScrollbarThumbActive, .wcScrollBarThumb:active, ::-webkit-scrollbar-thumb:active',
              elem: '<div class="wcScrollbarThumb wcScrollbarThumbActive"></div>',
              name: 'Box-Shadow Style',
              info: 'The box shadow style',
              create: this.addListControl(this._shadowStyle),
              parser: this._parseBoxShadowStyle,
              attribute: 'box-shadow',
              value: ''
            }, {
              // Box Shadow h-shadow
              selector: '.wcScrollbarThumbActive, .wcScrollBarThumb:active, ::-webkit-scrollbar-thumb:active',
              elem: '<div class="wcScrollbarThumb wcScrollbarThumbActive"></div>',
              name: 'Box-Shadow Left Offset',
              info: 'The box shadow horizontal offset from the left (can be negative)',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(1),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow v-shadow
              selector: '.wcScrollbarThumbActive, .wcScrollBarThumb:active, ::-webkit-scrollbar-thumb:active',
              elem: '<div class="wcScrollbarThumb wcScrollbarThumbActive"></div>',
              name: 'Box-Shadow Top Offset',
              info: 'The box shadow vertical offset from the top (can be negative)',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(2),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow Blur
              selector: '.wcScrollbarThumbActive, .wcScrollBarThumb:active, ::-webkit-scrollbar-thumb:active',
              elem: '<div class="wcScrollbarThumb wcScrollbarThumbActive"></div>',
              name: 'Box-Shadow Blur',
              info: 'The box shadow blur',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(3),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow Blur
              selector: '.wcScrollbarThumbActive, .wcScrollBarThumb:active, ::-webkit-scrollbar-thumb:active',
              elem: '<div class="wcScrollbarThumb wcScrollbarThumbActive"></div>',
              name: 'Box-Shadow Spread',
              info: 'The box shadow spread',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(4),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow Color
              selector: '.wcScrollbarThumbActive, .wcScrollBarThumb:active, ::-webkit-scrollbar-thumb:active',
              elem: '<div class="wcScrollbarThumb wcScrollbarThumbActive"></div>',
              name: 'Box-Shadow Color',
              info: 'The box shadow color',
              create: this.addColorControl,
              parser: this._parseBoxShadowColor,
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: ''
            }]
          }]
        }]
      }, {
        // -----------------------------------------------------------------------------------------------------------------
        // -----------------------------------------------------------------------------------------------------------------
        // -----------------------------------------------------------------------------------------------------------------
        name: 'Controls',
        scrollable: true,
        create: this.addTab,
        controls: [{
          create: this.addTabFrame,
          controls: [{
            name: 'Inputs',
            create: this.addTab,
            controls: [{
              name: 'Input Controls',
              create: this.addSpacer
            }, {
              // Font Family
              selector: '.wcInput, input',
              elem: '<input class="wcInput"/>',
              name: 'Font Family',
              info: 'The font family of the control',
              create: this.addTextControl,
              attribute: 'font-family',
              value: ''
            }, {
              // Font Weight
              selector: '.wcInput, input',
              elem: '<input class="wcInput"/>',
              name: 'Font Weight',
              info: 'The font weight of the control',
              create: this.addListControl(this._fontWeights),
              attribute: 'font-weight',
              value: ''
            }, {
              // Font Size
              selector: '.wcInput, input',
              elem: '<input class="wcInput"/>',
              name: 'Font Size',
              info: 'The font size of the control',
              create: this.addPixelControl,
              attribute: 'font-size',
              value: ''
            }, {
              // Font Color
              selector: '.wcInput, input',
              elem: '<input class="wcInput"/>',
              name: 'Font Color',
              info: 'The font color of the control',
              create: this.addColorControl,
              attribute: 'color',
              value: ''
            }, {
              name: '',
              create: this.addSpacer
            }, {
              // Background Color
              selector: '.wcInput, input',
              elem: '<input class="wcInput"/>',
              name: 'Color',
              info: 'The color of the control',
              create: this.addColorControl,
              attribute: 'background-color',
              value: ''
            }, {
              name: '',
              create: this.addSpacer
            }, {
              // Border Style
              selector: '.wcInput, input',
              elem: '<input class="wcInput"/>',
              name: 'Border Style',
              info: 'The border style of the control',
              create: this.addListControl(this._borderStyles),
              attribute: 'border-style',
              value: ''
            }, {
              // Border Size
              selector: '.wcInput, input',
              elem: '<input class="wcInput"/>',
              name: 'Border Size',
              info: 'The border size of the control',
              create: this.addPixelControl,
              attribute: 'border-width',
              value: '0px'
            }, {
              // Border Radius
              selector: '.wcInput, input',
              elem: '<input class="wcInput"/>',
              name: 'Border Radius',
              info: 'The border radius of the control',
              create: this.addPixelControl,
              attribute: 'border-radius',
              value: '0px'
            }, {
              // Border Color
              selector: '.wcInput, input',
              elem: '<input class="wcInput"/>',
              name: 'Border Color',
              info: 'The border color of the control',
              create: this.addColorControl,
              attribute: 'border-color',
              value: ''
            }, {
              name: '',
              create: this.addSpacer
            }, {
              // Box Shadow style
              selector: '.wcInput, input',
              elem: '<input class="wcInput"/>',
              name: 'Box-Shadow Style',
              info: 'The box shadow style',
              create: this.addListControl(this._shadowStyle),
              parser: this._parseBoxShadowStyle,
              attribute: 'box-shadow',
              value: ''
            }, {
              // Box Shadow h-shadow
              selector: '.wcInput, input',
              elem: '<input class="wcInput"/>',
              name: 'Box-Shadow Left Offset',
              info: 'The box shadow horizontal offset from the left (can be negative)',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(1),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow v-shadow
              selector: '.wcInput, input',
              elem: '<input class="wcInput"/>',
              name: 'Box-Shadow Top Offset',
              info: 'The box shadow vertical offset from the top (can be negative)',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(2),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow Blur
              selector: '.wcInput, input',
              elem: '<input class="wcInput"/>',
              name: 'Box-Shadow Blur',
              info: 'The box shadow blur',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(3),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow Blur
              selector: '.wcInput, input',
              elem: '<input class="wcInput"/>',
              name: 'Box-Shadow Spread',
              info: 'The box shadow spread',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(4),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow Color
              selector: '.wcInput, input',
              elem: '<input class="wcInput"/>',
              name: 'Box-Shadow Color',
              info: 'The box shadow color',
              create: this.addColorControl,
              parser: this._parseBoxShadowColor,
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: ''
            }]
          }, {
            name: 'Combo Boxes',
            create: this.addTab,
            controls: [{
              name: 'Combo Box Controls',
              create: this.addSpacer
            }, {
              // Font Family
              selector: '.wcSelect, select',
              elem: '<select class="wcSelect"></select>',
              name: 'Font Family',
              info: 'The font family of the control',
              create: this.addTextControl,
              attribute: 'font-family',
              value: ''
            }, {
              // Font Weight
              selector: '.wcSelect, select',
              elem: '<select class="wcSelect"></select>',
              name: 'Font Weight',
              info: 'The font weight of the control',
              create: this.addListControl(this._fontWeights),
              attribute: 'font-weight',
              value: ''
            }, {
              // Font Size
              selector: '.wcSelect, select',
              elem: '<select class="wcSelect"></select>',
              name: 'Font Size',
              info: 'The font size of the control',
              create: this.addPixelControl,
              attribute: 'font-size',
              value: ''
            }, {
              // Font Color
              selector: '.wcSelect, select',
              elem: '<select class="wcSelect"></select>',
              name: 'Font Color',
              info: 'The font color of the control',
              create: this.addColorControl,
              attribute: 'color',
              value: ''
            }, {
              name: '',
              create: this.addSpacer
            }, {
              // Background Color
              selector: '.wcSelect, select',
              elem: '<select class="wcSelect"></select>',
              name: 'Color',
              info: 'The color of the control',
              create: this.addColorControl,
              attribute: 'background-color',
              value: ''
            }, {
              name: '',
              create: this.addSpacer
            }, {
              // Border Style
              selector: '.wcSelect, select',
              elem: '<select class="wcSelect"></select>',
              name: 'Border Style',
              info: 'The border style of the control',
              create: this.addListControl(this._borderStyles),
              attribute: 'border-style',
              value: ''
            }, {
              // Border Size
              selector: '.wcSelect, select',
              elem: '<select class="wcSelect"></select>',
              name: 'Border Size',
              info: 'The border size of the control',
              create: this.addPixelControl,
              attribute: 'border-width',
              value: '0px'
            }, {
              // Border Radius
              selector: '.wcSelect, select',
              elem: '<select class="wcSelect"></select>',
              name: 'Border Radius',
              info: 'The border radius of the control',
              create: this.addPixelControl,
              attribute: 'border-radius',
              value: '0px'
            }, {
              // Border Color
              selector: '.wcSelect, select',
              elem: '<select class="wcSelect"></select>',
              name: 'Border Color',
              info: 'The border color of the control',
              create: this.addColorControl,
              attribute: 'border-color',
              value: ''
            }, {
              name: '',
              create: this.addSpacer
            }, {
              // Box Shadow style
              selector: '.wcSelect, select',
              elem: '<select class="wcSelect"></select>',
              name: 'Box-Shadow Style',
              info: 'The box shadow style',
              create: this.addListControl(this._shadowStyle),
              parser: this._parseBoxShadowStyle,
              attribute: 'box-shadow',
              value: ''
            }, {
              // Box Shadow h-shadow
              selector: '.wcSelect, select',
              elem: '<select class="wcSelect"></select>',
              name: 'Box-Shadow Left Offset',
              info: 'The box shadow horizontal offset from the left (can be negative)',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(1),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow v-shadow
              selector: '.wcSelect, select',
              elem: '<select class="wcSelect"></select>',
              name: 'Box-Shadow Top Offset',
              info: 'The box shadow vertical offset from the top (can be negative)',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(2),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow Blur
              selector: '.wcSelect, select',
              elem: '<select class="wcSelect"></select>',
              name: 'Box-Shadow Blur',
              info: 'The box shadow blur',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(3),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow Blur
              selector: '.wcSelect, select',
              elem: '<select class="wcSelect"></select>',
              name: 'Box-Shadow Spread',
              info: 'The box shadow spread',
              create: this.addPixelControl,
              parser: this._parseBoxShadowAttribute(4),
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: '0px'
            }, {
              // Box Shadow Color
              selector: '.wcSelect, select',
              elem: '<select class="wcSelect"></select>',
              name: 'Box-Shadow Color',
              info: 'The box shadow color',
              create: this.addColorControl,
              parser: this._parseBoxShadowColor,
              attribute: 'box-shadow',
              append: true,
              grouped: true,
              value: ''
            }]
          }, {
            name: 'Buttons',
            create: this.addTab,
            controls: [{
              name: 'Button Controls',
              create: this.addSpacer
            }, {
              create: this.addTabFrame,
              controls: [{
                name: 'Button Normal State',
                create: this.addTab,
                controls: [{
                  name: 'Button Normal State',
                  create: this.addSpacer
                }, {
                  // Hidden remove focus outline.
                  selector: '.wcButton:focus, button:focus',
                  attribute: 'outline',
                  value: '0'
                }, {
                  // Font Family
                  selector: '.wcButton, button',
                  elem: '<button class="wcButton"></button>',
                  name: 'Font Family',
                  info: 'The font family of the control',
                  create: this.addTextControl,
                  attribute: 'font-family',
                  value: ''
                }, {
                  // Font Weight
                  selector: '.wcButton, button',
                  elem: '<button class="wcButton"></button>',
                  name: 'Font Weight',
                  info: 'The font weight of the control',
                  create: this.addListControl(this._fontWeights),
                  attribute: 'font-weight',
                  value: ''
                }, {
                  // Font Size
                  selector: '.wcButton, button',
                  elem: '<button class="wcButton"></button>',
                  name: 'Font Size',
                  info: 'The font size of the control',
                  create: this.addPixelControl,
                  attribute: 'font-size',
                  value: ''
                }, {
                  // Font Color
                  selector: '.wcButton, button',
                  elem: '<button class="wcButton"></button>',
                  name: 'Font Color',
                  info: 'The font color of the control',
                  create: this.addColorControl,
                  attribute: 'color',
                  value: ''
                }, {
                  name: '',
                  create: this.addSpacer
                }, {
                  // Background Color
                  selector: '.wcButton, button',
                  elem: '<button class="wcButton"></button>',
                  name: 'Color',
                  info: 'The color of the control',
                  create: this.addColorControl,
                  attribute: 'background-color',
                  value: ''
                }, {
                  name: '',
                  create: this.addSpacer
                }, {
                  // Border Style
                  selector: '.wcButton, button',
                  elem: '<button class="wcButton"></button>',
                  name: 'Border Style',
                  info: 'The border style of the control',
                  create: this.addListControl(this._borderStyles),
                  attribute: 'border-style',
                  value: ''
                }, {
                  // Border Size
                  selector: '.wcButton, button',
                  elem: '<button class="wcButton"></button>',
                  name: 'Border Size',
                  info: 'The border size of the control',
                  create: this.addPixelControl,
                  attribute: 'border-width',
                  value: '0px'
                }, {
                  // Border Radius
                  selector: '.wcButton, button',
                  elem: '<button class="wcButton"></button>',
                  name: 'Border Radius',
                  info: 'The border radius of the control',
                  create: this.addPixelControl,
                  attribute: 'border-radius',
                  value: '0px'
                }, {
                  // Border Color
                  selector: '.wcButton, button',
                  elem: '<button class="wcButton"></button>',
                  name: 'Border Color',
                  info: 'The border color of the control',
                  create: this.addColorControl,
                  attribute: 'border-color',
                  value: ''
                }, {
                  name: '',
                  create: this.addSpacer
                }, {
                  // Box Shadow style
                  selector: '.wcButton, button',
                  elem: '<button class="wcButton"></button>',
                  name: 'Box-Shadow Style',
                  info: 'The box shadow style',
                  create: this.addListControl(this._shadowStyle),
                  parser: this._parseBoxShadowStyle,
                  attribute: 'box-shadow',
                  value: ''
                }, {
                  // Box Shadow h-shadow
                  selector: '.wcButton, button',
                  elem: '<button class="wcButton"></button>',
                  name: 'Box-Shadow Left Offset',
                  info: 'The box shadow horizontal offset from the left (can be negative)',
                  create: this.addPixelControl,
                  parser: this._parseBoxShadowAttribute(1),
                  attribute: 'box-shadow',
                  append: true,
                  grouped: true,
                  value: '0px'
                }, {
                  // Box Shadow v-shadow
                  selector: '.wcButton, button',
                  elem: '<button class="wcButton"></button>',
                  name: 'Box-Shadow Top Offset',
                  info: 'The box shadow vertical offset from the top (can be negative)',
                  create: this.addPixelControl,
                  parser: this._parseBoxShadowAttribute(2),
                  attribute: 'box-shadow',
                  append: true,
                  grouped: true,
                  value: '0px'
                }, {
                  // Box Shadow Blur
                  selector: '.wcButton, button',
                  elem: '<button class="wcButton"></button>',
                  name: 'Box-Shadow Blur',
                  info: 'The box shadow blur',
                  create: this.addPixelControl,
                  parser: this._parseBoxShadowAttribute(3),
                  attribute: 'box-shadow',
                  append: true,
                  grouped: true,
                  value: '0px'
                }, {
                  // Box Shadow Blur
                  selector: '.wcButton, button',
                  elem: '<button class="wcButton"></button>',
                  name: 'Box-Shadow Spread',
                  info: 'The box shadow spread',
                  create: this.addPixelControl,
                  parser: this._parseBoxShadowAttribute(4),
                  attribute: 'box-shadow',
                  append: true,
                  grouped: true,
                  value: '0px'
                }, {
                  // Box Shadow Color
                  selector: '.wcButton, button',
                  elem: '<button class="wcButton"></button>',
                  name: 'Box-Shadow Color',
                  info: 'The box shadow color',
                  create: this.addColorControl,
                  parser: this._parseBoxShadowColor,
                  attribute: 'box-shadow',
                  append: true,
                  grouped: true,
                  value: ''
                }]
              }, {
                name: 'Button Hover State',
                create: this.addTab,
                controls: [{
                  name: 'Button Hover State',
                  create: this.addSpacer
                }, {
                  // Font Family
                  selector: '.wcButtonHover, .wcButton:hover, button:hover',
                  elem: '<button class="wcButtonHover"></button>',
                  name: 'Font Family',
                  info: 'The font family of the control',
                  create: this.addTextControl,
                  attribute: 'font-family',
                  value: ''
                }, {
                  // Font Weight
                  selector: '.wcButtonHover, .wcButton:hover, button:hover',
                  elem: '<button class="wcButtonHover"></button>',
                  name: 'Font Weight',
                  info: 'The font weight of the control',
                  create: this.addListControl(this._fontWeights),
                  attribute: 'font-weight',
                  value: ''
                }, {
                  // Font Size
                  selector: '.wcButtonHover, .wcButton:hover, button:hover',
                  elem: '<button class="wcButtonHover"></button>',
                  name: 'Font Size',
                  info: 'The font size of the control',
                  create: this.addPixelControl,
                  attribute: 'font-size',
                  value: ''
                }, {
                  // Font Color
                  selector: '.wcButtonHover, .wcButton:hover, button:hover',
                  elem: '<button class="wcButtonHover"></button>',
                  name: 'Font Color',
                  info: 'The font color of the control',
                  create: this.addColorControl,
                  attribute: 'color',
                  value: ''
                }, {
                  name: '',
                  create: this.addSpacer
                }, {
                  // Background Color
                  selector: '.wcButtonHover, .wcButton:hover, button:hover',
                  elem: '<button class="wcButtonHover"></button>',
                  name: 'Color',
                  info: 'The color of the control',
                  create: this.addColorControl,
                  attribute: 'background-color',
                  value: ''
                }, {
                  name: '',
                  create: this.addSpacer
                }, {
                  // Border Style
                  selector: '.wcButtonHover, .wcButton:hover, button:hover',
                  elem: '<button class="wcButtonHover"></button>',
                  name: 'Border Style',
                  info: 'The border style of the control',
                  create: this.addListControl(this._borderStyles),
                  attribute: 'border-style',
                  value: ''
                }, {
                  // Border Size
                  selector: '.wcButtonHover, .wcButton:hover, button:hover',
                  elem: '<button class="wcButtonHover"></button>',
                  name: 'Border Size',
                  info: 'The border size of the control',
                  create: this.addPixelControl,
                  attribute: 'border-width',
                  value: '0px'
                }, {
                  // Border Radius
                  selector: '.wcButtonHover, .wcButton:hover, button:hover',
                  elem: '<button class="wcButtonHover"></button>',
                  name: 'Border Radius',
                  info: 'The border radius of the control',
                  create: this.addPixelControl,
                  attribute: 'border-radius',
                  value: '0px'
                }, {
                  // Border Color
                  selector: '.wcButtonHover, .wcButton:hover, button:hover',
                  elem: '<button class="wcButtonHover"></button>',
                  name: 'Border Color',
                  info: 'The border color of the control',
                  create: this.addColorControl,
                  attribute: 'border-color',
                  value: ''
                }, {
                  name: '',
                  create: this.addSpacer
                }, {
                  // Box Shadow style
                  selector: '.wcButtonHover, .wcButton:hover, button:hover',
                  elem: '<button class="wcButtonHover"></button>',
                  name: 'Box-Shadow Style',
                  info: 'The box shadow style',
                  create: this.addListControl(this._shadowStyle),
                  parser: this._parseBoxShadowStyle,
                  attribute: 'box-shadow',
                  value: ''
                }, {
                  // Box Shadow h-shadow
                  selector: '.wcButtonHover, .wcButton:hover, button:hover',
                  elem: '<button class="wcButtonHover"></button>',
                  name: 'Box-Shadow Left Offset',
                  info: 'The box shadow horizontal offset from the left (can be negative)',
                  create: this.addPixelControl,
                  parser: this._parseBoxShadowAttribute(1),
                  attribute: 'box-shadow',
                  append: true,
                  grouped: true,
                  value: '0px'
                }, {
                  // Box Shadow v-shadow
                  selector: '.wcButtonHover, .wcButton:hover, button:hover',
                  elem: '<button class="wcButtonHover"></button>',
                  name: 'Box-Shadow Top Offset',
                  info: 'The box shadow vertical offset from the top (can be negative)',
                  create: this.addPixelControl,
                  parser: this._parseBoxShadowAttribute(2),
                  attribute: 'box-shadow',
                  append: true,
                  grouped: true,
                  value: '0px'
                }, {
                  // Box Shadow Blur
                  selector: '.wcButtonHover, .wcButton:hover, button:hover',
                  elem: '<button class="wcButtonHover"></button>',
                  name: 'Box-Shadow Blur',
                  info: 'The box shadow blur',
                  create: this.addPixelControl,
                  parser: this._parseBoxShadowAttribute(3),
                  attribute: 'box-shadow',
                  append: true,
                  grouped: true,
                  value: '0px'
                }, {
                  // Box Shadow Blur
                  selector: '.wcButtonHover, .wcButton:hover, button:hover',
                  elem: '<button class="wcButtonHover"></button>',
                  name: 'Box-Shadow Spread',
                  info: 'The box shadow spread',
                  create: this.addPixelControl,
                  parser: this._parseBoxShadowAttribute(4),
                  attribute: 'box-shadow',
                  append: true,
                  grouped: true,
                  value: '0px'
                }, {
                  // Box Shadow Color
                  selector: '.wcButtonHover, .wcButton:hover, button:hover',
                  elem: '<button class="wcButtonHover"></button>',
                  name: 'Box-Shadow Color',
                  info: 'The box shadow color',
                  create: this.addColorControl,
                  parser: this._parseBoxShadowColor,
                  attribute: 'box-shadow',
                  append: true,
                  grouped: true,
                  value: ''
                }]
              }, {
                name: 'Button Active State',
                create: this.addTab,
                controls: [{
                  name: 'Button Active State',
                  create: this.addSpacer
                }, {
                  // Font Family
                  selector: '.wcButtonActive, .wcButton:active, button:active',
                  elem: '<button class="wcButtonActive"></button>',
                  name: 'Font Family',
                  info: 'The font family of the control',
                  create: this.addTextControl,
                  attribute: 'font-family',
                  value: ''
                }, {
                  // Font Weight
                  selector: '.wcButtonActive, .wcButton:active, button:active',
                  elem: '<button class="wcButtonActive"></button>',
                  name: 'Font Weight',
                  info: 'The font weight of the control',
                  create: this.addListControl(this._fontWeights),
                  attribute: 'font-weight',
                  value: ''
                }, {
                  // Font Size
                  selector: '.wcButtonActive, .wcButton:active, button:active',
                  elem: '<button class="wcButtonActive"></button>',
                  name: 'Font Size',
                  info: 'The font size of the control',
                  create: this.addPixelControl,
                  attribute: 'font-size',
                  value: ''
                }, {
                  // Font Color
                  selector: '.wcButtonActive, .wcButton:active, button:active',
                  elem: '<button class="wcButtonActive"></button>',
                  name: 'Font Color',
                  info: 'The font color of the control',
                  create: this.addColorControl,
                  attribute: 'color',
                  value: ''
                }, {
                  name: '',
                  create: this.addSpacer
                }, {
                  // Background Color
                  selector: '.wcButtonActive, .wcButton:active, button:active',
                  elem: '<button class="wcButtonActive"></button>',
                  name: 'Color',
                  info: 'The color of the control',
                  create: this.addColorControl,
                  attribute: 'background-color',
                  value: ''
                }, {
                  name: '',
                  create: this.addSpacer
                }, {
                  // Border Style
                  selector: '.wcButtonActive, .wcButton:active, button:active',
                  elem: '<button class="wcButtonActive"></button>',
                  name: 'Border Style',
                  info: 'The border style of the control',
                  create: this.addListControl(this._borderStyles),
                  attribute: 'border-style',
                  value: ''
                }, {
                  // Border Size
                  selector: '.wcButtonActive, .wcButton:active, button:active',
                  elem: '<button class="wcButtonActive"></button>',
                  name: 'Border Size',
                  info: 'The border size of the control',
                  create: this.addPixelControl,
                  attribute: 'border-width',
                  value: '0px'
                }, {
                  // Border Radius
                  selector: '.wcButtonActive, .wcButton:active, button:active',
                  elem: '<button class="wcButtonActive"></button>',
                  name: 'Border Radius',
                  info: 'The border radius of the control',
                  create: this.addPixelControl,
                  attribute: 'border-radius',
                  value: '0px'
                }, {
                  // Border Color
                  selector: '.wcButtonActive, .wcButton:active, button:active',
                  elem: '<button class="wcButtonActive"></button>',
                  name: 'Border Color',
                  info: 'The border color of the control',
                  create: this.addColorControl,
                  attribute: 'border-color',
                  value: ''
                }, {
                  name: '',
                  create: this.addSpacer
                }, {
                  // Box Shadow style
                  selector: '.wcButtonActive, .wcButton:active, button:active',
                  elem: '<button class="wcButtonActive"></button>',
                  name: 'Box-Shadow Style',
                  info: 'The box shadow style',
                  create: this.addListControl(this._shadowStyle),
                  parser: this._parseBoxShadowStyle,
                  attribute: 'box-shadow',
                  value: ''
                }, {
                  // Box Shadow h-shadow
                  selector: '.wcButtonActive, .wcButton:active, button:active',
                  elem: '<button class="wcButtonActive"></button>',
                  name: 'Box-Shadow Left Offset',
                  info: 'The box shadow horizontal offset from the left (can be negative)',
                  create: this.addPixelControl,
                  parser: this._parseBoxShadowAttribute(1),
                  attribute: 'box-shadow',
                  append: true,
                  grouped: true,
                  value: '0px'
                }, {
                  // Box Shadow v-shadow
                  selector: '.wcButtonActive, .wcButton:active, button:active',
                  elem: '<button class="wcButtonActive"></button>',
                  name: 'Box-Shadow Top Offset',
                  info: 'The box shadow vertical offset from the top (can be negative)',
                  create: this.addPixelControl,
                  parser: this._parseBoxShadowAttribute(2),
                  attribute: 'box-shadow',
                  append: true,
                  grouped: true,
                  value: '0px'
                }, {
                  // Box Shadow Blur
                  selector: '.wcButtonActive, .wcButton:active, button:active',
                  elem: '<button class="wcButtonActive"></button>',
                  name: 'Box-Shadow Blur',
                  info: 'The box shadow blur',
                  create: this.addPixelControl,
                  parser: this._parseBoxShadowAttribute(3),
                  attribute: 'box-shadow',
                  append: true,
                  grouped: true,
                  value: '0px'
                }, {
                  // Box Shadow Blur
                  selector: '.wcButtonActive, .wcButton:active, button:active',
                  elem: '<button class="wcButtonActive"></button>',
                  name: 'Box-Shadow Spread',
                  info: 'The box shadow spread',
                  create: this.addPixelControl,
                  parser: this._parseBoxShadowAttribute(4),
                  attribute: 'box-shadow',
                  append: true,
                  grouped: true,
                  value: '0px'
                }, {
                  // Box Shadow Color
                  selector: '.wcButtonActive, .wcButton:active, button:active',
                  elem: '<button class="wcButtonActive"></button>',
                  name: 'Box-Shadow Color',
                  info: 'The box shadow color',
                  create: this.addColorControl,
                  parser: this._parseBoxShadowColor,
                  attribute: 'box-shadow',
                  append: true,
                  grouped: true,
                  value: ''
                }]
              }, {
                name: 'Button Active Hover State',
                create: this.addTab,
                controls: [{
                  name: 'Button Active Hover State',
                  create: this.addSpacer
                }, {
                  // Font Family
                  selector: '.wcButtonActive.wcButtonHover, .wcButton:hover.wcButtonActive, .wcButton:active.wcButtonHover, .wcButton:active:hover, button:active:hover',
                  elem: '<button class="wcButtonActive wcButtonHover"></button>',
                  name: 'Font Family',
                  info: 'The font family of the control',
                  create: this.addTextControl,
                  attribute: 'font-family',
                  value: ''
                }, {
                  // Font Weight
                  selector: '.wcButtonActive.wcButtonHover, .wcButton:hover.wcButtonActive, .wcButton:active.wcButtonHover, .wcButton:active:hover, button:active:hover',
                  elem: '<button class="wcButtonActive wcButtonHover"></button>',
                  name: 'Font Weight',
                  info: 'The font weight of the control',
                  create: this.addListControl(this._fontWeights),
                  attribute: 'font-weight',
                  value: ''
                }, {
                  // Font Size
                  selector: '.wcButtonActive.wcButtonHover, .wcButton:hover.wcButtonActive, .wcButton:active.wcButtonHover, .wcButton:active:hover, button:active:hover',
                  elem: '<button class="wcButtonActive wcButtonHover"></button>',
                  name: 'Font Size',
                  info: 'The font size of the control',
                  create: this.addPixelControl,
                  attribute: 'font-size',
                  value: ''
                }, {
                  // Font Color
                  selector: '.wcButtonActive.wcButtonHover, .wcButton:hover.wcButtonActive, .wcButton:active.wcButtonHover, .wcButton:active:hover, button:active:hover',
                  elem: '<button class="wcButtonActive wcButtonHover"></button>',
                  name: 'Font Color',
                  info: 'The font color of the control',
                  create: this.addColorControl,
                  attribute: 'color',
                  value: ''
                }, {
                  name: '',
                  create: this.addSpacer
                }, {
                  // Background Color
                  selector: '.wcButtonActive.wcButtonHover, .wcButton:hover.wcButtonActive, .wcButton:active.wcButtonHover, .wcButton:active:hover, button:active:hover',
                  elem: '<button class="wcButtonActive wcButtonHover"></button>',
                  name: 'Color',
                  info: 'The color of the control',
                  create: this.addColorControl,
                  attribute: 'background-color',
                  value: ''
                }, {
                  name: '',
                  create: this.addSpacer
                }, {
                  // Border Style
                  selector: '.wcButtonActive.wcButtonHover, .wcButton:hover.wcButtonActive, .wcButton:active.wcButtonHover, .wcButton:active:hover, button:active:hover',
                  elem: '<button class="wcButtonActive wcButtonHover"></button>',
                  name: 'Border Style',
                  info: 'The border style of the control',
                  create: this.addListControl(this._borderStyles),
                  attribute: 'border-style',
                  value: ''
                }, {
                  // Border Size
                  selector: '.wcButtonActive.wcButtonHover, .wcButton:hover.wcButtonActive, .wcButton:active.wcButtonHover, .wcButton:active:hover, button:active:hover',
                  elem: '<button class="wcButtonActive wcButtonHover"></button>',
                  name: 'Border Size',
                  info: 'The border size of the control',
                  create: this.addPixelControl,
                  attribute: 'border-width',
                  value: '0px'
                }, {
                  // Border Radius
                  selector: '.wcButtonActive.wcButtonHover, .wcButton:hover.wcButtonActive, .wcButton:active.wcButtonHover, .wcButton:active:hover, button:active:hover',
                  elem: '<button class="wcButtonActive wcButtonHover"></button>',
                  name: 'Border Radius',
                  info: 'The border radius of the control',
                  create: this.addPixelControl,
                  attribute: 'border-radius',
                  value: '0px'
                }, {
                  // Border Color
                  selector: '.wcButtonActive.wcButtonHover, .wcButton:hover.wcButtonActive, .wcButton:active.wcButtonHover, .wcButton:active:hover, button:active:hover',
                  elem: '<button class="wcButtonActive wcButtonHover"></button>',
                  name: 'Border Color',
                  info: 'The border color of the control',
                  create: this.addColorControl,
                  attribute: 'border-color',
                  value: ''
                }, {
                  name: '',
                  create: this.addSpacer
                }, {
                  // Box Shadow style
                  selector: '.wcButtonActive.wcButtonHover, .wcButton:hover.wcButtonActive, .wcButton:active.wcButtonHover, .wcButton:active:hover, button:active:hover',
                  elem: '<button class="wcButtonActive wcButtonHover"></button>',
                  name: 'Box-Shadow Style',
                  info: 'The box shadow style',
                  create: this.addListControl(this._shadowStyle),
                  parser: this._parseBoxShadowStyle,
                  attribute: 'box-shadow',
                  value: ''
                }, {
                  // Box Shadow h-shadow
                  selector: '.wcButtonActive.wcButtonHover, .wcButton:hover.wcButtonActive, .wcButton:active.wcButtonHover, .wcButton:active:hover, button:active:hover',
                  elem: '<button class="wcButtonActive wcButtonHover"></button>',
                  name: 'Box-Shadow Left Offset',
                  info: 'The box shadow horizontal offset from the left (can be negative)',
                  create: this.addPixelControl,
                  parser: this._parseBoxShadowAttribute(1),
                  attribute: 'box-shadow',
                  append: true,
                  grouped: true,
                  value: '0px'
                }, {
                  // Box Shadow v-shadow
                  selector: '.wcButtonActive.wcButtonHover, .wcButton:hover.wcButtonActive, .wcButton:active.wcButtonHover, .wcButton:active:hover, button:active:hover',
                  elem: '<button class="wcButtonActive wcButtonHover"></button>',
                  name: 'Box-Shadow Top Offset',
                  info: 'The box shadow vertical offset from the top (can be negative)',
                  create: this.addPixelControl,
                  parser: this._parseBoxShadowAttribute(2),
                  attribute: 'box-shadow',
                  append: true,
                  grouped: true,
                  value: '0px'
                }, {
                  // Box Shadow Blur
                  selector: '.wcButtonActive.wcButtonHover, .wcButton:hover.wcButtonActive, .wcButton:active.wcButtonHover, .wcButton:active:hover, button:active:hover',
                  elem: '<button class="wcButtonActive wcButtonHover"></button>',
                  name: 'Box-Shadow Blur',
                  info: 'The box shadow blur',
                  create: this.addPixelControl,
                  parser: this._parseBoxShadowAttribute(3),
                  attribute: 'box-shadow',
                  append: true,
                  grouped: true,
                  value: '0px'
                }, {
                  // Box Shadow Blur
                  selector: '.wcButtonActive.wcButtonHover, .wcButton:hover.wcButtonActive, .wcButton:active.wcButtonHover, .wcButton:active:hover, button:active:hover',
                  elem: '<button class="wcButtonActive wcButtonHover"></button>',
                  name: 'Box-Shadow Spread',
                  info: 'The box shadow spread',
                  create: this.addPixelControl,
                  parser: this._parseBoxShadowAttribute(4),
                  attribute: 'box-shadow',
                  append: true,
                  grouped: true,
                  value: '0px'
                }, {
                  // Box Shadow Color
                  selector: '.wcButtonActive.wcButtonHover, .wcButton:hover.wcButtonActive, .wcButton:active.wcButtonHover, .wcButton:active:hover, button:active:hover',
                  elem: '<button class="wcButtonActive wcButtonHover"></button>',
                  name: 'Box-Shadow Color',
                  info: 'The box shadow color',
                  create: this.addColorControl,
                  parser: this._parseBoxShadowColor,
                  attribute: 'box-shadow',
                  append: true,
                  grouped: true,
                  value: ''
                }]
              }, {
                name: 'Button Disabled State',
                create: this.addTab,
                controls: [{
                  name: 'Button Disabled State',
                  create: this.addSpacer
                }, {
                  // Font Family
                  selector: '.wcButtonDisabled, .wcButton.disabled, button.disabled, button:disabled',
                  elem: '<button class="wcButton wcButtonDisabled" disabled></button>',
                  name: 'Font Family',
                  info: 'The font family of the control',
                  create: this.addTextControl,
                  attribute: 'font-family',
                  value: ''
                }, {
                  // Font Weight
                  selector: '.wcButtonDisabled, .wcButton.disabled, button.disabled, button:disabled',
                  elem: '<button class="wcButton wcButtonDisabled" disabled></button>',
                  name: 'Font Weight',
                  info: 'The font weight of the control',
                  create: this.addListControl(this._fontWeights),
                  attribute: 'font-weight',
                  value: ''
                }, {
                  // Font Size
                  selector: '.wcButtonDisabled, .wcButton.disabled, button.disabled, button:disabled',
                  elem: '<button class="wcButton wcButtonDisabled" disabled></button>',
                  name: 'Font Size',
                  info: 'The font size of the control',
                  create: this.addPixelControl,
                  attribute: 'font-size',
                  value: ''
                }, {
                  // Font Color
                  selector: '.wcButtonDisabled, .wcButton.disabled, button.disabled, button:disabled',
                  elem: '<button class="wcButton wcButtonDisabled" disabled></button>',
                  name: 'Font Color',
                  info: 'The font color of the control',
                  create: this.addColorControl,
                  attribute: 'color',
                  value: ''
                }, {
                  name: '',
                  create: this.addSpacer
                }, {
                  // Background Color
                  selector: '.wcButtonDisabled, .wcButton.disabled, button.disabled, button:disabled',
                  elem: '<button class="wcButton wcButtonDisabled" disabled></button>',
                  name: 'Color',
                  info: 'The color of the control',
                  create: this.addColorControl,
                  attribute: 'background-color',
                  value: ''
                }, {
                  name: '',
                  create: this.addSpacer
                }, {
                  // Border Style
                  selector: '.wcButtonDisabled, .wcButton.disabled, button.disabled, button:disabled',
                  elem: '<button class="wcButton wcButtonDisabled" disabled></button>',
                  name: 'Border Style',
                  info: 'The border style of the control',
                  create: this.addListControl(this._borderStyles),
                  attribute: 'border-style',
                  value: ''
                }, {
                  // Border Size
                  selector: '.wcButtonDisabled, .wcButton.disabled, button.disabled, button:disabled',
                  elem: '<button class="wcButton wcButtonDisabled" disabled></button>',
                  name: 'Border Size',
                  info: 'The border size of the control',
                  create: this.addPixelControl,
                  attribute: 'border-width',
                  value: '0px'
                }, {
                  // Border Radius
                  selector: '.wcButtonDisabled, .wcButton.disabled, button.disabled, button:disabled',
                  elem: '<button class="wcButton wcButtonDisabled" disabled></button>',
                  name: 'Border Radius',
                  info: 'The border radius of the control',
                  create: this.addPixelControl,
                  attribute: 'border-radius',
                  value: '0px'
                }, {
                  // Border Color
                  selector: '.wcButtonDisabled, .wcButton.disabled, button.disabled, button:disabled',
                  elem: '<button class="wcButton wcButtonDisabled" disabled></button>',
                  name: 'Border Color',
                  info: 'The border color of the control',
                  create: this.addColorControl,
                  attribute: 'border-color',
                  value: ''
                }, {
                  name: '',
                  create: this.addSpacer
                }, {
                  // Box Shadow style
                  selector: '.wcButtonDisabled, .wcButton.disabled, button.disabled, button:disabled',
                  elem: '<button class="wcButton wcButtonDisabled" disabled></button>',
                  name: 'Box-Shadow Style',
                  info: 'The box shadow style',
                  create: this.addListControl(this._shadowStyle),
                  parser: this._parseBoxShadowStyle,
                  attribute: 'box-shadow',
                  value: ''
                }, {
                  // Box Shadow h-shadow
                  selector: '.wcButtonDisabled, .wcButton.disabled, button.disabled, button:disabled',
                  elem: '<button class="wcButton wcButtonDisabled" disabled></button>',
                  name: 'Box-Shadow Left Offset',
                  info: 'The box shadow horizontal offset from the left (can be negative)',
                  create: this.addPixelControl,
                  parser: this._parseBoxShadowAttribute(1),
                  attribute: 'box-shadow',
                  append: true,
                  grouped: true,
                  value: '0px'
                }, {
                  // Box Shadow v-shadow
                  selector: '.wcButtonDisabled, .wcButton.disabled, button.disabled, button:disabled',
                  elem: '<button class="wcButton wcButtonDisabled" disabled></button>',
                  name: 'Box-Shadow Top Offset',
                  info: 'The box shadow vertical offset from the top (can be negative)',
                  create: this.addPixelControl,
                  parser: this._parseBoxShadowAttribute(2),
                  attribute: 'box-shadow',
                  append: true,
                  grouped: true,
                  value: '0px'
                }, {
                  // Box Shadow Blur
                  selector: '.wcButtonDisabled, .wcButton.disabled, button.disabled, button:disabled',
                  elem: '<button class="wcButton wcButtonDisabled" disabled></button>',
                  name: 'Box-Shadow Blur',
                  info: 'The box shadow blur',
                  create: this.addPixelControl,
                  parser: this._parseBoxShadowAttribute(3),
                  attribute: 'box-shadow',
                  append: true,
                  grouped: true,
                  value: '0px'
                }, {
                  // Box Shadow Blur
                  selector: '.wcButtonDisabled, .wcButton.disabled, button.disabled, button:disabled',
                  elem: '<button class="wcButton wcButtonDisabled" disabled></button>',
                  name: 'Box-Shadow Spread',
                  info: 'The box shadow spread',
                  create: this.addPixelControl,
                  parser: this._parseBoxShadowAttribute(4),
                  attribute: 'box-shadow',
                  append: true,
                  grouped: true,
                  value: '0px'
                }, {
                  // Box Shadow Color
                  selector: '.wcButtonDisabled, .wcButton.disabled, button.disabled, button:disabled',
                  elem: '<button class="wcButton wcButtonDisabled" disabled></button>',
                  name: 'Box-Shadow Color',
                  info: 'The box shadow color',
                  create: this.addColorControl,
                  parser: this._parseBoxShadowColor,
                  attribute: 'box-shadow',
                  append: true,
                  grouped: true,
                  value: ''
                }]
              }]
            }]
          }]
        }]
      }]
    }];
  }
}