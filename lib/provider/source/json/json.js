"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
function getData(payload) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        return yield Promise.resolve(JSON.parse(payload));
    });
}
const source = {
    description: "Reads config data from json",
    getData,
    name: "json",
    init(nschema) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            return nschema.registerSource(this);
        });
    },
    type: "source"
};
exports.default = source;
