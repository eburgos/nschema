"use strict";
const routeGuideServices_1 = require("./routeGuideServices");
const $type = "bundle";
const location = "./generated/test1/schema";
const namespace = "route_guide";
const schema = "http://io.grpc.examples.routeguide/model/";
const $target = [];
const clean = {
    $type: "clean",
    target: [
        {
            location: `${__dirname}/../../generated/routeguide`
        }
    ]
};
const list = [clean, routeGuideServices_1.default];
module.exports = { $type, location, namespace, schema, $target, list };
//# sourceMappingURL=routeGuide.js.map