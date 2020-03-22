"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
async function getData(payload) {
    return await Promise.resolve(JSON.parse(payload));
}
const source = {
    description: "Reads config data from json",
    getData,
    name: "json",
    async init(nschema) {
        return nschema.registerSource(this);
    },
    type: "source",
};
exports.default = source;
