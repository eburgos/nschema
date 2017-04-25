(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "path"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const path = require("path");
    function execute(parentConfig, nschema) {
        var location = parentConfig.$importLocation, newConfig;
        location = path.resolve(parentConfig.$nschemaLocation || '', location);
        newConfig = require(location);
        if (!newConfig) {
            throw new Error('Invalid import location: ' + location);
        }
        return nschema.generate(parentConfig, newConfig);
    }
    let _import = {
        type: 'type',
        name: 'import',
        description: 'Reference external files in your NSchema tasks',
        init: function (nschema) {
            nschema.register('type', this);
            return Promise.resolve(null);
        },
        execute: execute
    };
    exports.default = _import;
});
//# sourceMappingURL=import.js.map