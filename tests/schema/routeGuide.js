"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const routeGuideServices_1 = require("./routeGuideServices");
const type = "bundle";
const namespace = "route_guide";
const $target = [];
const clean = {
    target: [
        {
            location: `${__dirname}/../../generated/routeguide`
        }
    ],
    type: "clean"
};
const list = [clean, routeGuideServices_1.default];
const bundle = {
    $target,
    list,
    namespace,
    type
};
exports.default = bundle;
