"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const chalk = require("chalk");
const fs_1 = require("fs");
const path_1 = require("path");
const util_1 = require("util");
const logging_1 = require("../../../logging");
const utils_1 = require("../../../utils");
const { blue, green, yellow } = chalk;
const fsharp = {
    generate(nschema, nsconfig, template, target) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const config = utils_1.deepClone(nsconfig);
            const result = template(config, nschema, {}, target);
            const location = target.location;
            const filepath = location.indexOf(".") === 0
                ? path_1.resolve(process.cwd(), location, config.namespace || "", target.$fileName || `${config.name}.fs`)
                : path_1.resolve(location, config.namespace || "", config.$fileName || `${config.name}.fs`);
            logging_1.writeLog(logging_1.LogLevel.Default, `${yellow("fsharp")}: ${blue("writing")} to file: ${green(filepath)}`);
            return nschema.writeFile(filepath, result).then(null, err => {
                logging_1.writeError("error: ");
                logging_1.writeError(JSON.stringify(err, null, 2));
            });
        });
    },
    init(nschema) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const providerPath = path_1.resolve(__dirname, "bind");
            return Promise.all(fs_1.readdirSync(providerPath)
                .filter(item => {
                return fs_1.statSync(path_1.resolve(providerPath, item)).isDirectory();
            })
                .map(d => {
                return fs_1.readdirSync(path_1.resolve(providerPath, d)).map(i => {
                    return path_1.resolve(providerPath, d, i);
                });
            })
                .reduce((a, b) => {
                return a.concat(b);
            })
                .filter(item => {
                return path_1.extname(item) === ".js" && fs_1.existsSync(item);
            })
                .map(require)
                .map((m) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                if (m.default) {
                    m = m.default;
                }
                return new Promise((resolve, reject) => {
                    if (typeof m.init === "function") {
                        m.init(nschema).then(() => {
                            resolve(true);
                        }, (err) => {
                            reject(err);
                        });
                    }
                    else {
                        resolve(true);
                    }
                });
            }))).then(undefined, err => {
                throw err;
            });
        });
    },
    typeName($nschemaType, $nschema, namespace) {
        let result;
        const typeMap = (t) => {
            switch (t) {
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
            let ns = $nschemaType.namespace;
            if (typeof ns === "undefined") {
                ns = namespace || "";
            }
            result = `${ns}.${$nschemaType.name}`;
        }
        else {
            result = typeMap("string");
        }
        if ($nschemaType.modifier) {
            const $modifier = $nschemaType.modifier;
            const modifierArr = !$nschema.isArray($modifier)
                ? [$modifier]
                : $modifier;
            modifierArr.forEach(item => {
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
function $_typeMap(t) {
    switch (t) {
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
function $_modifierMap(t, r) {
    switch (t) {
        case "list":
            return "[]";
        case "array":
            return "[||]";
        case "option":
            return "None";
        case "System.Nullable":
            return `(new (${r})())`;
    }
    return "null";
}
function $_isString($property) {
    if ($property.type === "string") {
        return true;
    }
    else if (typeof $property.type === "object") {
        if ($property.type.namespace === "" &&
            $property.type.name === "string" &&
            !$property.type.modifier) {
            return true;
        }
    }
    return false;
}
function typeDefaultValue($nschemaType, $property, $fsharp, $nschema, namespace) {
    let $_result;
    if (typeof $property !== "undefined" &&
        typeof $property.defaultValue !== "undefined") {
        $_result = $property.defaultValue;
        if ($_isString($property)) {
            $_result = `"${$_result}"`;
        }
    }
    else if (typeof $property !== "undefined" && $property.init) {
        $_result = `(new (${$fsharp.typeName($nschemaType, $nschema, namespace)})())`;
    }
    else if (typeof $nschemaType === "string") {
        $_result = $_typeMap($nschemaType);
    }
    else if (typeof $nschemaType === "object") {
        if ($nschemaType.modifier) {
            const $modifier = $nschemaType.modifier;
            if (typeof $modifier === "string") {
                $_result = $_modifierMap($modifier, $fsharp.typeName($nschemaType, $nschema, namespace));
            }
            else {
                const $mods = util_1.isArray($modifier) ? $modifier : [$modifier];
                const mod = $mods[$mods.length - 1];
                $_result = $_modifierMap(typeof mod === "string"
                    ? mod
                    : fsharp.typeName(mod, $nschema, namespace), $fsharp.typeName($nschemaType, $nschema, namespace));
            }
        }
        else {
            $_result = `Unchecked.defaultof<${$fsharp.typeName($nschemaType, $nschema, namespace)}>`;
        }
    }
    else {
        $_result = $_typeMap("string");
    }
    return ``;
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
