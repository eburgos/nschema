import {
  NSchemaMessageArgument,
  NSchemaRestOperation
} from "../../../../../model";
import { caseInsensitiveSorter } from "../../../../../utils";

export interface RestParam {
  name: string;
  headerName?: string;
  realType: { name: string };
  type: {
    namespace: string;
    name: string;
  };
}

export function realTypeMap(p: RestParam, expr: string) {
  switch ((p.realType || { name: undefined }).name) {
    case "string":
      return expr;
    case "int":
    case "float":
      return `Number(${expr})`;
    case "bool":
      return `(${expr} === "true")`;
    case "date":
      return `(new Date(${expr}))`;
    default:
      return null;
  }
}
export function getHttpVerb(v: string) {
  if (v === "delete") {
    return "del";
  }
  return v;
}

export function getType(p: NSchemaMessageArgument) {
  return typeof p.type === "string" ? { namespace: "", name: p.type } : p.type;
}

export function includeInRoute(p: NSchemaMessageArgument, route: string) {
  const t = getType(p);
  return (
    route.indexOf(`{${p.name}}`) >= 0 &&
    (!p.modifier || !p.modifier.length) &&
    t.namespace === "" &&
    (t.name === "string" ||
      t.name === "int" ||
      t.name === "float" ||
      t.name === "bool" ||
      t.name === "date")
  );
}
export function includeInQuery(p: NSchemaMessageArgument) {
  const t = getType(p);
  return (
    p.paramType === "query" &&
    (!p.modifier || !p.modifier.length) &&
    t.namespace === "" &&
    (t.name === "string" ||
      t.name === "int" ||
      t.name === "float" ||
      t.name === "bool" ||
      t.name === "date")
  );
}
export function includeInHeader(p: NSchemaMessageArgument) {
  const t = getType(p);
  return p.paramType === "header";
}

export function identityStr(src: string) {
  return src;
}

export function wrap(left: string, right: string) {
  return (src: string) => {
    return `${left}${src}${right}`;
  };
}

export function addSpace(str: string) {
  if (str) {
    return ` ${str}`;
  }
  return "";
}

const alphabeticSorter = caseInsensitiveSorter(identityStr);
export function sortAlphabetically(arr: string[]) {
  const r = [...arr];
  r.sort(alphabeticSorter);
  return r;
}

export function getOperationDetails(operation: NSchemaRestOperation) {
  const inMessage = operation.inMessage;
  const outMessage = operation.outMessage;

  const route = operation.route || operation.name;
  const method = (operation.method || "get").toLowerCase();

  let allParams = inMessage.data.slice(0);
  const allOutParams = outMessage.data.slice(0);
  const paramsInRoute = allParams
    .filter(p => includeInRoute(p, route))
    .map(p => {
      return {
        name: p.name,
        realType: getType(p),
        type: {
          name: "string",
          namespace: ""
        }
      };
    });
  allParams = allParams.filter(p => {
    return !includeInRoute(p, route);
  });
  const paramsInQuery = allParams.filter(includeInQuery).map(p => {
    return {
      name: p.name,
      realType: getType(p),
      type: {
        name: "string",
        namespace: ""
      }
    };
  });
  allParams = allParams.filter(p => {
    return !includeInQuery(p);
  });
  const paramsInHeader: RestParam[] = allParams
    .filter(includeInHeader)
    .map(p => {
      return {
        headerName: p.headerName,
        name: p.name,
        realType: getType(p),
        type: {
          name: "string",
          namespace: ""
        }
      };
    });
  allParams = allParams.filter(p => {
    return !includeInHeader(p);
  });
  const paramsInBody = allParams.filter(p => {
    return !includeInRoute(p, route);
  });
  const paramsOutHeader = outMessage.data.slice(0).filter(includeInHeader);
  const paramsOutBody = allOutParams.filter(p => {
    return !includeInHeader(p);
  });

  return {
    bodyArguments: paramsInBody,
    headerArguments: paramsInHeader,
    inMessage,
    method,
    outBodyArguments: paramsOutBody,
    outHeaderArguments: paramsOutHeader,
    outMessage,
    queryArguments: paramsInQuery,
    route,
    routeArguments: paramsInRoute
  };
}
