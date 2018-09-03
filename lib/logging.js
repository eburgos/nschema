"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["NoOutput"] = 0] = "NoOutput";
    LogLevel[LogLevel["Default"] = 1] = "Default";
    LogLevel[LogLevel["Verbose"] = 2] = "Verbose";
    LogLevel[LogLevel["Debug"] = 3] = "Debug";
})(LogLevel = exports.LogLevel || (exports.LogLevel = {}));
exports.loggingConfig = {
    level: LogLevel.Default
};
function writeLog(level, msg) {
    if (exports.loggingConfig.level >= level) {
        console.log(msg);
    }
}
exports.writeLog = writeLog;
function writeError(msg) {
    console.error(msg);
}
exports.writeError = writeError;
//# sourceMappingURL=logging.js.map