function HowToPanel(myPanel) {
  this._panel = myPanel;
  this._layout = myPanel.layout();

  this._currentLayout = null;
  this._layoutRow = 0;
  this._tabFrame = null;
  this._widgetTabsFrame = null;

  this.__init();
};

HowToPanel.prototype = {
  // --------------------------------------------------------------------------------
  text: function(textLines) {
    var text = '';
    if (typeof textLines === 'string') {
      text = textLines.replace(/\t/g, '&nbsp;&nbsp;') + '<br/>';
    } else {
      for (var i = 0; i < textLines.length; ++i) {
        var line = textLines[i];
        text += line.replace(/\t/g, '&nbsp;&nbsp;') + '<br/>';
      }
    }
    this._currentLayout.addItem("<div>" + text + "<br/></div>", 0, this._layoutRow++);
  },

  // --------------------------------------------------------------------------------
  code: function(codeLines) {
    var code = '';
    if (typeof codeLines === 'string') {
      code = codeLines.replace(/\t/g, '  ');
    } else {
      for (var i = 0; i < codeLines.length; ++i) {
        var line = codeLines[i];
        code += line.replace(/\t/g, '  ') + '\n';
      }
    }

    this._currentLayout.addItem('<pre><code data-language="javascript">' + code + '</code></pre>', 0, this._layoutRow++);
  },

  // --------------------------------------------------------------------------------
  html: function(htmlLines) {
    var html = '';
    if (typeof htmlLines === 'string') {
      html = htmlLines.replace(/\t/g, '  ');
    } else {
      for (var i = 0; i < htmlLines.length; ++i) {
        var line = htmlLines[i];
        html += line.replace(/\t/g, '  ') + '\n';
      }
    }
    
    var $pre = $('<pre>');
    var $code = $('<code data-language="html">');
    $pre.append($code);
    $code.text(html);
    this._currentLayout.addItem($pre, 0, this._layoutRow++);
  },

  // --------------------------------------------------------------------------------
  __init: function() {
    this._layout.$table.css('padding', '10px');

    var $background = $('<div style="width:100%;height:100%;background-color:white;opacity:0.50;">');
    this._layout.addItem($background, 0, 0);

    var $credit = $('<div style="font-size:15px;background-color:lightgray;">Code syntax highlighting brought to you by <a href="http://craig.is/" target="_blank"><b>Craig Campbell</b></a> and the <a href="http://craig.is/making/rainbows" target="_blank"><b>Rainbow</b></a> library!</div>');
    this._layout.addItem($credit, 0, 1);

    var $scene = $('<div style="position:absolute;top:10px;left:10px;right:10px;bottom:27px;border-bottom:1px solid black;">');
    this._layout.addItem($scene, 0, 0).parent().css('height', '100%');

    this._tabFrame = new wcTabFrame($scene, this._panel);
    this._tabFrame.$frame.css('background-color', 'transparent');
    this.__constructGeneralTab(this._tabFrame.addTab('Getting Started'));
    this.__constructControlTab(this._tabFrame.addTab('Control Panel'));
    this.__constructWidgetTab(this._tabFrame.addTab('Widget Panel'));
    this.__constructChatTab(this._tabFrame.addTab('Chat Panel'));
    this.__constructBatchTab(this._tabFrame.addTab('Batch Panel'));
  },

  // --------------------------------------------------------------------------------
  __wikiLink: function(type, anchor, display) {
    if (typeof display === 'undefined') {
      display = type + '.' + anchor + '()';
    }
    return "<a href='https://github.com/WebCabin/wcDocker/wiki/" + type + "#" + anchor + "' target='_blank'>" + display + "</a>";
  },

  __initTabLayout: function(layout) {
    layout.$table.css('border-left', '1px solid black');
    layout.$table.css('border-right', '1px solid black');
    layout.$table.css('padding', '10px');
    this._layoutRow = 0;
    this._currentLayout = layout;

    this._currentLayout.startBatch();
  },

  // --------------------------------------------------------------------------------
  __finishTabLayout: function() {
    this._currentLayout.finishBatch();
    this._currentLayout.addItem($('<div>'), 0, this._layoutRow++).parent().css('height', '100%');
  },

  // --------------------------------------------------------------------------------
  __constructGeneralTab: function(layout) {
    this.__initTabLayout(layout);

    this.text("<b>wcDocker (Web Cabin Docker) is a page layout framework that gives you dynamic docking panels. Panels can float on their own or be docked on any side of any other panel. All panels can be moved, resized, removed, and created at will by the user (unless otherwise restricted). This project is currently under development by Jeff Houde (<a href='mailto:lochemage@gmail.com' target='_blank'>lochemage@gmail.com</a>). wcDocker requires the JQuery library, currently developed using version 1.11.1 although earlier and 2.x.x versions should work as well.</b>");
    this.text("<b>For detailed information on the API, check out the <a href='https://github.com/WebCabin/wcDocker/wiki' target='_blank'>wiki</a>.</b>");
    this.text([
      "\tBegin by including the necessary dependencies.",
      "\tYou can use <a href='http://bower.io/'>bower</a> to pull them, or you can pull them yourself.  jQuery version 1.11.1 or any of the 2.x.x should work.",
    ]);
    this.html([
      "<link rel='stylesheet' type='text/css' href='bower_components/jQuery-contextMenu/src/jquery.contextMenu.css'/>",
      "<link rel='stylesheet' type='text/css' href='bower_components/font-awesome/css/font-awesome.css'/>",
      "",
      "<script src='bower_components/jquery/dist/jquery.min.js'></script>",
      "<script src='bower_components/jQuery-contextMenu/src/jquery.contextMenu.js'></script>",
      "<script src='bower_components/jQuery-contextMenu/src/jquery.ui.position.js'></script>",
    ]);
    this.text("\tOnce the dependencies are included, also include wcDocker files as well:");
    this.html([
      '<link rel="stylesheet" type="text/css" href="Build/wcDocker.min.css"/>',
      '',
      '<script src="Build/wcDocker.min.js"></script>',
    ]);
    this.text("\tOnce the dependencies have been included, start by creating an instance of the main docker window and assign it a DOM container element (this should be done after the document is ready). Typically this would be the document body, but there is no restriction if you want to use a smaller area instead.  Multiple main windows can be used, however, no support exists for cross interaction between them (yet?).  Also note that floating windows are not constrained to the given container element, they can float anywhere in the browser window.");
    this.code([
      "$(document).ready(function() {",
      "\tvar myDocker = new wcDocker(document.body);",
      "}",
    ]);
    this.text([
      "\tThe main docker window contains docking panels which can be moved around and organized at will by the user. All docking panels have to be registered first before use, this allows the docker to manage their creation.",
      "To register a new type, use the " + this.__wikiLink('wcDocker', 'registerPanelType') + " function in one of two ways:"
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
      "",
      "\tInside the creation function, or object constructor, you are given the wcPanel that was just created, as well as an optional data value provided during the registration of the panel type (when registering the panel type, the second parameter can be an object with an 'options' key/value).  Every panel contains a wcLayout object which lays out the contents of the panel in a grid format.  To add a DOM element to it, use the layouts addItem function and supply it with either your element directly, a jQuery collection object, or a jQuery creation string, and an x, y grid position within the layout (by default = 0, 0).",
      "",
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
      this.__wikiLink('wcDocker', 'DOCK_MODAL', 'wcDocker.DOCK_MODAL') + " = Make a floating window that blocks all access to panels below it until closed.",
      this.__wikiLink('wcDocker', 'DOCK_FLOAT', 'wcDocker.DOCK_FLOAT') + " = Make a floating window that is not docked.",
      this.__wikiLink('wcDocker', 'DOCK_LEFT', 'wcDocker.DOCK_LEFT') + " = Dock it to the left side of the central or target panel.",
      this.__wikiLink('wcDocker', 'DOCK_RIGHT', 'wcDocker.DOCK_RIGHT') + " = Dock it to the right side of the central or target panel.",
      this.__wikiLink('wcDocker', 'DOCK_TOP', 'wcDocker.DOCK_TOP') + " = Dock it to the top of the central or target panel.",
      this.__wikiLink('wcDocker', 'DOCK_BOTTOM', 'wcDocker.DOCK_BOTTOM') + " = Dock it on the bottom of the central or target panel.",
      this.__wikiLink('wcDocker', 'DOCK_STACKED', 'wcDocker.DOCK_STACKED') + " = Dock the new panel stacked (tabbed) with another existing panel.",
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

  // --------------------------------------------------------------------------------
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
      "",
      "\tSaving retrieves a string value with the information wcDocker needs to reconstruct all panels in their current configuration.  Using that string, you can then restore a previous layout.",
    ]);
    this.code([
      "var savedLayout = myDocker.save();",
      "myDocker.restore(savedLayout);",
    ]);
    this.text([
      "\tAdditionally, any panel can receieve the " + this.__wikiLink('wcDocker', 'EVENT_SAVE_LAYOUT', 'wcDocker.EVENT_SAVE_LAYOUT') + " and " + this.__wikiLink('wcDocker', 'EVENT_RESTORE_LAYOUT', 'wcDocker.EVENT_RESTORE_LAYOUT') + " events to save and restore additional information for that panel."
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

  // --------------------------------------------------------------------------------
  __constructWidgetTab: function(layout) {
    this.__initTabLayout(layout);

    this.text([
      "\tThe widget panel demonstrates some of the custom layout widgets provided for you by wcDocker.",
    ]);

    var $scene = $('<div style="position:relative;width:100%;height:100%;">');
    layout.addItem($scene, 0, this._layoutRow++);
    layout.finishBatch();
    layout.item(0, this._layoutRow-1).parent().css('height', '100%');

    this._widgetTabsFrame = new wcTabFrame($scene, this._panel);
    this.__constructPanelButtonTab(this._widgetTabsFrame.addTab('Panel Buttons'));
    this.__constructSplitterTab(this._widgetTabsFrame.addTab('Splitter'));
    this.__constructTabsTab(this._widgetTabsFrame.addTab('Tabs'));
    this.__constructIFrameTab(this._widgetTabsFrame.addTab('iFrame'));
  },

  // --------------------------------------------------------------------------------
  __constructChatTab: function(layout) {
    this.__initTabLayout(layout);

    this.text([
      "\tThe chat panel demonstrates the use of the built-in event messaging system to broadcast information between panels.",
      "",
      "\tYou can register a panel event by using the " + this.__wikiLink('wcPanel', 'on') + " function with an event name to listen for and a callback function to call whenever that event is triggered.  wcDocker supports a number of " + this.__wikiLink('wcDocker', 'events', 'pre-defined') + " events that are triggered internally, but you may also provide your own custom event names for your own use as well.",
    ]);
    this.code([
      "myPanel.on('Message', function(data) ",
      "\t// The data passed in is the data object sent by the sender",
      "\tvar text = data.sender + ': ' + data.message + '\\n'",
      "\t$chatArea.html($chatArea.html() + text);",
      "});",
    ]);
    this.text("\tOnce you are listening to an event type, whenever another panel " + this.__wikiLink('wcPanel', 'trigger', 'triggers') + " that event, you will receive it.  The second parameter is an optional value or object that will be sent to all receivers.");
    this.code([
      "myPanel.trigger('Message', {",
      "  sender:  'Bob',",
      "  message: 'Hello World!',",
      "});",
    ]);

    this.__finishTabLayout();
  },

  // --------------------------------------------------------------------------------
  __constructBatchTab: function(layout) {
    this.__initTabLayout(layout);

    this.text([
      "\tThe batch panel demonstrates a speed comparison between adding layout items one at a time vs using the batching system.",
      "\tWrap all calls to " + this.__wikiLink('wcLayout', 'addItem') + " with a call to " + this.__wikiLink('wcLayout', 'startBatch') + " and " + this.__wikiLink('wcLayout', 'finishBatch') + " to avoid re-calculating and re-drawing the page between every added item.",
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

  // --------------------------------------------------------------------------------
  __constructPanelButtonTab: function(layout) {
    this.__initTabLayout(layout);

    this.text([
      "\tAll panels can contain their own custom buttons that appear in the upper right corner of the panel (where the title bar and close button is).  They can be normal or toggle buttons with any function that you wish.",
      "",
      "\tTo add a new button, use the " + this.__wikiLink('wcPanel', 'addButton') + " function:",
    ]);
    this.code("myPanel.addButton('Some ID Name', 'normalStateClass', 'B', 'Tooltip text', true, '');");
    this.text([
      "\tThe first parameter identifies the button, for later use.",
      "\tThe second parameter is a class name to apply to the button when it is in normal state.",
      "\tThe third parameter is a fallback text value to apply on the button, if the icon fails to display you will see this.  <b>Note:</b> Buttons are very small so it is likely that only a single letter can fit.",
      "\tThe fourth parameter is tooltip text, visible when the user hovers the mouse cursor over it.",
      "\tThe fifth parameter is an optional boolean value that defines whether the button can toggle between pressed and normal state.  By default, buttons are not toggle-able.",
      "\tThe sixth parameter is an optional class name to apply to the button when it is in toggled state.  This new class will replace the normal state class.",
      "",
      "\tPanel buttons can be added and removed at any time.  To remove a button, use the " + this.__wikiLink('wcPanel', 'removeButton') + " function.",
    ]);
    this.code("myPanel.removeButton('Some ID Name');");
    this.text("\tAny time a panel button has been clicked on, you can catch the notification from the " + this.__wikiLink('wcDocker', 'EVENT_BUTTON', 'wcDocker.EVENT_BUTTON') + " event.");
    this.code([
      "myPanel.on(wcDocker.EVENT_BUTTON, function(data) {",
      "\t// In case we have multiple panel buttons, we can check the name of the button.",
      "\tif (data.name === 'Some ID Name') {",
      "\t\tvar toggled = data.isToggled;",
      "\t\tif (toggled) {",
      "\t\t\t// The button has been clicked, and its current toggle state is depressed.",
      "\t\t} else {",
      "\t\t\t// The button has been clicked, and its current toggle state is normal.",
      "\t\t}",
      "\t}",
      "});",
    ]);
    this.text("\tAdditionally, you can also manually toggle the state of a panel button by using " + this.__wikiLink('wcPanel', 'buttonState') + ".");
    this.code("myPanel.buttonState('Some ID Name', true);");

    this.__finishTabLayout();
  },

  // --------------------------------------------------------------------------------
  __constructSplitterTab: function(layout) {
    this.__initTabLayout(layout);

    this.text([
      "\tThe " + this.__wikiLink('wcSplitter', '', 'splitter') + " widget separates two elements by a moveable bar either " + this.__wikiLink('wcDocker', 'ORIENTATION_VERTICAL', 'vertically') + " or " + this.__wikiLink('wcDocker', 'ORIENTATION_HORIZONTAL', 'horizontally') + ".  It is the same one used by wcDocker to organize the layout of the panels.",
      "",
      "\tTo use it, you will need an element that will contain it.  This element should be added to your layout and will mark the size and location of the split area.",
      "\t<b>Note:</b> The containing element must be positioned either absolutely or relatively in CSS.",
    ]);
    // this.html("<div class='splitterContainer' style='position:relative;width:100%;height:100%;'></div>");
    this.code([
      "var $container = $('<div style=\"position:relative;width:100%;height:100%;\"></div>');",
      "myLayout.addItem($container);"
    ]);
    this.text("\tConstruct a new " + this.__wikiLink('wcSplitter', '', 'wcSplitter') + " and initialize it with the containing element, the owner panel, and an initial orientation.");
    this.code("var splitter = new wcSplitter($container, myPanel, wcDocker.ORIENTATION_HORIZONTAL);");
    this.text("\tWhen using the splitter widget inside your panel, it is necessary to initialize the two layouts that will be contained on each side of the split.");
    this.code("splitter.initLayouts();");
    this.text("\tWe can also provide an initial split position by giving it a percentage value from 0 to 1.  The smaller the percentage, the smaller the layout on the left or top will be.");
    this.code("splitter.pos(0.25);");
    this.text("\tNow it is time to populate the contents of each side, to do this, access the layout contained in its " + this.__wikiLink('wcSplitter', 'pane', 'pane') + " on each side.");
    this.code([
      "var leftOrTopLayout     = splitter.pane(0);",
      "var rightOrBottomLayout = splitter.pane(1);",
    ]);
    this.text([
      "\tOnce you have the layouts for each side, you can " + this.__wikiLink('wcLayout', 'addItem', 'add items') + " to it like you would any layout.",
      "",
      "\tAt any time, calling the " + this.__wikiLink('wcSplitter', 'orientation') + " function can be used to change it's orientation.",
    ]);
    this.code("splitter.orientation(wcDocker.ORIENTATION_VERTICAL);");
    this.text("\tMore attributes exist to give you more control over the splitter, take a look at its " + this.__wikiLink('wcSplitter', '', 'API documentation') + " for more information.");

    this.__finishTabLayout();
  },

  // --------------------------------------------------------------------------------
  __constructTabsTab: function(layout) {
    this.__initTabLayout(layout);

    this.text([
      "\tThe " + this.__wikiLink('wcTabFrame', '', 'tab frame') + " widget allows you to separate multiple 'pages' into a row of tabbed items.  Only one tab can be active at one time, allow only one 'page' to be visible.",
      "",
      "\tTo use it, you will need an element that will contain it.  This element should be added to your layout and will mark the size and location of the tabbed frame area.",
    ]);
    this.code([
      "var $container = $('<div style=\"width:100%;height:100%;\"></div>');",
      "myLayout.addItem($container);"
    ]);
    this.text("\tConstruct a new " + this.__wikiLink('wcTabFrame', '', 'wcTabFrame') + " and initiailize it with the containing element and the owner panel.");
    this.code("var tabFrame = new wcTabFrame($container, myPanel);");
    this.text([
      "\tAt this point, the tab frame contains no tabbed items, so we'll need to add them.  The " + this.__wikiLink('wcTabFrame', 'addTab') + " function will create a new tab with a given name and can take an optional second parameter which allows you to specify the index of where to place the new tab (by default it is appended).",
      "\tIt will also return the newly created " + this.__wikiLink('wcLayout', '', 'layout') + " contained within the tab content area.",
    ]);
    this.code([
      "tabFrame.addTab('Custom Tab 2');",
      "var tabLayout = tabFrame.addTab('Custom Tab 1', 0);",
    ]);
    this.text("\tIf you did not catch the " + this.__wikiLink('wcLayout', '', 'layout') + " at the time the tab was added, it is ok!  You can still access it " + this.__wikiLink('wcTabFrame', 'layout', 'here') + ":");
    this.code("var tabLayout = tabFrame.layout(1);");
    this.text("\tMore attributes exist to give you more control over the tab frame, take a look at its " + this.__wikiLink('wcTabFrame', '', 'API documentation') + " for more information.");

    this.__finishTabLayout();
  },

  // --------------------------------------------------------------------------------
  __constructIFrameTab: function(layout) {
    this.__initTabLayout(layout);

    this.text([
      "\tThe " + this.__wikiLink('wcIFrame', '', 'iFrame') + " widget makes it easier to include an iFrame into your panel. Because an iFrame's contents is cleared whenever it is moved in the DOM heirarchy (and changing a panels docking position causes DOM changes), special care must be taken when using them.",
      "",
      "\tTo use it, you will need an element that will contain it.  This element should be added to your layout and will mark the size and location of the iFrame area.",
      "\t<b>Note: </b> Some limitations exist when using it.  For example, even if the container element is partially hidden beyond the bounds of the panel, the iFrame will still be fully visible.",
    ]);
    this.code([
      "var $container = $('<div style=\"width:100%;height:100%;\"></div>');",
      "myLayout.addItem($container);"
    ]);
    this.text("\tConstruct a new " + this.__wikiLink('wcIFrame', '', 'wcIFrame') + " and initialize it with the containing element and the owner panel.");
    this.code("var frame = new wcIFrame($container, myPanel);");
    this.text("\tOnce the frame is constructed, it needs either a " + this.__wikiLink('wcIFrame', 'openURL', 'web URL address') + " or " + this.__wikiLink('wcIFrame', 'openSRC', 'raw HTML code') + " to determine its contents.");
    this.code([
      "frame.openURL('http://www.example.com');",
      "// Or...",
      "frame.openHTML('<!DOCTYPE HTML><html><head></head><body><span>Hello World!</span></body></html>');",
    ]);
    this.text([
      "\tAt any time, the 'window' object found within the iFrame can be retrieved by calling " + this.__wikiLink('wcIFrame', 'window') + ".",
      "",
      "\tMore attributes exist to give you more control over the iFrame, take a look at its " + this.__wikiLink('wcIFrame', '', 'API documentation') + " for more information.",
    ]);

    this.__finishTabLayout();
  },
};