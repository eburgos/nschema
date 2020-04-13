import { isArray } from "util";
import {
  NSchemaRestOperation,
  RestMessageArgument
} from "../../../../../model";
import {
  caseInsensitiveSorter,
  isPrimitiveTypeString
} from "../../../../../utils";
import { TypeScriptContext, enableImport } from "../..";

export function realTypeMap(
  context: TypeScriptContext,
  argument: RestMessageArgument,
  expr: string
) {
  const realType =
    typeof argument.realType === "string"
      ? { name: argument.realType }
      : argument.realType
      ? argument.realType
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
      return `(Number.isNaN(Number.parseFloat(${expr})) ? new Date(${expr}) : new Date(Number.parseFloat(${expr})))`;
    default:
      enableImport(context, "qs");
      return `qs.parse(${expr})`;
  }
}
export function getHttpVerb(verb: string) {
  if (verb === "delete") {
    return "del";
  }
  return verb;
}

export function getType(argument: RestMessageArgument) {
  return typeof argument.type === "string"
    ? { namespace: "", name: argument.type }
    : argument.type;
}

export function includeInRoute(argument: RestMessageArgument, route: string) {
  const type = getType(argument);

  const isInRoute = route.indexOf(`{${argument.name}}`) >= 0;

  return (
    isInRoute &&
    (!type.modifier || (isArray(type.modifier) && !type.modifier.length)) &&
    type.namespace === "" &&
    isPrimitiveTypeString(type.name)
  );
}
export function includeInQuery(argument: RestMessageArgument) {
  return argument.paramType === "query";
}
export function includeInHeader(argument: RestMessageArgument) {
  return argument.paramType === "header";
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
  const clonedArray = [...arr];
  clonedArray.sort(alphabeticSorter);
  return clonedArray;
}

export function getOperationDetails(
  operation: NSchemaRestOperation,
  name: string
) {
  const inMessage = operation.inMessage;
  const outMessage = operation.outMessage;

  const route = operation.route || name;
  const method = (operation.method || "get").toLowerCase();

  let allParams: RestMessageArgument[] = (inMessage.data || []).slice(0);
  const allOutParams = (outMessage.data || []).slice(0);
  const paramsInRoute: RestMessageArgument[] = allParams
    .filter((argument) => includeInRoute(argument, route))
    .map((argument) => {
      return {
        ...argument,
        realType: getType(argument),
        type: {
          name: "string",
          namespace: ""
        }
      };
    });
  allParams = allParams.filter((argument) => {
    return !includeInRoute(argument, route);
  });
  const paramsInQuery: RestMessageArgument[] = allParams
    .filter(includeInQuery)
    .map((argument) => {
      return {
        ...argument,
        realType: getType(argument),
        type: {
          name: "string",
          namespace: ""
        }
      };
    });
  allParams = allParams.filter((argument) => {
    return !includeInQuery(argument);
  });
  const paramsInHeader: RestMessageArgument[] = allParams
    .filter(includeInHeader)
    .map((argument) => {
      return {
        ...argument,
        realType: getType(argument),
        type: {
          name: "string",
          namespace: ""
        }
      };
    });
  allParams = allParams.filter((argument) => {
    return !includeInHeader(argument);
  });
  const paramsInBody = allParams.filter((argument) => {
    return !includeInRoute(argument, route);
  });
  const paramsOutHeader = (outMessage.data || [])
    .slice(0)
    .filter(includeInHeader);
  const paramsOutBody = allOutParams.filter((argument) => {
    return !includeInHeader(argument);
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
