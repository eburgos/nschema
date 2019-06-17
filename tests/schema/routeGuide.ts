import services from "./routeGuideServices";

const $type = "bundle";
const location = "./generated/test1/schema";
const namespace = "route_guide";
const schema = "http://io.grpc.examples.routeguide/model/";
const $target: any[] = [];

const clean = {
  $type: "clean",
  target: [
    {
      location: `${__dirname}/../../generated/routeguide`
    }
  ]
};

const list = [clean, services];

export = { $type, location, namespace, schema, $target, list };
