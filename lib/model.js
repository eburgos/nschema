"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function shouldNever(_t) {
    throw new Error(`Should never ${new Error().stack}`);
}
exports.shouldNever = shouldNever;
