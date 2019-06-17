import { GRPCService } from "../../lib/provider/target/gRPC/gRPC";
import model from "./routeGuideModel";

const messagesNamespace = model.namespace;
const Point = model.list.find(i => i.name === "Point");
const Feature = model.list.find(i => i.name === "Feature");

if (!Point) {
  throw new Error("Point message is undefined");
}
if (!Feature) {
  throw new Error("Feature message is undefined");
}

const routeGuideService: GRPCService = {
  $type: "service",
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
      name: "GetFeature",
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

const list = [routeGuideService, ...model.list];

export default {
  $target,
  $type: "bundle",
  list,
  location: "",
  namespace: "route_guide",
  schema: "http://io.grpc.examples.routeguide/model/"
};
