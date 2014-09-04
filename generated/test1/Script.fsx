
// NOTE: If warnings appear, you may need to retarget this project to .NET 4.0. Show the Solution
// Pad, right-click on the project node, choose 'Options --> Build --> General' and change the target
// framework to .NET 4.0 or .NET 4.5.

module elLegendarioSplit.Main

open System

let rec splitImplementation (separatorList: string array)  (src: char seq) acc =
    let s = string(src)
    let nextSplit =
        separatorList
        |> Seq.map (fun sep ->
                        sep, (s).IndexOf(sep)
                   )
        |> Seq.filter (fun (_, index) -> index >= 0)
        |> Seq.fold (fun state (sep, idx) -> 
                        match state with
                        | None ->
                            Some(sep, idx)
                        | Some (separator, index) when idx < index ->
                            Some(sep, idx)
                        | _ ->
                            state
                    ) None
    match nextSplit with
    | None ->
        s :: acc
    | Some (separator, index) ->
        let chunk =
            s.Substring(0, index)
        let partialResult = chunk :: acc
        let remaining = s.Substring(index + (separator.Length))
        let test =
            remaining
            |> Seq.tryFindIndex (fun _ -> true)
        match test with
        | None ->
            partialResult
        | _ ->
            splitImplementation separatorList remaining partialResult
    

let omfgSplit (separatorList: string array) (src: string) : string list =
    splitImplementation separatorList src []
    |> List.rev
    |> Seq.map (fun cs -> string(cs))
    |> List.ofSeq


let probando =
    let result =
        "frase, entre, comas| y | palitos"
        |> omfgSplit [|",";" ";"|"|]
    result


