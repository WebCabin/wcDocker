function HowToPanel(myPanel) {
  this._panel = myPanel;
  this._layout = myPanel.layout();

  this._currentLayout = null;
  this._layoutRow = 0;
  this._tabFrame = null;
  this._widgetTabFrame = null;

  this.__init();
};

HowToPanel.prototype = {
  // ---------------------------------------------------------------------------
  text: function(textLines) {
    var text = '';
    if (typeof textLines === 'string') {
      text = textLines.replace('\t', '&nbsp;&nbsp;') + '<br/>';
    } else {
      for (var i = 0; i < textLines.length; ++i) {
        var line = textLines[i];
        text += line.replace('\t', '&nbsp;&nbsp;') + '<br/>';
      }
    }
    this._currentLayout.addItem("<div>" + text + "<br/></div>", 0, this._layoutRow++);
  },

  // ---------------------------------------------------------------------------
  code: function(codeLines) {
    var code = '';
    if (typeof codeLines === 'string') {
      code = codeLines.replace('\t', '  ');
    } else {
      for (var i = 0; i < codeLines.length; ++i) {
        var line = codeLines[i];
        code += line.replace('\t', '  ') + '\n';
      }
    }

    this._currentLayout.addItem('<pre><code data-language="javascript">' + code + '</code></pre>', 0, this._layoutRow++);
  },

  // ---------------------------------------------------------------------------
  html: function(htmlLines) {
    var html = '';
    if (typeof htmlLines === 'string') {
      html = htmlLines.replace('\t', '  ');
    } else {
      for (var i = 0; i < htmlLines.length; ++i) {
        var line = htmlLines[i];
        html += line.replace('\t', '  ') + '\n';
      }
    }

    this._currentLayout.addItem('<pre><code data-language="html">' + html + '</code></pre>', 0, this._layoutRow++);
  },

  // ---------------------------------------------------------------------------
  __init: function() {
    this._layout.$table.css('padding', '10px');

    var $background = $('<div style="width:100%;height:100%;background-color:white;opacity:0.50;">');
    this._layout.addItem($background, 0, 0);

    var $scene = $('<div style="position:absolute;top:10px;left:10px;right:10px;bottom:10px;">');
    this._layout.addItem($scene, 0, 0);

    this._tabFrame = new wcTabFrame($scene, this._panel);
    this._tabFrame.$frame.css('background-color', 'transparent');
    this.__constructGeneralTab(this._tabFrame.addTab('General'));
    this.__constructControlTab(this._tabFrame.addTab('Control Panel'));
    this.__constructWidgetTab(this._tabFrame.addTab('Widget Panel'));
    this.__constructChatTab(this._tabFrame.addTab('Chat Panel'));
    this.__constructBatchTab(this._tabFrame.addTab('Batch Panel'));
  },

  __initTabLayout: function(layout) {
    layout.$table.css('border-left', '1px solid black');
    layout.$table.css('border-right', '1px solid black');
    layout.$table.css('border-bottom', '1px solid black');
    layout.$table.css('padding', '10px');
    this._layoutRow = 0;
    this._currentLayout = layout;
  },

  // ---------------------------------------------------------------------------
  __finishTabLayout: function() {
    this._currentLayout.addItem($('<div>'), 0, this._layoutRow++).parent().css('height', '100%');
  },

  // ---------------------------------------------------------------------------
  __constructGeneralTab: function(layout) {
    this.__initTabLayout(layout);

    this.text("<b>For more detailed information on the API, check out the <a href='https://github.com/WebCabin/wcDocker/wiki' target='_blank'>wiki</a>.</b>");
    this.text("\tBegin by creating an instance of the main docker window and assign it a DOM container element. Typically this would be the document body, but there is no restriction if you want to use a smaller area instead.  Multiple main windows can be used, however, no support exists for cross interaction between them (yet?).  Also note that floating windows are not constrained to the given container element, they can float anywhere in the browser window.");
    this.code([
      "var myDocker = new wcDocker(document.body);",
    ]);
    this.text([
      "\tThe main docker window contains docking panels which can be moved around and organized at will by the user. All docking panels have to be registered first before use, this allows the docker to manage their creation.",
      "To register a new type, use the wcDocker.registerPanelType() function in one of two ways:"
    ]);
    this.code([
      "myDocker.registerPanelType('Some type name', function(myPanel, options) {});",
    ]);
    this.text("Or...");
    this.code([
      "myDocker.registerPanelType('Some type name', {",
      "\tonCreate: function(myPanel, options) {},",
      "});",
    ]);
    this.text([
      "\tThe first parameter is a unique name identifier that identifies the panel.  You will also need a callback function or object constructor (the function is called with the 'new' operator, which will either create a new instance of your panel object if you have provided a constructor, or simply calls the creation function) that will be passed into the second parameter as either the function directly, or within an object with other possible options.",
      "\tInside the creation function, or object constructor, you are given the wcPanel that was just created, as well as an optional data value provided during the registration of the panel type (when registering the panel type, the second parameter can be an object with an 'options' key/value).  Every panel contains a wcLayout object which lays out the contents of the panel in a grid format.  To add a DOM element to it, use the layouts addItem function and supply it with either your element directly, a jQuery collection object, or a jQuery creation string, and an x, y grid position within the layout (by default = 0, 0).",
      "\tYou can also stretch an element over multiple grid cells by supplying an optional width and height value.",
    ]);
    this.code([
      "myPanel.layout().addItem(myElement, x, y, width, height);",
    ]);
    this.text("\tAdditionally, you can also assign various starting properties of the panel here, such as the desired or the minimum size.");
    this.code([
      "myPanel.initSize(200, 200);",
      "myPanel.minSize(100, 100);",
    ]);
    this.text("\tNow, once you have registered your panel types, if they are not private, the user will be able to create those panels whenever they wish.  However, it is also recommended that you initialize the window with a starting layout in order to give your users something to see at the beginning.");
    this.code([
      "myDocker.addPanel('Registered type name', wcDocker.DOCK_LEFT, optionalTargetPanel, optionalRect);",
    ]);
    this.text([
      "\tThe first parameter is the name of the panel type you have previously registered.<br>The second parameter is an enumerated value that determines the location where this window will be docked (or try to dock), it can be one of the following:",
      "",
      "<b>wcDocker.DOCK_MODAL</b>    = Make a floating window that blocks all access to panels below it until closed.",
      "<b>wcDocker.DOCK_FLOAT</b>    = Make a floating window that is not docked.",
      "<b>wcDocker.DOCK_LEFT</b>     = Dock it to the left side of the central or target panel.",
      "<b>wcDocker.DOCK_RIGHT</b>    = Dock it to the right side of the central or target panel.",
      "<b>wcDocker.DOCK_TOP</b>      = Dock it to the top of the central or target panel.",
      "<b>wcDocker.DOCK_BOTTOM</b>   = Dock it on the bottom of the central or target panel.",
      "<b>wcDocker.DOCK_STACKED</b>  = Dock the new panel stacked (tabbed) with another existing panel.",
    ]);
    this.text([
      "The fourth parameter is optional, normally panels will dock in relation to the entire docker container. However, by supplying a specific panel instead, your new panel will be docked in relation to that target.",
      "The fifth, and final, parameter is also optional and consists of a data object with custom options.  These options are then passed into the constructor object of the panel when it is created.",
      "The return value is the newly created docking panel, in the case that you may want it.",
      "",
      "<b>For more detailed information on the API, check out the <a href='https://github.com/WebCabin/wcDocker/wiki' target='_blank'>wiki</a>.</b>",
    ]);
    this.__finishTabLayout();
  },

  // ---------------------------------------------------------------------------
  __constructControlTab: function(layout) {
    this.__initTabLayout(layout);

    this.text([
      "\tThe control panel demonstrates a few of the wcDocker-wide features available to you.",
      "",
      "\tAssigning a theme to use with wcDocker is as simple as linking to a custom theme CSS file in your html page",
      "",
      "\t<b>Note:</b> Always include the theme <em>after</em> you have linked jQuery-contextMenu as the theme can override the style of the menu as well.",
    ]);
    this.html([
      '<link id="theme" rel="stylesheet" type="text/css" href="Themes/shadow.css"/>',
    ]);
    this.text([
      "",
      "\tEntire layouts can also be saved and restored using wcDocker.",
      "\tSaving retrieves a string value with the information wcDocker needs to reconstruct all panels in their current configuration.  Using that string, you can then restore a previous layout.",
    ]);
    this.code([
      "var savedLayout = myDocker.save();",
      "myDocker.restore(savedLayout);",
    ]);
    this.text([
      "\tAdditionally, any panel can receieve the <b>wcDocker.EVENT_SAVE_LAYOUT</b> and <b>wcDocker.EVENT_RESTORE_LAYOUT</b> events to save and restore additional information for that panel."
    ]);
    this.code([
      "myPanel.on(wcDocker.EVENT_SAVE_LAYOUT, function(data) {",
      "\tdata.someValue = somePanelValueToSave;",
      "});",
      "",
      "myPanel.on(wcDocker.EVENT_RESTORE_LAYOUT, function(data) {",
      "\tsomePanelValueToRestore = data.someValue;",
      "});",
    ]);

    this.__finishTabLayout();
  },

  // ---------------------------------------------------------------------------
  __constructWidgetTab: function(layout) {
    this.__initTabLayout(layout);

    this.text([
      "\tThe widget panel demonstrates some of the custom layout widgets provided for you by wcDocker.",
    ]);

    var $scene = $('<div style="position:relative;width:100%;height:100%;">');
    layout.addItem($scene, 0, this._layoutRow++).parent().css('height', '100%');

    this._widgetTabFrame = new wcTabFrame($scene, this._panel);
    this.__constructPanelButtonTab(this._widgetTabFrame.addTab('Panel Buttons'));
    this.__constructSplitterTab(this._widgetTabFrame.addTab('Splitter'));
    this.__constructTabTab(this._widgetTabFrame.addTab('Tab'));
    this.__constructIFrameTab(this._widgetTabFrame.addTab('iFrame'));
  },

  // ---------------------------------------------------------------------------
  __constructChatTab: function(layout) {
    this.__initTabLayout(layout);

    this.text([
      "\tThe chat panel demonstrates the use of the built-in event messaging system to broadcast information between panels.",
      "",
      "\tYou can register a panel event by using the <a href='https://github.com/WebCabin/wcDocker/wiki/wcPanel#on' target='_blank'><b>wcPanel.on()</b></a> function with an event name to listen for and a callback function to call whenever that event is <a href='https://github.com/WebCabin/wcDocker/wiki/wcPanel#trigger' target='_blank'>triggered</a>.  wcDocker supports a number of <a href='https://github.com/WebCabin/wcDocker/wiki/wcPanel#on' target='_blank'>pre-defined</a> events that are <a href='https://github.com/WebCabin/wcDocker/wiki/wcPanel#trigger' target='_blank'>triggered</a> internally, but you may also provide your own custom event names for your own use as well.",
    ]);
    this.code([
      "myPanel.on('Message', function(data) ",
      "\t// The data passed in is the data object sent by the sender",
      "\tvar text = data.sender + ': ' + data.message + '\\n'",
      "\t$chatArea.html($chatArea.html() + text);",
      "});",
    ]);
    this.text("\tOnce you are listening to an event type, whenever another panel <a href='https://github.com/WebCabin/wcDocker/wiki/wcPanel#trigger' target='_blank'>triggers</a> that event, you will receive it.  The second parameter is an optional value or object that will be sent to all receivers.");
    this.code([
      "myPanel.trigger('Message', {",
      "  sender:  'Bob',",
      "  message: 'Hello World!',",
      "});",
    ]);

    this.__finishTabLayout();
  },

  // ---------------------------------------------------------------------------
  __constructBatchTab: function(layout) {
    this.__initTabLayout(layout);

    this.text([
      "\tThe batch panel demonstrates a speed comparison between adding layout items one at a time vs using the batching system.",
      "\tWrap all calls to <a href='https://github.com/WebCabin/wcDocker/wiki/wcLayout#addItem' target='_blank'><b>wcLayout.addItem()</b></a> with a call to <a href='https://github.com/WebCabin/wcDocker/wiki/wcLayout#startBatch' target='_blank'><b>wcLayout.startBatch()</b></a> and <a href='https://github.com/WebCabin/wcDocker/wiki/wcLayout#finishBatch' target='_blank'><b>wcLayout.finishBatch()</b></a> to avoid re-calculating and re-drawing the page between every added item.",
    ]);
    this.code([
      "myPanel.layout().startBatch();",
      "myPanel.layout().addItem(someDOMElement, 0, 0);",
      "myPanel.layout().addItem(someDOMElement, 0, 1);",
      "myPanel.layout().addItem(someDOMElement, 0, 2);",
      "myPanel.layout().addItem(someDOMElement, 0, 3);",
      "myPanel.layout().addItem(someDOMElement, 0, 4);",
      "myPanel.layout().finishBatch();",
    ]);

    this.__finishTabLayout();
  },

  // ---------------------------------------------------------------------------
  __constructPanelButtonTab: function(layout) {
    this.__initTabLayout(layout);

    this.text([
      "\tAll panels can contain their own custom buttons that appear in the upper right corner of the panel (where the title bar is).  They can be normal or toggle buttons with any function that you wish.",
      "\tTo add a new button, use the <a href='https://github.com/WebCabin/wcDocker/wiki/wcPanel#addButton' target='_blank'><b>wcPanel.addButton()</b></a> function:",
    ]);
    this.code("myPanel.addButton('ID', 'normalStateClass', 'B', 'Tooltip text', true, '');");
    this.text([
      "\tThe first parameter identifies the button, for later use.",
      "\tThe second parameter is a class name to apply to the button when it is in normal state.",
      "\tThe third parameter is a fallback text value to apply on the button, if the icon fails to display you will see this.  <b>Note:</b> Buttons are very small so it is likely that only a single letter can fit.",
      "\tThe fourth parameter is tooltip text, visible when the user hovers the mouse cursor over it.",
      "\tThe fifth parameter is an optional boolean value that defines whether the button can toggle between pressed and normal state.  By default, buttons are not toggle-able.",
      "\tThe sixth parameter is an optional class name to apply to the button when it is in toggled state.  This new class will replace the normal state class.",
      "",
      "\tPanel buttons can be added and removed at any time.  To remove a button, use the <a href='https://github.com/WebCabin/wcDocker/wiki/wcPanel#removeButton' target='_blank'><b>wcPanel.removeButton()</b></a> function.",
    ]);
    this.code("myPanel.removeButton('Some ID Name');");

    this.__finishTabLayout();
  },

  // ---------------------------------------------------------------------------
  __constructSplitterTab: function(layout) {
    this.__initTabLayout(layout);

    this.__finishTabLayout();
  },

  // ---------------------------------------------------------------------------
  __constructTabTab: function(layout) {
    this.__initTabLayout(layout);

    this.__finishTabLayout();
  },

  // ---------------------------------------------------------------------------
  __constructIFrameTab: function(layout) {
    this.__initTabLayout(layout);

    this.__finishTabLayout();
  },
};