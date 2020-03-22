"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function shouldNever(_, skipError) {
    if (!skipError) {
        throw new Error(`Should never ${new Error().stack}`);
    }
}
exports.shouldNever = shouldNever;
