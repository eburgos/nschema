module Test

open System
open Newtonsoft.Json
open Newtonsoft.Json.Converters

[<EntryPoint>]
let main args = 
    let stroriginal = "[1, { edad: 12 \r\n}, \"casa\"\n\r,\nfalse\n, \n{nombre:\n \"Amanda\"},\r undefined,\n 2.5446, [1\r\n, { edad: 12 }, \"casa\"\n,false, {nombre: \"Amanda\"}, undefined, 2]]"
    let str = stroriginal.Replace("\r\n", "").Replace("\n", "").Replace("\r", "")
    
    use textReader = new System.IO.StringReader (str)
    let reader = new JsonTextReader (textReader)

    let rec tokenSplit (reader: JsonTextReader) acc startLine startIdx: string list =
        reader.Read() |> ignore
        match reader.Depth, reader.TokenType with
        | _, JsonToken.None ->
            acc
        | 0, JsonToken.StartArray ->
            tokenSplit reader acc reader.LineNumber reader.LinePosition
        | 1, JsonToken.StartObject | 1, JsonToken.StartArray ->
            tokenSplit reader acc reader.LineNumber (reader.LinePosition - 1)
        | 1, JsonToken.EndObject | 1, JsonToken.EndArray ->
            let newValue = str.Substring(startIdx, reader.LinePosition - startIdx)
            tokenSplit reader (newValue::acc) reader.LineNumber (reader.LinePosition + 1)
        | 1, JsonToken.String ->
            let newValue = "\"" + (reader.Value |> string) + "\""
            tokenSplit reader (newValue::acc) reader.LineNumber (reader.LinePosition + 1)
        | 1, JsonToken.Boolean ->
            let newValue = (reader.Value |> string).ToLower()
            tokenSplit reader (newValue::acc) reader.LineNumber (reader.LinePosition + 1)
        | 1, JsonToken.Undefined ->
            let newValue = "undefined"
            tokenSplit reader (newValue::acc) reader.LineNumber (reader.LinePosition + 1)
        | 1, JsonToken.Null ->
            let newValue = "null"
            tokenSplit reader (newValue::acc) reader.LineNumber (reader.LinePosition + 1)
        | 1, _ ->
            let newValue = (reader.Value |> string)
            tokenSplit reader (newValue::acc) reader.LineNumber (reader.LinePosition + 1)
        | _, _ ->
            tokenSplit reader acc startLine startIdx
    tokenSplit reader [] 0 0
    |> List.rev
    |> Seq.iter Console.WriteLine
    0