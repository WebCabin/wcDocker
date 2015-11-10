define([
    'intern!tdd',
    'intern/chai!assert',


    'wcDocker/docker'

], function (test, assert) {

    test.suite('Basics', function () {

        test.test('Core', function () {
            assert.equal(2, 2, 'result is not 2');
        });
    });
});
