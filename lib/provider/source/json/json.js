"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getData(payload) {
    return Promise.resolve(JSON.parse(payload));
}
const source = {
    description: "Reads config data from json",
    getData,
    name: "json",
    init(nschema) {
        return nschema.registerSource(this);
    },
    type: "source"
};
exports.default = source;
//# sourceMappingURL=json.js.map