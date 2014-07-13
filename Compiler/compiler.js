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
 
    _fs.writeFileSync(distPath, pro.gen_code(ast));
    console.log(' '+ distPath +' built.');
}

function uglifyCSS(srcPath, distPath) {
    var
      pro = _uglifyCSS.processString,
      ast = _fs.readFileSync(srcPath).toString();
 
    _fs.writeFileSync(distPath, pro(ast, {uglyComments:true}));
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
    '../Code/ext/jquery.contextMenu.js',
    '../Code/ext/jquery.ui.position.js',
  ],
  dest: '../Build/wcDocker.js',
});

concat({
  src: [
    '../Code/style.css',
    '../Code/ext/jquery.contextMenu.css',
  ],
  dest: '../Build/wcDocker.css',
});


// Now minify them. 
uglifyJS('../Build/wcDocker.js', '../Build/wcDocker.min.js');
uglifyCSS('../Build/wcDocker.css', '../Build/wcDocker.min.css');
