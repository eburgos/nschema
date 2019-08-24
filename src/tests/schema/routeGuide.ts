import { CleanTask } from "../../lib/nschema";
import { GRPCBundle } from "../../lib/provider/target/gRPC";
import services from "./routeGuideServices";

const type = "bundle";
const namespace = "route_guide";
//const schema = "http://io.grpc.examples.routeguide/model/";
const $target: any[] = [];

const clean: CleanTask = {
  target: [
    {
      location: `${__dirname}/../../generated/routeguide`
    }
  ],
  type: "clean"
};

const list = [clean, services];

const bundle: GRPCBundle = {
  $target,
  list,
  namespace,
  type
};

export default bundle;
