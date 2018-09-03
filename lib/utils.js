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
//# sourceMappingURL=utils.js.map