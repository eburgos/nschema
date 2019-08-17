"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
function baseGenerate(config, nschema, target, template, typescript, context) {
    return __awaiter(this, void 0, void 0, function* () {
        return typescript.generate(nschema, config, template, target, context);
    });
}
const templates = {
    consumer() {
        return `namespace <%= namespace %>

    open Newtonsoft.Json
    open Newtonsoft.Json.Converters
    open System.Runtime.Serialization
    open RabbitMQ.Client

    /// <summary><% if (typeof(description) === 'string') { %><%= description %><% } %></summary>
    [<AbstractClass>]
    type <%= name %>Consumer(connectionString: string, queueName: string) =
    <% include ../arraySplit %>
        member this._connectionFactory = new RabbitMQ.Client.ConnectionFactory (Uri = connectionString)
        member this._connection = this._connectionFactory.CreateConnection ()
        member this._channel = this._connection.CreateModel ()
        member this._disposables : System.IDisposable list = [this._channel :> System.IDisposable;this._connection :> System.IDisposable]
        member this._queueName = queueName
        member this._Listen() =
            let messageHandler body (props: IBasicProperties) deliveryTag =
                let connectionFactory = this._connectionFactory
                try
                    let parameters =
                        body
                        |> System.Text.Encoding.UTF8.GetString
                        |> arraySplit
                        |> Array.ofSeq
                    let response =
                        match props.Headers.["x-operationName"] :?> byte array |> System.Text.Encoding.UTF8.GetString with
        <% for(var op in operations) {
            var $inMessage = operations[op].inMessage;
            var $outMessage = operations[op].outMessage;
            var $nschemaMessage,
            $nschemaMessageDirection,
            $paramCount = 0,
            $currentParam,
            $paramsString,
            $paramsList;
        %>                  | "<%= op %>" ->
        <% $inMessage.data.forEach(function (p) {
           $paramCount += 1; $currentParam = 'parameter' + $paramCount; %>
                            let <%= $currentParam %> =
                                use textReader = new System.IO.StringReader (parameters.[<%= $paramCount - 1 %>])
                                let reader = new JsonTextReader (textReader)
                                serializer.Deserialize<<%= $typescript.typeName(p.type, $nschema, null, null, $context) %>>(reader)
        <% }); %>
                            let <%
                                    $paramCount = 0;
                                    $paramsString =
                                            $outMessage.data.map(function (p) { $paramCount += 1; $currentParam = 'response' + $paramCount; return $currentParam; }).join(',');
            $paramsString = $paramsString || '_';
        %><%= $paramsString %> = (this.<%= op %> <% $paramCount = 0; $paramsString = $inMessage.data.map(function (p) { $paramCount += 1; $currentParam = 'parameter' + $paramCount; return ' ( ' + $currentParam + ' ) '; }).join(' '); %><%= $paramsString %> )
                            let value =<% $paramsList = []; $paramCount = 0; $paramsString = $outMessage.data.forEach(function (p) { $paramCount += 1; $currentParam = 'response' + $paramCount; $paramsList.push($currentParam);%>
                                let <%= $currentParam %>Str = <%= $currentParam %> |> JsonConvert.SerializeObject<%}); %>
                                [<%= $paramsList.map(function (i) { return i + 'Str'; }).join(';')%>]
                                |> String.concat ","
                            "[" + value + "]"

        <% } %>
                          | opName ->
                                use connection = connectionFactory.CreateConnection ()
                                use channel = connection.CreateModel ()
                                channel.BasicReject(deliveryTag, false)
                                connection.Close ()
                                failwith "Unsupported operation: " + opName
                    let responseBytes = System.Text.Encoding.UTF8.GetBytes(response)
                    use connection = this._connectionFactory.CreateConnection ()
                    use channel = connection.CreateModel ()
                    let replyProps = channel.CreateBasicProperties ()
                    replyProps.CorrelationId <- props.CorrelationId
                    channel.BasicPublish ("", props.ReplyTo, replyProps, responseBytes)
                    channel.BasicAck(deliveryTag, false)
                    connection.Close ()
                with
                    | e ->
                        use connection = connectionFactory.CreateConnection ()
                        use channel = connection.CreateModel ()
                        channel.BasicReject(deliveryTag, true)
                        connection.Close()

            let rec consumeLoop (consumer: RabbitMQ.Client.QueueingBasicConsumer) queueName callback =
                try
                    let eventArgs = consumer.Queue.Dequeue()
                    async {
                        callback eventArgs.Body eventArgs.BasicProperties eventArgs.DeliveryTag
                    }
                    |> Async.Start
                    // Crear un task o un thread whatever
                    consumeLoop consumer queueName callback
                with
                    | :? System.IO.EndOfStreamException ->
                        ()
                    | e ->
                        raise e
            let startConsume (channel) (queueName) (callback) =
                let consumer = new RabbitMQ.Client.QueueingBasicConsumer (channel)
                channel.BasicConsume (queueName, true, consumer) |> ignore
                consumeLoop consumer queueName callback

            do
                this._channel.ExchangeDeclare (queueName, ExchangeType.Headers, true)
                this._channel.QueueDeclare (queueName, true, false, false, null) |> ignore
                this._channel.QueueBind (queueName, queueName, System.String.Empty, null)
                this._channel.BasicQos (0u, uint16(1), false)
                startConsume this._channel queueName messageHandler

    <% for(var op in operations) {
    var $inMessage = operations[op].inMessage;
    var $outMessage = operations[op].outMessage;
    var $nschemaMessage,
        $nschemaMessageDirection;
    %>    /// <summary><%- operations[op].description || '' %></summary>
    <% $inMessage.data.forEach(function (par) {
    %>    /// <param name="<%- par.name %>"><%- par.description || '' %></param>
    <% }); %>    /// <returns><%- $outMessage.data.map(function (d) { return d.description || ''; }).join(', ') %></returns>
        abstract member <%= op %>: <% $nschemaMessage = $inMessage; $nschemaMessageDirection = 'in'; %><% include ../messageType %> -> (<% $nschemaMessage = $outMessage; $nschemaMessageDirection = 'out'; %><% include ../messageType %>)
    <% } %>
        abstract member Dispose: unit -> unit
        default this.Dispose () =
            this._disposables
            |> Seq.iter (fun d -> d.Dispose () )

        interface System.IDisposable with
            member this.Dispose () = this.Dispose ()`;
    },
    producer() {
        return `namespace <%= namespace %>

    open Newtonsoft.Json
    open Newtonsoft.Json.Converters
    open System.Runtime.Serialization
    open RabbitMQ.Client
    open RabbitMQ.Client.MessagePatterns

    type private <%= name %>AMQPChannel (channel: IModel) =
        let replyQueueName = channel.QueueDeclare("", false, false, true, new System.Collections.Generic.Dictionary<string, obj>()).QueueName
        let consumer = new QueueingBasicConsumer (channel)
        do
            channel.BasicConsume (replyQueueName, true, consumer) |> ignore
        let rec replyLoop (consumer: QueueingBasicConsumer) correlationId =
            let ea = consumer.Queue.Dequeue()
            match ea.BasicProperties.CorrelationId with
            | cId when cId = correlationId ->
                ea
            | _ ->
                replyLoop consumer correlationId
        static member serializeJson o =
            let sb = new System.Text.StringBuilder()
            use textWriter = new System.IO.StringWriter(sb)
            use writer = new Newtonsoft.Json.JsonTextWriter(textWriter)
            let serializer = new Newtonsoft.Json.JsonSerializer()
            serializer.Serialize(writer, o)
            do
                writer.Flush()
            sb.ToString()
        member this.DeclareQueue (queueName: string) =
            channel.QueueDeclare(queueName, true, false, false, null)
        member this.DeclareExchange (exchangeName: string) =
            channel.ExchangeDeclare(exchangeName, ExchangeType.Direct, true, false, new System.Collections.Generic.Dictionary<string, obj>())
        member this.PostMessage (queueName: string) (message: byte[]) =
            channel.BasicPublish(System.String.Empty, queueName, null, message)
        member this.PostJsonMessage (queue: string) (message: 'a) =
            message
            |> <%= name %>AMQPChannel.serializeJson
            |> System.Text.Encoding.UTF8.GetBytes
            |> this.PostMessage (queue)
        member this.RPCCall (queueName: string) (headers: System.Collections.Generic.IDictionary<string, obj>) (message: byte[]) =
            let props = channel.CreateBasicProperties()
            let correlationId = System.Guid.NewGuid().ToString()
            props.Headers <- headers
            props.ContentType <- "application/json"
            props.ReplyTo <- replyQueueName
            props.CorrelationId <- correlationId
            channel.BasicPublish (queueName, queueName, props, message)
            let response = replyLoop consumer correlationId
            response.Body
        member this.RPCJsonCall (queue: string) (message: 'a) (headers: System.Collections.Generic.IDictionary<string, obj>)  =
            message
            |> <%= name %>AMQPChannel.serializeJson
            |> System.Text.Encoding.UTF8.GetBytes
            |> this.RPCCall queue headers
            |> System.Text.Encoding.UTF8.GetString
        interface System.IDisposable with
            member this.Dispose () =
                channel.Dispose()
                ()

    type private <%= name %>AMQPEndpoint(uri) = //"amqp://guest:guest@localhost/"
        let factory = new ConnectionFactory(Uri = uri)
        let connection = factory.CreateConnection()
        member this.GetChannel () =
            let channel = connection.CreateModel()
            new <%= name %>AMQPChannel(channel)
        interface System.IDisposable with
            member this.Dispose () =
                connection.Dispose()
                ()

    type <%= name %>(connectionString: string, queueName: string) =
        let amqpEndpoint = new <%= name %>AMQPEndpoint ( connectionString )
        let amqpEndpointChannel = amqpEndpoint.GetChannel()
    <% include ../arraySplit %>
        <% for(var op in operations) {
        var $inMessage = operations[op].inMessage;
        var $outMessage = operations[op].outMessage;
        var $nschemaMessage,
        $nschemaMessageDirection;
        %>/// <summary><%- operations[op].description || '' %></summary>
    <% $inMessage.data.forEach(function (par) {
    %>    /// <param name="<%- par.name %>"><%- par.description || '' %></param>
    <% }); %>    /// <returns><%- $outMessage.data.map(function (d) { return d.description || ''; }).join(', ') %></returns>
        member this.<%= op %><% if (!$inMessage.data.length) {%> () <%} else { $inMessage.data.forEach(function (par) {
    %> (<%= par.name %>: <%= $typescript.typeName(par.type, $nschema, null, null, $context) %>)<% }); } %> : (<% $nschemaMessage = $outMessage; $nschemaMessageDirection = 'out'; %><% include ../messageType %>) =
            let paramDict = dict [|("x-operationName","<%= op %>" :> obj)|]
            let msg = [<%- $inMessage.data.map(function (par) { return par.name + ' |> ' + name + 'AMQPChannel.serializeJson '; }).join(';') %>]
                      |> String.concat ","
            let outputStrList =
                "[" + msg + "]"
                |> System.Text.Encoding.UTF8.GetBytes
                |> amqpEndpointChannel.RPCCall queueName paramDict
                |> System.Text.Encoding.UTF8.GetString
                |> arraySplit
    <% $outMessage.data.forEach(function (outputPar, outputParIndex) {%>
            let <%- outputPar.name %> =
                use textReader = new System.IO.StringReader (outputStrList.[<%- outputParIndex %>])
                let reader = new JsonTextReader (textReader)
                serializer.Deserialize<<%= $typescript.typeName(outputPar.type, $nschema, null, null, $context) %>>(reader)<%});%>
            (<%- $outMessage.data.map(function (d) { return d.name; }).join(', ') %>)
        <% } %>
        interface System.IDisposable with
            member this.Dispose () =
                (amqpEndpoint :> System.IDisposable).Dispose ()
                (amqpEndpointChannel :> System.IDisposable).Dispose ()`;
    }
};
class AmqpRpc {
    init(nschema) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.typescript) {
                throw new Error("Argument exception");
            }
            const typescript = this.typescript;
            [
                { template: templates.consumer, serviceType: "consumer" },
                { template: templates.producer, serviceType: "producer" }
            ].forEach(({ template, serviceType }) => {
                nschema.registerTarget({
                    bind: "amqpRpc",
                    description: "Generates a service layer where messages get sent over an AMQP protocol",
                    language: "typescript",
                    name: "typescript/amqpRpc",
                    serviceType,
                    type: "service",
                    generate(config, thisNschema, target, context) {
                        return __awaiter(this, void 0, void 0, function* () {
                            return baseGenerate(config, thisNschema, target, template, typescript, context);
                        });
                    }
                });
            });
            return Promise.resolve(null);
        });
    }
}
exports.AmqpRpc = AmqpRpc;
const amqprpc = new AmqpRpc();
exports.default = amqprpc;
