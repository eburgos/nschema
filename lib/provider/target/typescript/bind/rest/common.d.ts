import { NSchemaMessageArgument, NSchemaRestOperation } from "../../../../../model";
export interface RestParam {
    name: string;
    headerName?: string;
    realType: {
        name: string;
    };
    type: {
        namespace: string;
        name: string;
    };
}
export declare function realTypeMap(p: RestParam, expr: string): string | null;
export declare function getHttpVerb(v: string): string;
export declare function getType(p: NSchemaMessageArgument): any;
export declare function includeInRoute(p: NSchemaMessageArgument, route: string): boolean;
export declare function includeInQuery(p: NSchemaMessageArgument): boolean;
export declare function includeInHeader(p: NSchemaMessageArgument): boolean;
export declare function identityStr(src: string): string;
export declare function wrap(left: string, right: string): (src: string) => string;
export declare function addSpace(str: string): string;
export declare function sortAlphabetically(arr: string[]): string[];
export declare function getOperationDetails(operation: NSchemaRestOperation): {
    bodyArguments: any[];
    headerArguments: RestParam[];
    inMessage: import("../../../../../model").NSchemaMessage;
    method: string;
    outBodyArguments: any[];
    outHeaderArguments: any[];
    outMessage: import("../../../../../model").NSchemaMessage;
    queryArguments: {
        name: any;
        realType: any;
        type: {
            name: string;
            namespace: string;
        };
    }[];
    route: string;
    routeArguments: {
        name: any;
        realType: any;
        type: {
            name: string;
            namespace: string;
        };
    }[];
};
