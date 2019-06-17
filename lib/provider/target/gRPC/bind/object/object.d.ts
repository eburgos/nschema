import { NSchemaInterface } from "../../../../../model";
import { gRPC } from "../../gRPC";
export declare class NObject {
    grpc: gRPC | undefined;
    init(nschema: NSchemaInterface): Promise<boolean>;
}
declare const obj: NObject;
export default obj;
