wcDocker (Web Cabin Docker) is a an experimental project intended as a framework for a docked window view.  You will be able to add as many docked windows as you wish, each docked window can be drag-dropped to new locations as well as grouped into multi-tabbed dock windows or pulled outside as their own floating window.

****

# Usage #


Begin by creating an instance of the main window and assigning it a container DOM element.
```
#!javascript
var wcWindow = new wcMainWindow($('body'));
```
To access the central widget (our main window area that is permanent).
First retrieve the central widget, which is a wcLayout.

```
#!javascript
var layout = wcWindow.center();
```
The layout is laid out in a grid pattern, to add a JQuery DOM element into it, just
supply it with the location within the grid.  You can also optionally include
width and height values if you want to stretch an element over multiple cells.
```
#!javascript
layout.addItem($DOM, x, y, width, height);
```
Dock widget types must be registered first before they can be used, this allows
the window to know what types of dock widgets are available and allow the user
to add and remove them at will.  To register a new type, supply it with a
string name for the type and a function callback which populates our new widget
with the contents of the window.
```
#!javascript
wcWindow.registerDockWidgetType('Some type name', function(widget) {
```
Inside the callback function you are given the dock widget, from here you can
access the layout and populate it much the same as the central widget.
```
#!javascript
  widget.layout().addItem($DOM, x, y, width, height);
```
You can also set various properties of the widget here as well, such as
the current, min, and max window sizes.
```
#!javascript
  widget.size(200, 200);
  widget.minSize(100, 100);
  widget.maxSize(Infinity, Infinity);
});
```
Once you have registered one or more dock widget types, you can initialize
any dock widgets you wish to start with.  Note that the user has full access
to add and remove their own, so initializing a default layout is only a
convenience.
To add a new dock widget to your window, give it your type name and a
desired destination to place it.  The destination can be one of either:

wcGLOBALS.DOCK_LOC.FLOAT    = Make a floating window that is not docked.

wcGLOBALS.DOCK_LOC.LEFT     = Dock it to the left side of the window.

wcGLOBALS.DOCK_LOC.RIGHT    = Dock it to the right side of the window.

wcGLOBALS.DOCK_LOC.BOTTOM   = Dock it on the bottom of the window.

The third parameter determines whether this window is allowed to group
up with another already existing window in a tabbed view (currently, tabbed
frames are not supported so there will be no way to switch the widget
being viewed).
The final parameter is optional, you can give it an existing dock widget
and your new dock widget will be added in relation to the target rather
than to the entire window.
```
#!javascript
wcWindow.addDockWidget('Some type name', wcGLOBALS.DOCK_LOC.LEFT, false, optionalTargetWidget);
```
addDockWidget also returns you the newly created dock widget item, in the
case that you may want it.
