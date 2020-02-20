"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chalk = require("chalk");
const { bgYellow, red } = chalk;
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["NoOutput"] = 0] = "NoOutput";
    LogLevel[LogLevel["Default"] = 1] = "Default";
    LogLevel[LogLevel["Verbose"] = 2] = "Verbose";
    LogLevel[LogLevel["Debug"] = 3] = "Debug";
})(LogLevel = exports.LogLevel || (exports.LogLevel = {}));
function setLogLevel(level) {
    switch (level) {
        case "NoOutput":
            loggingConfig.level = LogLevel.NoOutput;
            break;
        case "Debug":
            loggingConfig.level = LogLevel.Debug;
            break;
        case "Verbose":
            loggingConfig.level = LogLevel.Verbose;
            break;
        default:
            loggingConfig.level = LogLevel.Default;
    }
}
exports.setLogLevel = setLogLevel;
const loggingConfig = {
    level: LogLevel.Default
};
function writeLog(level, msg) {
    if (level !== LogLevel.NoOutput && loggingConfig.level >= level) {
        console.log(msg);
    }
}
exports.writeLog = writeLog;
function writeDebugLog(msg) {
    return writeLog(LogLevel.Debug, `${bgYellow(red("DEBUG:"))} ${msg}`);
}
exports.writeDebugLog = writeDebugLog;
function writeError(msg) {
    console.error(msg);
}
exports.writeError = writeError;
