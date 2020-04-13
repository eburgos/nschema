"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logging_1 = require("../../../../../logging");
const model_1 = require("../../../../../model");
const utils_1 = require("../../../../../utils");
const helpers_1 = require("../../helpers");
const __1 = require("../..");
const util_1 = require("util");
const wrapDoubleQuotes = utils_1.wrap('"', '"');
const wrapDoubleQuotesEscaped = utils_1.wrap('\\"', '\\"');
function renderValidationLogicForModifiers(indent, nschemaType, thisVar, errorsIdentifier, path, nschema, currentNamespace, index) {
    if (utils_1.isUnions(nschemaType)) {
        return `    ${indent}if (!in_array(${thisVar}, array(${nschemaType.literals
            .map(wrapDoubleQuotes)
            .join(", ")}))) {
    ${indent}$${errorsIdentifier}[] = "\\"$__path/${path}\\" should be one of ${nschemaType.literals
            .map(wrapDoubleQuotesEscaped)
            .join(", ")}";
  }`;
    }
    else if (utils_1.isPrimitiveType(nschemaType)) {
        const primitiveType = typeof nschemaType === "object"
            ? nschemaType.name
            : nschemaType;
        switch (primitiveType) {
            case "bool":
                return `    ${indent}if (gettype(${thisVar}) !== "boolean") {
    ${indent}$${errorsIdentifier}[] = "\\"$__path/${path}\\" should be of type boolean";
  ${indent}}`;
            case "date":
                return `    ${indent}if (gettype(${thisVar}) !== "integer") {
    ${indent}$${errorsIdentifier}[] = "\\"$__path/${path}\\" should be of type int (unix datetime)";
  ${indent}}`;
            case "float":
                return `    ${indent}if ((gettype(${thisVar}) !== "double") && (gettype(${thisVar}) !== "integer")) {
    ${indent}$${errorsIdentifier}[] = "\\"$__path/${path}\\" should be of type float";
  ${indent}}`;
            case "string":
                return `    ${indent}if (gettype(${thisVar}) !== "string") {
    ${indent}$${errorsIdentifier}[] = "\\"$__path/${path}\\" should be of type string";
  ${indent}}`;
            case "int":
                return `    ${indent}if (gettype(${thisVar}) !== "integer") {
    ${indent}$${errorsIdentifier}[] = "\\"$__path/${path}\\" should be of type int";
  ${indent}}`;
            default:
                console.error("Should never ", nschemaType);
                model_1.shouldNever(primitiveType);
                throw new Error();
        }
    }
    else if (typeof nschemaType === "object") {
        const existingType = nschema.getObject(typeof nschemaType.namespace === "undefined"
            ? currentNamespace
            : nschemaType.namespace || "", nschemaType.name);
        if (!existingType) {
            return "";
        }
        else {
            return `      ${indent}if (gettype(${thisVar}) === "object") {
    ${indent}  $_valResult = \\${(existingType.namespace || "").replace(/\./g, "\\")}\\${existingType.name}::validate(${thisVar}, $__path . "/${name}${typeof index !== "undefined" ? `[${index}]` : ""}");
    ${indent}  if (gettype($_valResult) === "array") {
    ${indent}    foreach ($_valResult as $__err) {
    ${indent}      $${errorsIdentifier}[] = $__err;
    ${indent}    }
    ${indent}  }
    ${indent}} else {
    ${indent}  $${errorsIdentifier}[] = "\\"$__path/${name}${typeof index !== "undefined" ? `[${index}]` : ""}\\" should be an object";
    ${indent}}`;
        }
    }
    else {
        return "";
    }
}
function renderValidationLogic(nschema, currentNamespace, name, nschemaType, objIdentifier, errorsIdentifier, modifiers, path, identifier, index, nest) {
    const indent = "  ".repeat(nest);
    const thisVar = typeof identifier !== "undefined"
        ? identifier
        : `$${objIdentifier}["${name}"]`;
    if (typeof modifiers === "undefined" || !modifiers.length) {
        return renderValidationLogicForModifiers(indent, nschemaType, thisVar, errorsIdentifier, path, nschema, currentNamespace, index);
    }
    else {
        const lastModifier = modifiers[modifiers.length - 1];
        const restModifiers = modifiers.slice(0, modifiers.length - 1);
        switch (lastModifier) {
            case "option":
                return `    ${indent}if (isset(${thisVar})) {
${renderValidationLogic(nschema, currentNamespace, name, typeof nschemaType !== "string"
                    ? Object.assign(Object.assign({}, nschemaType), { modifier: restModifiers }) : nschemaType, objIdentifier, errorsIdentifier, restModifiers, path, identifier, index, nest + 1)}
    ${indent}}`;
            case "array":
            case "list":
                return `    ${indent}if (gettype(${thisVar}) === "array") {
      ${indent}$_idx = 0;
      ${indent}foreach (${thisVar} as $_obj) {
${renderValidationLogic(nschema, currentNamespace, name, typeof nschemaType !== "string"
                    ? Object.assign(Object.assign({}, nschemaType), { modifier: restModifiers }) : nschemaType, objIdentifier, errorsIdentifier, restModifiers, path, "$_obj", "$_idx", nest + 1)}
        $_idx += 1;
      }
    ${indent}} else {
      $${errorsIdentifier}[] = "\\"$__path/${path}\\" should be a list";
    ${indent}}`;
            default:
                return "";
        }
    }
}
async function baseGenerate(config, nschema, target, template, context) {
    return __1.phpGenerate(nschema, config, template, target, context);
}
function renderEnum(data) {
    return `enum ${data.name} {
${Object.keys(data.properties || {}).map((prop, cnt) => {
        if (!data.properties) {
            throw new Error(`Invalid properties`);
        }
        const property = data.properties[prop];
        const currentVal = cnt;
        return `  /*
   * ${(property.description || "").replace(/\n/g, "\n     * ")}
   */
  ${utils_1.initialCaps(prop)} = ${currentVal}`;
    }).join(`,

`)}
}

`;
}
function renderClass(data, nschema, context) {
    const objIdentifier = utils_1.findNonCollidingName("obj", [
        data.name,
        ...Object.keys(data.properties || {})
    ]);
    const errorsIdentifier = utils_1.findNonCollidingName("errors", [
        data.name,
        ...Object.keys(data.properties || {})
    ]);
    return `class ${data.name}${data.implements && data.implements.length
        ? ` /* extends ${data.implements
            .map((impl) => helpers_1.typeName(impl, nschema, data.namespace || "", data.name, context, false, true))
            .join(", ")} */`
        : ""} {
${Object.keys(data.properties || {})
        .map((prop) => {
        if (!data.properties) {
            throw new Error("Invalid argument");
        }
        const property = data.properties[prop];
        const nschemaType = property.type;
        return `  /**
   * ${(property.description || "").replace(/\n/g, "\n   * ")}
   *
   * ${prop}: ${helpers_1.typeName(nschemaType, nschema, data.namespace, data.name, context, false, true)}
   */
`;
    })
        .join("\n")}

  /*
   * Validates an object of type ${data.namespace || ""}::${data.name}
   * If there are errors then it returns an array of strings, each one is an error.
   * Returns true otherwise.
   */
  static function validate($${objIdentifier}, $__path = "") {
    $${errorsIdentifier} = array();
${Object.keys(data.properties || {})
        .reduce((acc, prop) => {
        if (!data.properties) {
            throw new Error("Invalid argument");
        }
        const property = data.properties[prop];
        const nschemaType = property.type;
        const modifiers = typeof nschemaType === "object" && nschemaType.modifier
            ? util_1.isArray(nschemaType.modifier)
                ? nschemaType.modifier
                : [nschemaType.modifier]
            : undefined;
        const validation = renderValidationLogic(nschema, data.namespace || "", prop, nschemaType, objIdentifier, errorsIdentifier, modifiers, prop, undefined, undefined, 0);
        if (validation) {
            acc.push(validation);
        }
        return acc;
    }, [])
        .join("\n")}
    if (count($${errorsIdentifier}) > 0) {
      return $${errorsIdentifier};
    }
    return true;
  }
}
`;
}
const templates = {
    object(data, nschema, context) {
        if (data.type === "message" || data.type === "service") {
            throw new Error("Invalid argument");
        }
        return `${helpers_1.renderFileHeader(data)}
${data.subType === "enumeration"
            ? renderEnum(data)
            : renderClass(data, nschema, context)}`;
    }
};
async function init(nschema) {
    await nschema.registerTarget({
        description: "Generate php models validation for your nineschema definitions",
        language: "php",
        name: "php/object",
        type: "object",
        async generate(config, thisNschema, target, context) {
            logging_1.writeDebugLog(`generating contents for ${config.namespace} - ${config.name}`);
            return baseGenerate(config, thisNschema, target, templates.object, context);
        }
    });
    return true;
}
exports.default = { init };
