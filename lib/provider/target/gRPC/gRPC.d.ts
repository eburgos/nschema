import { Definition, NineSchemaConfig, NSchemaInterface, NSchemaMessage, NSchemaMessageArgument, NSchemaType, Target, TemplateFunction, NSchemaService, NSchemaOperation, NSchemaObject } from "../../../model";
export interface GRPCOperation extends NSchemaOperation {
}
export interface GRPCService extends NSchemaService {
    $type: "service";
    operations: {
        [name: string]: GRPCOperation;
    };
}
export interface GRPCMessage extends NSchemaMessage {
    data: GRPCMessageArgument[];
}
export interface GRPCObject extends NSchemaObject {
}
export interface GRPCMessageArgument extends NSchemaMessageArgument {
}
export interface gRPCContext {
    id: number;
    imports: {
        [name: string]: {
            [name: string]: string | boolean;
        };
    };
    grpc: gRPC;
    skipWrite?: boolean;
}
export declare class gRPC {
    init(nschema: NSchemaInterface): Promise<any>;
    generate(nschema: NSchemaInterface, $nsconfig: NineSchemaConfig, template: TemplateFunction, target: Target, providedContext: any | undefined): Promise<{
        config: Definition;
        context: gRPCContext;
        generated: string;
    }>;
}
declare const grpc: gRPC;
export declare function messageType(nschema: NSchemaInterface, $context: gRPCContext, addFlowComment: boolean, message: NSchemaMessage): string;
export declare function buildgRPCContext(): gRPCContext;
export default grpc;
export declare function typeName($nschemaType: NSchemaType, _nschema?: NSchemaInterface, namespace?: string, _name?: string, context?: any, addFlowComment?: boolean): string;
