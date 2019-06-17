import { isArray } from "util";
import { NSchemaRestOperation } from "../../../../../model";
import { caseInsensitiveSorter } from "../../../../../utils";
import { RestMessageArgument } from "./rest";

export function realTypeMap(p: RestMessageArgument, expr: string) {
  const realType =
    typeof p.realType === "string"
      ? { name: p.realType }
      : p.realType
      ? p.realType
      : { name: null };
  switch (realType.name) {
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

export function getType(p: RestMessageArgument) {
  return typeof p.type === "string" ? { namespace: "", name: p.type } : p.type;
}

export function includeInRoute(p: RestMessageArgument, route: string) {
  const t = getType(p);

  return (
    route.indexOf(`{${p.name}}`) >= 0 &&
    (!t.modifier || (isArray(t.modifier) && !t.modifier.length)) &&
    t.namespace === "" &&
    (t.name === "string" ||
      t.name === "int" ||
      t.name === "float" ||
      t.name === "bool" ||
      t.name === "date")
  );
}
export function includeInQuery(p: RestMessageArgument) {
  const t = getType(p);
  return (
    p.paramType === "query" &&
    (!t.modifier || (isArray(t.modifier) && !t.modifier.length)) &&
    t.namespace === "" &&
    (t.name === "string" ||
      t.name === "int" ||
      t.name === "float" ||
      t.name === "bool" ||
      t.name === "date")
  );
}
export function includeInHeader(p: RestMessageArgument) {
  return p.paramType === "header";
}

export function identityStr(src: string) {
  return src;
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

  let allParams: RestMessageArgument[] = inMessage.data.slice(0);
  const allOutParams = outMessage.data.slice(0);
  const paramsInRoute: RestMessageArgument[] = allParams
    .filter(p => includeInRoute(p, route))
    .map(p => {
      return {
        ...p,
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
  const paramsInQuery: RestMessageArgument[] = allParams
    .filter(includeInQuery)
    .map(p => {
      return {
        ...p,
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
  const paramsInHeader: RestMessageArgument[] = allParams
    .filter(includeInHeader)
    .map(p => {
      return {
        ...p,
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
