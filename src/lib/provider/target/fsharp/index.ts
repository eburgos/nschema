/**
 * @module nschema/provider/target/javascript/javascript
 * @author Eduardo Burgos <eburgos@gmail.com>
 */
import * as chalk from "chalk";
import { existsSync, readdirSync, statSync } from "fs";
import { extname, resolve as pathResolve } from "path";
import { isArray } from "util";
import { LogLevel, writeError, writeLog } from "../../../logging";
import {
  NSchemaInterface,
  NSchemaType,
  Target,
  TemplateFunction
} from "../../../model";
import { deepClone } from "../../../utils";
import { MessageTask } from "../../type/message";
import { ServiceTask } from "../../type/service";
import { FSharpObject, FSharpProperty } from "./bind/object";

const { blue, green, yellow } = chalk;

declare let require: (name: string) => any;

export interface FSharp {
  generate(
    nschema: NSchemaInterface,
    config: FSharpObject | MessageTask | ServiceTask,
    template: TemplateFunction<FSharpObject | ServiceTask | MessageTask>,
    target: Target
  ): Promise<any>;
  init(nschema: NSchemaInterface): Promise<any>;
  typeName(
    $nschemaType: NSchemaType,
    $nschema: NSchemaInterface,
    namespace: string
  ): string;
}

//TODO: Do we need a FSharpContext?

const fsharp: FSharp = {
  async generate(
    nschema: NSchemaInterface,
    nsconfig: FSharpObject | MessageTask | ServiceTask,
    template: TemplateFunction<FSharpObject | ServiceTask | MessageTask>,
    target: Target
  ) {
    const config = deepClone(nsconfig);
    const result = template(config, nschema, {}, target);
    const location = target.location;
    const filepath =
      location.indexOf(".") === 0
        ? pathResolve(
            process.cwd(),
            location,
            config.namespace || "",
            target.$fileName || `${config.name}.fs`
          )
        : pathResolve(
            location,
            config.namespace || "",
            config.$fileName || `${config.name}.fs`
          );

    writeLog(
      LogLevel.Default,
      `${yellow("fsharp")}: ${blue("writing")} to file: ${green(filepath)}`
    );
    return nschema.writeFile(filepath, result).then(null, (err) => {
      writeError("error: ");
      writeError(JSON.stringify(err, null, 2));
    });
  },
  async init(nschema: NSchemaInterface) {
    const providerPath = pathResolve(__dirname, "bind");
    await Promise.all(
      readdirSync(providerPath)
        .filter((item) => {
          return statSync(pathResolve(providerPath, item)).isDirectory();
        })
        .map((directoryPath) => {
          return readdirSync(pathResolve(providerPath, directoryPath)).map(
            (item) => {
              return pathResolve(providerPath, directoryPath, item);
            }
          );
        })
        .reduce((accumulated, next) => {
          return accumulated.concat(next);
        })
        .filter((item) => {
          return extname(item) === ".js" && existsSync(item);
        })
        .map(require)
        .map(async (requiredModule) => {
          if (requiredModule.default) {
            requiredModule = requiredModule.default;
          }

          if (typeof requiredModule.init === "function") {
            await requiredModule.init(nschema);
          }

          return true;
        })
    );
  },

  typeName(
    $nschemaType: any,
    $nschema: NSchemaInterface /*, namespace: string*/
  ) {
    let result: string;
    const typeMap = (primitiveType: string) => {
      switch (primitiveType) {
        case "int":
          return "int";
        case "float":
          return "float";
        case "string":
          return "string";
      }
      return "string";
    };
    if (typeof $nschemaType === "string") {
      result = typeMap($nschemaType);
    } else if (typeof $nschemaType === "object") {
      let namespace = $nschemaType.namespace;
      if (typeof namespace === "undefined") {
        namespace = namespace || "";
      }
      result = `${namespace}.${$nschemaType.name}`;
    } else {
      result = typeMap("string");
    }
    if ($nschemaType.modifier) {
      const $modifier = $nschemaType.modifier;
      const modifierArr: string[] = !$nschema.isArray($modifier)
        ? [$modifier]
        : $modifier;

      modifierArr.forEach((item) => {
        result += ` ${item}`;
      });
    }
    return result;
  }
};

export default fsharp;

export function classHeader(data: FSharpObject) {
  if (data.append) {
    return "";
  }
  return `namespace ${data.namespace}

    open Newtonsoft.Json
    open Newtonsoft.Json.Converters
    open System.Runtime.Serialization
`;
}

