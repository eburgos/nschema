"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const routeGuideModel_1 = require("./routeGuideModel");
function isObjectTask(task) {
    return task.type === "object";
}
const messagesNamespace = routeGuideModel_1.default.namespace;
const Point = routeGuideModel_1.default.list
    .filter(isObjectTask)
    .find((models) => models.name === "Point");
const Feature = routeGuideModel_1.default.list
    .filter(isObjectTask)
    .find((models) => models.name === "Feature");
if (!Point) {
    throw new Error("Point message is undefined");
}
if (!Feature) {
    throw new Error("Feature message is undefined");
}
const routeGuideService = {
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
    },
    type: "service"
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
    list,
    namespace: "route_guide",
    type: "bundle"
};
exports.default = bundle;
