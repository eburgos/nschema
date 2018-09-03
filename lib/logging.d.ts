export declare enum LogLevel {
    NoOutput = 0,
    Default = 1,
    Verbose = 2,
    Debug = 3
}
export declare const loggingConfig: {
    level: LogLevel;
};
export declare function writeLog(level: LogLevel, msg: string): void;
export declare function writeError(msg: any): void;
