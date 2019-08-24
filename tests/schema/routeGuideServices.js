"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const routeGuideModel_1 = require("./routeGuideModel");
function isObjectTask(t) {
    return t.type === "object";
}
const messagesNamespace = routeGuideModel_1.default.namespace;
const Point = routeGuideModel_1.default.list.filter(isObjectTask).find(i => i.name === "Point");
const Feature = routeGuideModel_1.default.list.filter(isObjectTask).find(i => i.name === "Feature");
if (!Point) {
    throw new Error("Point message is undefined");
}
if (!Feature) {
    throw new Error("Feature message is undefined");
}
const routeGuideService = {
    type: "service",
    description: "Interface exported by the server.",
    name: "RouteGuide",
    operations: {
        GetFeature: {
            description: `A simple RPC.

Obtains the feature at a given position.

A feature with an empty name is returned if there's no feature at the given
position.`,
            inMessage: {
                data: [
                    {
                        name: "point",
                        type: {
                            name: Point.name,
                            namespace: messagesNamespace
                        }
                    }
                ]
            },
            outMessage: {
                data: [
                    {
                        name: "feature",
                        type: {
                            name: Feature.name,
                            namespace: messagesNamespace
                        }
                    }
                ]
            }
        }
    }
};
const $target = [
    {
        $namespaceMapping: {},
        language: "gRPC",
        location: `${__dirname}../../../generated/routeguide`
    }
];
const list = [routeGuideService, ...routeGuideModel_1.default.list];
const bundle = {
    $target,
    type: "bundle",
    list,
    namespace: "route_guide"
};
exports.default = bundle;
