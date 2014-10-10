var _fs        = require('fs');
var _uglifyJS  = require('uglify-js');
var _uglifyCSS = require('uglifycss');

function concat(opts) {
    var fileList = opts.src;
    var distPath = opts.dest;
    var out = fileList.map(function(filePath){
            return _fs.readFileSync(filePath).toString();
        });
    _fs.writeFileSync(distPath, out.join('\n'));
    console.log(' '+ distPath +' built.');
}

function uglifyJS(srcPath, distPath) {
    var
      jsp = _uglifyJS.parser,
      pro = _uglifyJS.uglify,
      ast = jsp.parse( _fs.readFileSync(srcPath).toString() );
 
    ast = pro.ast_mangle(ast);
    ast = pro.ast_squeeze(ast);

var header = '\
/*!\n\
 * Web Cabin Docker - Docking Layout Interface.\n\
 *\n\
 * Dependancies:\n\
 *  JQuery 1.11.1\n\
 *\n\
 * Version: git-master\n\
 *\n\
 * Author: Jeff Houde (Lochemage@gmail.com)\n\
 * Web: http://docker.webcabin.org/\n\
 *\n\
 * Licensed under\n\
 *   MIT License http://www.opensource.org/licenses/mit-license\n\
 *   GPL v3 http://opensource.org/licenses/GPL-3.0\n\
 *\n\
 */\n';

     _fs.writeFileSync(distPath, header + pro.gen_code(ast));
    console.log(' '+ distPath +' built.');
}

function uglifyCSS(srcPath, distPath) {
    var
      pro = _uglifyCSS.processString,
      ast = _fs.readFileSync(srcPath).toString();
 
    _fs.writeFileSync(distPath, pro(ast, {uglyComments:false}));
    console.log(' '+ distPath +' built.');
}



// Combine the source files
concat({
  src: [
    '../Code/docker.js',
    '../Code/ghost.js',
    '../Code/layout.js',
    '../Code/panel.js',
    '../Code/frame.js',
    '../Code/splitter.js',
    '../Code/customtabs.js',
    // '../bower_components/jQuery-contextMenu/src/jquery.contextMenu.js',
    // '../bower_components/jQuery-contextMenu/src/jquery.ui.position.js',
  ],
  dest: '../Build/wcDocker.js',
});

concat({
  src: [
    '../Code/style.css',
    // '../bower_components/jQuery-contextMenu/src/jquery.contextMenu.css',
  ],
  dest: '../Build/wcDocker.css',
});

// Move the un-minified version to the build folder.
concat({
  src: [
    '../Themes/bigRed.css',
  ],
  dest: '../Build/Themes/bigRed.css',
});
concat({
  src: [
    '../Themes/shadow.css',
  ],
  dest: '../Build/Themes/shadow.css',
});


// Now minify them. 
uglifyJS('../Build/wcDocker.js', '../Build/wcDocker.min.js');
uglifyCSS('../Build/wcDocker.css', '../Build/wcDocker.min.css');

uglifyCSS('../Themes/bigRed.css', '../Build/Themes/bigRed.min.css');
uglifyCSS('../Themes/shadow.css', '../Build/Themes/shadow.min.css');
