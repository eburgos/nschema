import { CleanTask } from "../../lib/nschema";
import { GRPCBundle } from "../../lib/provider/target/gRPC";
import services from "./routeGuideServices";

const $type = "bundle";
const namespace = "route_guide";
//const schema = "http://io.grpc.examples.routeguide/model/";
const $target: any[] = [];

const clean: CleanTask = {
  $type: "clean",
  target: [
    {
      location: `${__dirname}/../../generated/routeguide`
    }
  ]
};

const list = [clean, services];

const bundle: GRPCBundle = {
  $target,
  $type,
  list,
  namespace
};

export default bundle;
