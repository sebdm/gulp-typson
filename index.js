var through = require('through2'),
    gutil = require('gulp-util'),
    typson = require('typson'),
    path = require('path'),
    Jsonator = require('jsonator'),
    PluginError = gutil.PluginError;

const PLUGIN_NAME = 'gulp-typson';

/**
 * Runs Typson on given typescript file sources and expands schemas through Jsonator.
 * Will read the given paths, not using passed data (due to Typson limitations).
 * @returns {*}
 */
function gulpTypson(opts) {
    opts = opts || {};
    opts.getMainType = opts.getMainType || function(filepath) {
        var mainType = path.basename(filepath, path.extname(filepath));
        if (mainType.indexOf('.') >= 0) {
            mainType = mainType.substr(0, mainType.indexOf('.'));
        }
        mainType = mainType[0].toUpperCase() + mainType.slice(1);
        //mainType = mainType + '.' + mainType;
        return mainType;
    };

    var stream = through.obj(function(file, enc, cb) {
        var self = this;
        if (file.isStream()) {
            this.emit('error', new PluginError(PLUGIN_NAME, 'Streams are not supported!'));
            return cb();
        }

        if (file.isBuffer()) {
            // replace \ with / to avoid a bug in typson
            var p = file.path.replace(/\\/g, '/');
            var mainType = opts.getMainType(file.path);
            typson.schema(p, mainType).done(function(schema) {
                schema = new Jsonator(schema).getExpandedSchema();
                delete schema.definitions;
                // avoid double-escaping
                file.contents = new Buffer(JSON.stringify(schema, null, 2).replace(/\\\\/g, '\\').replace(/\\"/g, '"'));
                file.path = gutil.replaceExtension(file.path, '.json');
                self.push(file);
                cb();
            });
        }
    });

    return stream;
};

module.exports = gulpTypson;