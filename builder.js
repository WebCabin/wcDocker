function wcThemeBuilder(myPanel) {
  this._panel = myPanel;
  this._controls = [];
  this._tabs = null;
  this._curTab = null;
  this._curRow = 0;
  this._curTabIndex = 0;

  this.$part = $('<select style="width:100%">');

  this.init();
}

wcThemeBuilder.prototype = {
  buildControls: function() {
    if (this._tabs) {
      this._curTabIndex = this._tabs.tab();
      this._tabs.destroy();
      this._tabs = null;
      this._curTab = null;
    }

    this._panel.layout().clear();
    // this._panel.layout().startBatch();
    this._panel.layout().$table.css('padding', '10px');

    var $tabArea = $('<div style="width:100%;height:100%;border:1px solid black;"></div>');
    this._panel.layout().addItem($tabArea, 0, 0, 3).stretch('', '100%');
    this._tabs = new wcTabFrame($tabArea, this._panel);

    var self = this;
    var $button = $('<button style="width:100%;" style="Pull attributes from the currently active theme and apply them here.">Pull</button>');
    this._panel.layout().addItem($button, 0, 1).stretch('33%', '');
    $button.click(function() {
      self.pull();
    });

    var $apply = $('<button style="width:100%;" style="Apply all current attributes to the current theme.">Apply</button>');
    this._panel.layout().addItem($apply, 1, 1).stretch('33%', '');
    $apply.click(function() {
      var themeData = self.build();
      self.apply(themeData);
    });

    var $download = $('<button style="width:100%;" style="Download a copy of your custom theme.">Download</button>');
    this._panel.layout().addItem($download, 2, 1).stretch('33%', '');
    $download.click(function() {
      var themeData = self.build();
      console.log(themeData);
    });
    
    this._curRow = 0;
    for (var i = 0; i < this._controls.length; ++i) {
      var control = this._controls[i];
      if (control.create) {
        control.create.call(this, control, this._curRow);
        this._curRow += 1;
      }
    }

    this._curTab.addItem('<div>', 0, this._curRow, 4).stretch('', '100%');
    this._curTab.finishBatch();

    this._tabs.tab(this._curTabIndex);
    // this._panel.layout().finishBatch();
  },

  addTab: function(control, index) {
    if (this._curTab) {
      this._curTab.addItem('<div>', 0, this._curRow, 4).stretch('', '100%');
      this._curTab.finishBatch();
    }
    this._curRow = -1;
    this._curTab = this._tabs.addTab(control.name);
    this._curTab.startBatch();
  },

  addSpacer: function(control, index) {
    this._curTab.addItem('<div class="wcAttributeSpacer">' + control.name + '</div>', 0, index, 4).stretch('100%', '');
  },

  addColorControl: function(control, index) {
    var $activator = null;
    var $label = null;
    var $control = null;
    var self = this;
    
    $label = $('<label class="wcAttributeLabel" title="' + control.info + '">' + control.name + ':</label>');
    this._curTab.addItem($label, 1, index).stretch('1%', '').css('text-align', 'right');

    $control = $('<input style="width:100%;" title="' + control.info + '"/>');
    this._curTab.addItem($control, 2, index, 2).stretch('100%', '');
    $control.spectrum({
      color: control.value,
      showAlpha: true,
      showPalette: true,
      showInput: true,
      showInitial: true,
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
        control.value = color.toRgbString();
      }
    });

    if (control.isOptional) {
      $activator = $('<input type="checkbox" title="' + control.info + '"/>');
      this._curTab.addItem($activator, 0, index).stretch('1%', '');

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

  addPixelControl: function(control, index) {
    var $activator = null;
    var $label = null;
    var $control = null;
    var self = this;
    
    $label = $('<label class="wcAttributeLabel" title="' + control.info + '">' + control.name + ':</label>');
    this._curTab.addItem($label, 1, index).stretch('1%', '').css('text-align', 'right');

    $control = $('<input title="' + control.info + '" type="number" step="1" min="1"/>');
    this._curTab.addItem($control, 2, index, 2).stretch('100%', '');
    $control.val(parseInt(control.value));
    $control.change(function() {
      control.value = $(this).val() + 'px';
    });

    if (control.isOptional) {
      $activator = $('<input type="checkbox" title="' + control.info + '"/>');
      this._curTab.addItem($activator, 0, index).stretch('1%', '');

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

  build: function() {
    var data = {};
    for (var i = 0; i < this._controls.length; ++i) {
      var control = this._controls[i];

      if (!control.selector) {
        continue;
      }

      if (!data.hasOwnProperty(control.selector)) {
        data[control.selector] = [];
      }

      var obj = data[control.selector];
      obj.push({
        key: control.attribute,
        value: control.value
      });

      if (control.also) {
        for (var a = 0; a < control.also.length; ++a) {
          var also = control.also[a];
          if (!data.hasOwnProperty(also.selector)) {
            data[also.selector] = [];
          }

          var alsoObj = data[also.selector];
          alsoObj.push({
            key: also.attribute,
            value: control.valu
          });
        }
      }
    }

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
  },

  apply: function(themeData) {
    $('option.custom').show().attr('selected', 'selected');
    $('#wcTheme').remove();
    $('#wcCustomTheme').remove();

    var $style = $('<style id="wcCustomTheme"></style>');
    $('head').append($style);
    $style.text(themeData);
  },

  pull: function() {
    for (var i = 0; i < this._controls.length; ++i) {
      var control = this._controls[i];

      if (!control.elem) {
        continue;
      }

      var $item = $(control.elem);
      $('body').append($item);
      control.value = $item.css(control.attribute);
      $item.remove();
    }

    this.buildControls();
  },

  init: function() {
    this.initParts();
    var self = this;
    setTimeout(function() {
      self.pull();
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
  },

  initParts: function() {
    this._controls = [{
      // -----------------------------------------------------------------------------------------------------------------
      name: 'Main',
      create: this.addTab
    }, {
      name: 'Main',
      create: this.addSpacer
    }, {
      selector: '.wcDocker, .wcPanelBackground',
      elem: '<div class="wcDocker wcPanelBackground"></div>',
      name: 'Background Color',
      info: 'The background color to use.',
      create: this.addColorControl,
      attribute: 'background-color',
      value: ''
    }, {
      selector: '.wcModalBlocker',
      elem: '<div class="wcModalBlocker"></div>',
      name: 'Modal Blocker Color',
      info: 'The color of the fullscreen blocker element that appears when a modal panel is visible.',
      create: this.addColorControl,
      attribute: 'background-color',
      value: ''
    }, {
      // -----------------------------------------------------------------------------------------------------------------
      name: 'Panels',
      create: this.addTab
    }, {
      name: 'Panels',
      create: this.addSpacer
    }, {
      selector: '.wcFrameFlasher',
      elem: '<div class="wcFrameFlasher"></div>',
      name: 'Panel Flash Color',
      info: 'The color of the panel when it focus flashes.',
      create: this.addColorControl,
      attribute: 'background-color',
      value: ''
    }, {
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
      selector: '.wcFrameButton',
      elem: '<div class="wcFrameTitle"></div>',
      name: 'Normal Button Color',
      info: 'The normal color of a panel button',
      create: this.addColorControl,
      attribute: 'background-color',
      value: ''
    }, {
      selector: '.wcFrameButton:hover, .wcFrameButtonHover',
      elem: '<div class="wcFrameButtonHover"></div>',
      name: 'Hover Button Color',
      info: 'The hover color of a panel button',
      create: this.addColorControl,
      attribute: 'background-color',
      value: ''
    }, {
      selector: '.wcFrameButton:active, .wcFrameButtonActive',
      elem: '<div class="wcFrameButtonActive"></div>',
      name: 'Pressed Button Color',
      info: 'The pressed color of a panel button',
      create: this.addColorControl,
      attribute: 'bacgkround-color',
      value: ''
    }, {
      // -----------------------------------------------------------------------------------------------------------------
      name: 'Tabs',
      create: this.addTab
    }, {
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
    }];
  }
}