wcDocker (Web Cabin Docker) is a page layout framework that gives you dynamic docking panels.  Panels can float on their own or be docked on any side of any other panel.  All panels can be moved, resized, removed, and created at will by the user (unless otherwise restricted).  This project is currently under development by Jeff Houde (lochemage@gmail.com).  wcDocker requires the JQuery library, currently developed using version 2.1.1 although earlier versions should work as well.

For a currently working demo, try it here [http://docker.webcabin.org](http://docker.webcabin.org)

### The following features are supported currently: ###
* Panels can be docked to any side of any other window.
* Panels can be detached from a dock position to float on their own, and then dock again.
* Panels can be resized.
* Panels can be closed via close button.
* Panels can be initialized in code for a default layout.
* Panels can be programmed with a minimum and maximum size constraint.
* Multiple panels of the same type can be created.
* Panels can be created via context menu.
* Event system to react on panel changes.
* Ability to group multiple windows into the same dock panel via tabbing.
* Saving and Restoring of full window panel configurations.
* Allow styling of window colors and other options by using themed css files.

### The following features could possibly be developed next: ###
* Ability to add custom buttons to a panel within the title bar area.
* The ability for floating windows to be a true window, and therefore leave the bounds of the page.
* An option of restricting the number of total panels created.
* An option of restricting the total copies of the same panel type.

****
### Change Log ###
#### Version: Beta ####
* You can now add custom buttons that appear in the panels title bar.
* Ability to batch together large layout operations to minimize reflow.
* Events can now be applied to the main docker, rather than only panels.
* Ability to retrieve layout table items from a specified grid location.
* Ability to set the layouts grid spacing size.
* Ability to alternate the layout row colors.
* Layout save and restore now generate a string instead of a data object due to a bug with the default JSON stringify not converting the object properly.

****
# Dependancies #

* JQuery Library version 2.1.1 [http://jquery.com/](http://jquery.com/)
* Custom version of JQuery ContextMenu Library [https://github.com/medialize/jQuery-contextMenu](https://github.com/medialize/jQuery-contextMenu)

If you use the pre-built packages wcDocker.js or wcDocker.min.js then the contextMenu library is embedded into it already.

****
# Basic Implementation #

For more detailed information on the API, check out the wiki here: [https://github.com/WebCabin/wcDocker/wiki](https://github.com/WebCabin/wcDocker/wiki).

Begin by creating an instance of the main docker window and assign it a DOM container element.
Typically this would be the document body, but there is no restriction if you want to use a
smaller area instead.  Multiple main windows can be used, however, no support exists for
cross interaction between them (yet?).  Also note that floating windows are not constrained to
the given container element, they can float anywhere in the browser window.
```
#!javascript
var myDocker = new wcDocker(document.body);
```
The main docker window contains docking panels which can be moved around and organized at will by the user.
All docking panels have to be registered first before use, this allows the docker to manage their creation.
To register a new type, you will need a unique name to identify it and a function or class object constructor that
takes in the newly created panel.  If you are unfamiliar with object-oriented javascript, there are plenty of
tutorials online.  Finally, there is also an optional third parameter that will mark the panel type as private,
by supplying a true value the user will not be able to create an instance of this panel type via normal, built-in,
methods.
```
#!javascript
myDocker.registerPanelType('Some type name', function(myPanel) {});
```
Inside the callback function, or object constructor, you are given the panel that was just created, from the panel
you can access the layout.  The layout is organized in a grid pattern and will be where all of the contents of your
panel will go.  To add a DOM element to it, supply it with your element and a grid x, y position (by default = 0, 0).
You can also stretch an element over multiple grid cells by supplying an optional width and height value, by default
they stay within their 1 cell.
```
#!javascript
myPanel.layout().addItem(myElement, x, y, width, height);
```
You can also assign various starting properties of the panel here, such as the desired or the minimum size.
```
#!javascript
myPanel.initSize(200, 200);
myPanel.minSize(100, 100);
```
Now, once you have registered your panel types, if they are not private, the user will be able to create those panels
whenever they wish.  However, it is also recommended that you initialize a starting panel layout in order to give
your users a place to start.
```
#!javascript
myDocker.addPanel('Registered type name', wcDocker.LEFT, false, optionalTargetPanel);
```
The first parameter is the name of the panel type you have previously registered.
The second parameter is an enumerated value that determines the location where this window will be docked
(or try to dock), it can be one of the following:  

wcDocker.DOCK_FLOAT    = Make a floating window that is not docked.  
wcDocker.DOCK_LEFT     = Dock it to the left side of the central or target panel.  
wcDocker.DOCK_RIGHT    = Dock it to the right side of the central or target panel.  
wcDocker.DOCK_TOP      = Dock it to the top of the central or target panel.  
wcDocker.DOCK_BOTTOM   = Dock it on the bottom of the central or target panel.  

The third parameter determines whether this panel is allowed to group up (via tabs) with another panel, or if it should
appear by itself.
And the final parameter is optional, normally panels will dock in relation to the main docker's central
panel. However, by supplying a specific panel instead, your new panel will be docked in relation to that target.
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
