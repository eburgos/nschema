"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chalk = require("chalk");
const fs_1 = require("fs");
const path_1 = require("path");
const util_1 = require("util");
const logging_1 = require("../../../logging");
const utils_1 = require("../../../utils");
const { blue, green, yellow } = chalk;
const fsharp = {
    async generate(nschema, nsconfig, template, target) {
        const config = utils_1.deepClone(nsconfig);
        const result = template(config, nschema, {}, target);
        const location = target.location;
        const filepath = location.indexOf(".") === 0
            ? path_1.resolve(process.cwd(), location, config.namespace || "", target.$fileName || `${config.name}.fs`)
            : path_1.resolve(location, config.namespace || "", config.$fileName || `${config.name}.fs`);
        logging_1.writeLog(logging_1.LogLevel.Default, `${yellow("fsharp")}: ${blue("writing")} to file: ${green(filepath)}`);
        return nschema.writeFile(filepath, result).then(null, (err) => {
            logging_1.writeError("error: ");
            logging_1.writeError(JSON.stringify(err, null, 2));
        });
    },
    async init(nschema) {
        const providerPath = path_1.resolve(__dirname, "bind");
        await Promise.all(fs_1.readdirSync(providerPath)
            .filter((item) => {
            return fs_1.statSync(path_1.resolve(providerPath, item)).isDirectory();
        })
            .map((directoryPath) => {
            return fs_1.readdirSync(path_1.resolve(providerPath, directoryPath)).map((item) => {
                return path_1.resolve(providerPath, directoryPath, item);
            });
        })
            .reduce((accumulated, next) => {
            return accumulated.concat(next);
        })
            .filter((item) => {
            return path_1.extname(item) === ".js" && fs_1.existsSync(item);
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
        }));
    },
    typeName($nschemaType, $nschema) {
        let result;
        const typeMap = (primitiveType) => {
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
        }
        else if (typeof $nschemaType === "object") {
            let namespace = $nschemaType.namespace;
            if (typeof namespace === "undefined") {
                namespace = namespace || "";
            }
            result = `${namespace}.${$nschemaType.name}`;
        }
        else {
            result = typeMap("string");
        }
        if ($nschemaType.modifier) {
            const $modifier = $nschemaType.modifier;
            const modifierArr = !$nschema.isArray($modifier)
                ? [$modifier]
                : $modifier;
            modifierArr.forEach((item) => {
                result += ` ${item}`;
            });
        }
        return result;
    }
};
exports.default = fsharp;
function classHeader(data) {
    if (data.append) {
        return "";
    }
    return `namespace ${data.namespace}

    open Newtonsoft.Json
    open Newtonsoft.Json.Converters
    open System.Runtime.Serialization
`;
}
exports.classHeader = classHeader;
function defaultValueType(type) {
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
function modifierDefaultValue(type, customTypeName) {
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
function propertyIsStringType(property) {
    if (property.type === "string") {
        return true;
    }
    else if (typeof property.type === "object") {
        if (property.type.namespace === "" &&
            property.type.name === "string" &&
            !property.type.modifier) {
            return true;
        }
    }
    return false;
}
function typeDefaultValue($nschemaType, $property, $fsharp, $nschema, namespace) {
    let result;
    if (typeof $property !== "undefined" &&
        typeof $property.defaultValue !== "undefined") {
        result = $property.defaultValue;
        if (propertyIsStringType($property)) {
            result = `"${result}"`;
        }
    }
    else if (typeof $property !== "undefined" && $property.init) {
        result = `(new (${$fsharp.typeName($nschemaType, $nschema, namespace)})())`;
    }
    else if (typeof $nschemaType === "string") {
        result = defaultValueType($nschemaType);
    }
    else if (typeof $nschemaType === "object") {
        if ($nschemaType.modifier) {
            const $modifier = $nschemaType.modifier;
            if (typeof $modifier === "string") {
                result = modifierDefaultValue($modifier, $fsharp.typeName($nschemaType, $nschema, namespace));
            }
            else {
                const $mods = util_1.isArray($modifier) ? $modifier : [$modifier];
                const mod = $mods[$mods.length - 1];
                result = modifierDefaultValue(typeof mod === "string"
                    ? mod
                    : fsharp.typeName(mod, $nschema, namespace), $fsharp.typeName($nschemaType, $nschema, namespace));
            }
        }
        else {
            result = `Unchecked.defaultof<${$fsharp.typeName($nschemaType, $nschema, namespace)}>`;
        }
    }
    else {
        result = defaultValueType("string");
    }
    return result;
}
exports.typeDefaultValue = typeDefaultValue;
function messageType() {
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
exports.messageType = messageType;