function defaultValueType(type: string) {
  switch (type) {
    case "int":
      return "0";
    case "long":
      return "0L";
    case "float":
      return "0.0";
    case "bool":
      return "false";
    case "string":
      return "null";
    case "date":
      return "global.System.DateTime.Now";
  }
  return "null";
}

function modifierDefaultValue(type: string, customTypeName: string) {
  switch (type) {
    case "list":
      return "[]";
    case "array":
      return "[||]";
    case "option":
      return "None";
    case "System.Nullable":
      return `(new (${customTypeName})())`;
  }
  return "null";
}

function propertyIsStringType(property: FSharpProperty) {
  if (property.type === "string") {
    return true;
  } else if (typeof property.type === "object") {
    if (
      property.type.namespace === "" &&
      property.type.name === "string" &&
      !property.type.modifier
    ) {
      return true;
    }
  }
  return false;
}

export function typeDefaultValue(
  $nschemaType: NSchemaType,
  $property: FSharpProperty,
  $fsharp: FSharp,
  $nschema: NSchemaInterface,
  namespace: string
) {
  let result: string;

  if (
    typeof $property !== "undefined" &&
    typeof $property.defaultValue !== "undefined"
  ) {
    result = $property.defaultValue;
    if (propertyIsStringType($property)) {
      result = `"${result}"`;
    }
  } else if (typeof $property !== "undefined" && $property.init) {
    result = `(new (${$fsharp.typeName($nschemaType, $nschema, namespace)})())`;
  } else if (typeof $nschemaType === "string") {
    result = defaultValueType($nschemaType);
  } else if (typeof $nschemaType === "object") {
    if ($nschemaType.modifier) {
      const $modifier = $nschemaType.modifier;
      if (typeof $modifier === "string") {
        result = modifierDefaultValue(
          $modifier,
          $fsharp.typeName($nschemaType, $nschema, namespace)
        );
      } else {
        const $mods = isArray($modifier) ? $modifier : [$modifier];
        const mod = $mods[$mods.length - 1];

        result = modifierDefaultValue(
          typeof mod === "string"
            ? mod
            : fsharp.typeName(mod, $nschema, namespace),
          $fsharp.typeName($nschemaType, $nschema, namespace)
        );
      }
    } else {
      result = `Unchecked.defaultof<${$fsharp.typeName(
        $nschemaType,
        $nschema,
        namespace
      )}>`;
    }
  } else {
    result = defaultValueType("string");
  }
  return result;
}

export function messageType() {
  return `<%
  if (!$nschemaMessage) {
      throw new Error('$nschemaMessage context variable must be present. If you referenced this inside a loop make sure that variable is set.');
  }
  if (!$nschemaMessageDirection) {
      throw new Error('$nschemaMessageDirection context variable must be present. If you referenced this inside a loop make sure that variable is set.');
  }
  (function () {
      var $_typeSeparator,
          $_result,
          $_typeMap = function (t) {
              switch (t) {
                  case 'int': return 'int';
                  case 'float': return 'float';
                  case 'string': return 'string';
              }
              return 'string';
          };
      if ($nschemaMessageDirection === 'in') {
          $_typeSeparator = ' -> ';
      }
      else if ($nschemaMessageDirection === 'out') {
          $_typeSeparator = ' * ';
      }
      function $_getDataItems (nsMessage) {
          var r = [],
              parent;
          if (nsMessage.$inherits) {
              parent = $nschema.getMessage(nsMessage.$inherits.namespace || '', nsMessage.$inherits.name);
              if (parent) {
                  $_getDataItems(parent).forEach(function (i) {
                      r.push(i);
                  });
              }
              else {
                  console.log('could not find parent: ns=' + (nsMessage.$inherits.namespace || '') + ' name=' + nsMessage.$inherits.name);
              }
          }
          (nsMessage.data || []).map(function (item) {
              r.push(item);
          });
          return r;
      }
      $_result = $_getDataItems($nschemaMessage).map(function (item) {
          var $_type = $nschema.getObject(item.namespace || '', item.name);
          return $fsharp.typeName(item.type, $nschema);
      });
      if ($_result.length > 1) {
          $_result = $_result.map(function (r) { return '( ' + r + ' )'; });
      }
      $_result = $_result.join($_typeSeparator) || '(unit)';
%><%- $_result %><% })(); %>`;
}
