wcDocker (Web Cabin Docker) is a page layout framework that gives you dynamic docking windows.  Windows can float on their own or be docked on any side of any other window.  All windows can be moved, resized, removed, and created at will by the user (unless otherwise restricted).  This project is currently under development by Jeff Houde (lochemage@gmail.com).  wcDocker requires the JQuery library, currently developed using version 2.1.1 although earlier versions should work as well.

For a currently working demo, try it here [http://docker.webcabin.org](http://docker.webcabin.org)

### The following features are supported currently: ###

* Panels can be docked to any side of any other window.
* Panels can be detached from a dock position and float on their own.
* Panels can be resized.
* Panels can be closed via close button.
* Panels can be initialized in code for a default layout.
* Panels can be programmed with a minimum size constraint.
* Multiple panels of the same type can be created.
* Panels can be created via context menu.
* Event system to react on panel changes.

### The following features are still under development: ###

* Ability to group multiple windows into the same dock panel via tabbing.
* Save/Restore support for remembering a user's panel setup.
* A possible option of restricting the number of total windows created.
* A possible option of restricting the total copies of the same window type.
* Allow styling of window colors and other options either by changing css files or an internal color picker system.

****

# Code #


Begin by creating an instance of the main docker window and assigning it a container DOM element.
Typically this would be the document body, but there is no restriction if you want to use a
smaller area instead.  Multiple main windows can be used, however, no support exists for
cross interaction between them (yet?).  Also note that floating windows are not constrained to
the given container element, they can float anywhere in the browser window.
```
#!javascript
var docker = new wcDocker(document.body);
```
The docker window contains a central panel which can not be moved or hidden and should be
filled with content for your main view.  Use the center() function to access its layer.

```
#!javascript
var layout = docker.center();
```
The central panel is a layout.  Layouts are the container where all your window's content will be placed.
Each layout is a table grid that is dynamically resized based on content given. To add a DOM element,
add it into your layout at a location within its grid. You can also optionally include width and height values
if you wish to stretch an element over multiple grid cells.
```
#!javascript
layout.addItem(element, x, y, width, height);
```
The main docker window also contains docking panels, which can be moved around and organized at will by the user.
All docking panels have to be registered first before use, this allows the docker to know what types
of docking panels are available and allow the user to add and remove them at will.  To register a new type,
you will need a unique name to identify it and a function callback which allows you to setup the window
when it is created.  Note, there is also an optional third parameter to mark it private, by supplying a true value the user will not be able to create an instance of this panel type.
```
#!javascript
docker.registerPanelType('Some type name', function(panel) {});
```
Inside the callback function you are given the panel that was just created, from here you can
access its layout and populate it, much the same as done with the central panel.
```
#!javascript
  panel.layout().addItem(element, x, y, width, height);
```
You can also set various properties of the panel here as well, such as
the desired size, or the minimum size.
```
#!javascript
  panel.size(200, 200);
  panel.minSize(100, 100);
});
```
Registering a panel type does not actually create an instance of it into your window.  To create an instance,
use the addPanel() function in the docker.
```
#!javascript
docker.addPanel('Registered type name', wcDocker.LEFT, false, optionalTargetWidget);
```
The first parameter is the name of the panel type you have previously registered.
The second parameter is an enumerated value that determines the location where this window will be docked.
It can be one of the following:

wcDocker.DOCK_FLOAT    = Make a floating window that is not docked.

wcDocker.DOCK_LEFT     = Dock it to the left side of the window.

wcDocker.DOCK_RIGHT    = Dock it to the right side of the window.

wcDocker.DOCK_TOP      = Dock it to the top of the window.

wcDocker.DOCK_BOTTOM   = Dock it on the bottom of the window.

The third parameter determines whether this window is allowed to group up with another already existing panel
as a tabbed view (currently, tabbed view is not supported so there will be no way to switch the widget
being viewed) or if the new window should appear standalone creating another window panel.

The final parameter is optional, normally docked windows will dock in relation of the main docker's central
panel. However, by supplying a specific one instead, your new panel will be docked in relation to the target.
The return value is the newly created docking panel, in the case that you may want it.

For more detailed information on the API, check out the [wiki](https://bitbucket.org/WebCabin/wcdocker/wiki/Home).

****

# Usage #

For the most part, arranging your windows is as simple as a drag-drop operation.  Click the title-bar of any window and drag it to a new location and it will either be docked or float there.  The exception is for floating windows, if you drag them they will just move rather than try to dock.  To dock a floating window, toggle the lock button on its upper left corner and try to drag it, or drag using the middle mouse button.  Dragging with the middle mouse button on a docked window will also force it to float.