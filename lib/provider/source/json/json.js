(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function getData(payload) {
        return Promise.resolve(JSON.parse(payload));
    }
    let source = {
        type: 'source',
        name: 'json',
        description: 'Reads config data from json',
        init: function (nschema) {
            return nschema.registerSource(this);
        },
        getData: getData
    };
    exports.default = source;
});
//# sourceMappingURL=json.js.map