Try the demo here:  [http://docker.webcabin.org/](http://docker.webcabin.org/)  

wcDocker (Web Cabin Docker) is a powerful window layout system with a responsive and completely interactive design.  Move, remove, create, and duplicate panel windows at any time!  Organize how you wish!

View the API documentation here: [https://github.com/WebCabin/wcDocker/wiki](https://github.com/WebCabin/wcDocker/wiki)  


### Features ###
* Extremely responsive design!
* Organization and duplication of panels at any time!
* Easily create your own themes!
* Comprehensive API Documentation!
* Easily save and restore your layout!
* Compatible with all major browsers, including IE8.
* Completely free!

****
### Change Log ###
#### Version: Trunk ####

#### Version: 2.2.0 ####
- Separated the default theme out of wcDocker.css (now use wcDockerSkeleton.css with Themes/default.css).
- Added wcDocker.panelTypeInfo() and wcPanel.info() that will retrieve the registration data of a panel.
- Added wcDocker.panelTypes() to retrieve a list of all registered panel types.
- New event type wcDocker.EVENT.INIT.
- Panel width and height can now be retrieved.
- wcPanel functions initPos, initSize, minSize, and maxSize can now take a string value with a 'px' or '%' suffix.
- Fixed issue with using normal CSS icons in the context menu.
- Improved auto scrolling of tab items when clicked.
- Created a new wcCustomTabs object for creating docker styled tab areas inside a panel.
- Floating panels can now be modal.
- Create your own splitter widget within a panel.
- Create your own tabbed frame widget within a panel.
- Create your own iFrame widget within a panel.

#### Version: 2.1.0 ####
- wcDocker now has Bower support for easy package management.
- wcSplitter is now usable inside a panel.
- Improved performance of panel resizing.
- wcPanel.focus() now actually sets itself as the current active tab.
- wcDocker.registerPanelType() has a new option {limit: Number} that limits the total number of copies for this panel.
- New event type wcDocker.EVENT.VISIBILITY_CHANGED, triggered whenever the panel gains or loses visibility.  Use wcPanel.isVisible() to retrieve the current state.
- Reduced DOM changes during tab change and resize.
- New event types wcDocker.EVENT.BEGIN_DOCK and wcDocker.EVENT.END_DOCK that trigger whenever the user is dragging a panel to a new location.
- New event types wcDocker.EVENT.GAIN_FOCUS and wcDocker.EVENT.LOST_FOCUS that trigger whenever a panel is brought it and out of focus.
- Floating panels no longer change size whenever a new panel is added to it as a tab.

#### Version: 2.0.0 ####
- Layout grid can now have a spacing size.
- Layout grid can now be set to alternating row color.
- wcLayout.item() added to retrieve an already existing item in the layout.
- wcDocker can now send and receive events.
- wcLayout can now batch large numbers of elements added without page refreshing between each.
- wcPanel can now contain custom buttons that appear within the title bar.
- wcDocker.basicMenu() now has an option to include the default menu options along with your custom ones.
- wcDocker.basicMenu() can now accept a dynamic callback function that returns custom menu's at the time of the event.
- New events added for resize start, resize end, move start, and move end.
- Panels can now be set to hide their contents whenever they are resized.
- wcDocker constructor now takes an options object.
- wcDocker now has an option to disable the default context menu.
- Panel tabs are now scrollable.
- Icons are now supported using regular CSS or the Font-Awesome library [http://fortawesome.github.io/Font-Awesome/](http://fortawesome.github.io/Font-Awesome/).
- wcDocker.registerPanelType() can now take an options object instead of just a single callback.
- Fixed layout save/restore.
- Fixed layout clear not actually removing elements.
- Fixed compatibility with IE8.
- Fixed tabs disappearing when the panel is too small to fit them.

****
# Dependencies #

* JQuery Library version 1.11.1 [http://jquery.com/](http://jquery.com/)
* JQuery ContextMenu Library [https://github.com/medialize/jQuery-contextMenu](https://github.com/medialize/jQuery-contextMenu)
* Font-Awesome [http://fortawesome.github.io/Font-Awesome/](http://fortawesome.github.io/Font-Awesome/)

****
# Installation #

wcDocker now uses [bower](http://bower.io/) for easy installation.  You can install bower using `npm`:
```
npm install -g bower
```

This command will install bower *globally*, from there you can install wcDocker with the following command:  
```
bower install wcdocker
```

Once installed, all of the source files will now be located in the `bower_components` folder and ready to link into your project:
```
<link rel="stylesheet" type="text/css" href="bower_components/jQuery-contextMenu/src/jquery.contextMenu.css"/>
<link rel="stylesheet" type="text/css" href="bower_components/font-awesome/css/font-awesome.css"/>
<link rel="stylesheet" type="text/css" href="bower_components/wcdocker/Build/wcDocker.min.css"/>

<script src="bower_components/jquery/dist/jquery.min.js"></script>
<script src="bower_components/jQuery-contextMenu/src/jquery.contextMenu.js"></script>
<script src="bower_components/jQuery-contextMenu/src/jquery.ui.position.js"></script>
<script src="bower_components/wcdocker/Build/wcDocker.min.js"></script>
```

You may also include any of the optional css themes found in the `bower_components/wcdocker/Build/Themes/` folder.    

****
# Basic Implementation #

For more detailed information on the API, check out the wiki here: [https://github.com/WebCabin/wcDocker/wiki](https://github.com/WebCabin/wcDocker/wiki).

Begin by creating an instance of the main docker window and assign it a DOM container element. Typically this would be the document body, but there is no restriction if you want to use a smaller area instead.  Multiple main windows can be used, however, no support exists for cross interaction between them (yet?).  Also note that floating windows are not constrained to the given container element, they can float anywhere in the browser window.
```
#!javascript
var myDocker = new wcDocker(document.body);
```
The main docker window contains docking panels which can be moved around and organized at will by the user. All docking panels have to be registered first before use, this allows the docker to manage their creation.
To register a new type, use the wcDocker.registerPanelType() function in one of two ways:
```
#!javascript
myDocker.registerPanelType('Some type name', function(myPanel, options) {});
// Or
myDocker.registerPanelType('Some type name', {
  onCreate: function(myPanel, options) {},
});
```
The first parameter is a unique name identifier that identifies the panel.  You will also need a callback function or object constructor (the function is called with the 'new' operator, which will either create a new instance of your panel object if you have provided a constructor, or simply calls the creation function) that will be passed into the second parameter as either the function directly, or within an object with other possible options.  

Inside the creation function, or object constructor, you are given the wcPanel that was just created, as well as an optional data value provided during the registration of the panel type (when registering the panel type, the second parameter can be an object with an 'options' key/value).  Every panel contains a wcLayout object which lays out the contents of the panel in a grid format.  To add a DOM element to it, use the layouts addItem function and supply it with either your element directly, a jQuery collection object, or a jQuery creation string, and an x, y grid position within the layout (by default = 0, 0).
You can also stretch an element over multiple grid cells by supplying an optional width and height value.
```
#!javascript
myPanel.layout().addItem(myElement, x, y, width, height);
```
Additionally, you can also assign various starting properties of the panel here, such as the desired or the minimum size.
```
#!javascript
myPanel.initSize(200, 200);
myPanel.minSize(100, 100);
```
Now, once you have registered your panel types, if they are not private, the user will be able to create those panels whenever they wish.  However, it is also recommended that you initialize the window with a starting layout in order to give your users something to see at the beginning.
```
#!javascript
myDocker.addPanel('Registered type name', wcDocker.DOCK.LEFT, optionalTargetPanel, optionalRect);
```
The first parameter is the name of the panel type you have previously registered.
The second parameter is an enumerated value that determines the location where this window will be docked
(or try to dock), it can be one of the following:  

wcDocker.DOCK.MODAL    = Make a floating window that blocks all access to panels below it until closed.  
wcDocker.DOCK.FLOAT    = Make a floating window that is not docked.  
wcDocker.DOCK.LEFT     = Dock it to the left side of the central or target panel.  
wcDocker.DOCK.RIGHT    = Dock it to the right side of the central or target panel.  
wcDocker.DOCK.TOP      = Dock it to the top of the central or target panel.  
wcDocker.DOCK.BOTTOM   = Dock it on the bottom of the central or target panel.  
wcDocker.DOCK.STACKED  = Dock the new panel stacked (tabbed) with another existing panel.  

The fourth parameter is optional, normally panels will dock in relation to the entire docker container. However, by supplying a specific panel instead, your new panel will be docked in relation to that target.
The fifth, and final, parameter is also optional and consists of a data object with custom options.  These options are then passed into the constructor object of the panel when it is created.
The return value is the newly created docking panel, in the case that you may want it.

For more detailed information on the API, check out the wiki here: [https://github.com/WebCabin/wcDocker/wiki](https://github.com/WebCabin/wcDocker/wiki).

****
# User Interaction #

For the most part, arranging your windows is as simple as a drag-drop operation.  Click the title-bar of any panel frame and drag to begin moving an entire panel frame, or just click and drag one of the tabs to move a single panel.  You can drag the panel(s) into the title bar of another frame to merge yours into it, you can drag them to the edge of another frame and split that frame into two, or you can drag it anywhere that does not anchor to make it into its own floating window.

To create new panels, right click on the position where you want the new panel to be inserted and choose the the panel to create within the menu.

****
## License ##

[MIT License](http://www.opensource.org/licenses/mit-license.php)

&copy; 2014-2014 Jeff P. Houde ([lochemage@gmail.com](mailto:lochemage@gmail.com))

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

****
## Suggestions/Comments? ##
Please feel free to contact me, Jeff Houde ([lochemage@gmail.com](mailto:lochemage@gmail.com)), for any information or to give feedback and suggestions.  Also, if you are a web programmer, and believe you can help, please let me know!

Thank you
