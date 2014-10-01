wcDocker (Web Cabin Docker) is a page layout framework that gives you dynamic docking panels.  Panels can float on their own or be docked on any side of any other panel.  All panels can be moved, resized, removed, and created at will by the user (unless otherwise restricted).  This project is currently under development by Jeff Houde (lochemage@gmail.com).  wcDocker requires the JQuery library, currently developed using version 1.11.1 although earlier versions should work as well.

For a currently working demo, try it here [http://docker.webcabin.org](http://docker.webcabin.org)

Please share your project with us that uses wcDocker!


### The following features are supported currently: ###
* Panels can be created, closed, moved, resized, and groupped together.
* Panels can be detached from a dock position to float on their own, and then dock again.
* Panels can include their own custom buttons in their upper-right area.
* Panel buttons and tabs can contain their own icon image.
* Panel configurations can be saved, then later restored.
* Multiple panels of the same type can be created.
* Built in context menu system with standard panel options as well as custom ones.
* Event system for intercommunication between panels as well as to react on panel change events.
* Allow styling of window colors and other options by using themed css files.
* Re-use the internal splitter within your own panels.

****
### Change Log ###
#### Version: Trunk ####
- wcSplitter is now usable inside a panel.
- Improved performance of panel resizing.
- wcPanel.focus() now actually sets itself as the current active tab.
- wcDocker.registerPanelType() has a new option {limit: Number} that limits the total number of copies for this panel.
- New event type wcDocker.EVENT_VISIBILITY_CHANGED, triggered whenever the panel gains or loses visibility.  Use wcPanel.isVisible() to retrieve the current state.
- Reduced DOM changes during tab change and resize.
- New event types wcDocker.EVENT_BEGIN_DOCK and wcDocker.EVENT_END_DOCK that trigger whenever the user is dragging a panel to a new location.
- New event types wcDocker.EVENT_GAIN_FOCUS and wcDocker.EVENT_LOST_FOCUS that trigger whenever a panel is brought it and out of focus.
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
# Dependancies #

* JQuery Library version 1.11.1 [http://jquery.com/](http://jquery.com/)
* Custom version of JQuery ContextMenu Library [https://github.com/medialize/jQuery-contextMenu](https://github.com/medialize/jQuery-contextMenu)
* (Optional) Font-Awesome [http://fortawesome.github.io/Font-Awesome/](http://fortawesome.github.io/Font-Awesome/)

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
