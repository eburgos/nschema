"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function caseInsensitiveSorter(mapper) {
    return (a, b) => mapper(a)
        .toLowerCase()
        .localeCompare(mapper(b).toLowerCase());
}
exports.caseInsensitiveSorter = caseInsensitiveSorter;
function isRelativePath(p) {
    return p[0] === "." || p[0] === "/";
}
exports.isRelativePath = isRelativePath;
function wrap(left, right) {
    return (src) => {
        return `${left}${src}${right}`;
    };
}
exports.wrap = wrap;
function clone(obj) {
    if (null == obj || "object" !== typeof obj) {
        return obj;
    }
    const copy = {};
    for (const attr in obj) {
        if (obj.hasOwnProperty(attr)) {
            copy[attr] = obj[attr];
        }
    }
    return copy;
}
exports.clone = clone;
//# sourceMappingURL=utils.js.map