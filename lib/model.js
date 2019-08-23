"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function shouldNever(_t, skipError) {
    if (!skipError) {
        throw new Error(`Should never ${new Error().stack}`);
    }
}
exports.shouldNever = shouldNever;
