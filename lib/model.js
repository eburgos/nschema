"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldNever = void 0;
function shouldNever(_, skipError) {
    if (!skipError) {
        throw new Error(`Should never ${new Error().stack}`);
    }
}
exports.shouldNever = shouldNever;
