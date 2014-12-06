module Test

open System
open Newtonsoft.Json
open Newtonsoft.Json.Converters

[<EntryPoint>]
let main args =
    match args with
    | [|"client"|] ->
        let client = new NSchema.Model.Invoicing.InvoiceService("amqp://localhost", "testnschema")
        let userInfo = client.Authenticate "manager" "password"
        userInfo.Name |> System.Console.WriteLine
        userInfo.Status |> System.Console.WriteLine
        let userInfo = client.Authenticate "manager" "password"
        userInfo.Name |> System.Console.WriteLine
        userInfo.Status |> System.Console.WriteLine
        let invoiceList = client.GetInvoiceList "manager" "password"
        invoiceList |> List.length |> System.Console.WriteLine
        let invList, err = client.GetTwoValueOperation "manager" "password"
        invList |> List.length |> System.Console.WriteLine
        let invList, err = client.GetTwoValueOperation "manager2" "password"
        match err with
        | null ->
            ()
        | _ ->
            err |> System.Console.WriteLine
    | _ ->
        (new NSchema.Model.Invoicing.InvoiceServiceSrv("amqp://localhost", "testnschema"))._Listen() |> ignore
    0