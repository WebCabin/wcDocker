require.config({
    baseUrl: "./bower_components",
    packages: [
        {
            name: 'dcl',
            location: './dcl'   //points to bower_components/dcl
        },
        {
            name: 'wcDocker',
            location: '../Code'
        }
    ]
});

require.config({
    config: {}
});

//require docker
require([
    "wcDocker/docker",
    "wcDocker/tabframe",
    "wcDocker/iframe"
], function (docker,tabframe,iframe) {

    //export
    window['wcDocker'] = docker;
    window['wcTabFrame'] = tabframe;
    window['wcIFrame'] = iframe;
    console.log('exported wcDocker');
});