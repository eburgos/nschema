declare const _default: {
    $type: string;
    location: string;
    namespace: string;
    schema: string;
    $target: any[];
    list: ({
        $type: string;
        target: {
            location: string;
        }[];
    } | {
        $target: {
            $namespaceMapping: {};
            language: string;
            location: string;
        }[];
        $type: string;
        list: (import("../../lib/provider/target/gRPC/gRPC").GRPCService | import("../../lib/provider/target/gRPC/gRPC").GRPCObject)[];
        location: string;
        namespace: string;
        schema: string;
    })[];
};
export = _default;
