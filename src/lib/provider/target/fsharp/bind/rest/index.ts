/**
 * Created by eburgos on 6/13/14.
 */
"use strict";
import fsharp from "../..";
import {
  NSchemaInterface,
  Target,
  TemplateFunction
} from "../../../../../model";
import { MessageTask } from "../../../../type/message";
import { ServiceTask } from "../../../../type/service";
import { FSharpObject } from "../object";

async function baseGenerate(
  config: ServiceTask,
  nschema: NSchemaInterface,
  target: Target,
  template: TemplateFunction<FSharpObject | ServiceTask | MessageTask>
) {
  return fsharp.generate(nschema, config, template, target);
}

const templates: {
  consumer: TemplateFunction<ServiceTask | FSharpObject | MessageTask>;
  producer: TemplateFunction<ServiceTask | FSharpObject | MessageTask>;
} = {
  consumer() {
    return `namespace <%= namespace %>

    open System.Runtime.Serialization
    open System.ServiceModel
    open System.ServiceModel.Web
    open Newtonsoft.Json

    type <%= name %>MethodNames =<% for(var op in operations) { %>
        | <%- op %><%} %>

    type <%= name %>OperationContext () =
    <%
        var operationContextVars = [
            {
                name: 'operationName',
                type: {
                    rawName: name + 'MethodNames'
                }
            },
            {
                name: 'statusCode',
                type: {
                    rawName: '(System.Net.HttpStatusCode * string) option'
                }
            }
        ];
        var defaultContextVars = [
            {
                name: 'userName',
                type: 'string'
            },
            {
                name: 'password',
                type: 'string'
            }
        ];
        if (typeof(operationContextVariables) !== 'undefined') {
            operationContextVars = operationContextVars.concat(operationContextVariables);
        }
        else {
            operationContextVars = operationContextVars.concat(defaultContextVars);
        }
        operationContextVars.forEach(function ($property) {
            var $nschemaType = $property.type;
            var $registeredType = $nschema.getObject($nschemaType.namespace || namespace || '', $nschemaType.name) || $nschemaType;
    %>    /// <summary><%- $property.description || '' %></summary>
    <% if ($registeredType && $registeredType.subType === 'enumeration') { %>[<JsonConverter(typeof<StringEnumConverter>)>]
        <% } %>    member val <%- $property.fsharpName || $nschema.utils.initialCaps($property.name) %>: <% if ($property.type.rawName) { %><%- $property.type.rawName %> = Unchecked.defaultof<<%- $property.type.rawName %>><% } else { %><% include ../typeName %> = <% include ../typeDefaultValue %><% } %> with get, set
    <% }); %>

    /// <summary><% if (typeof(description) === 'string') { %><%= description %><% } %></summary>
    [<AbstractClass>]
    type <%= name %> () =
        member this._dispatchStatusCode (msg: System.Net.HttpStatusCode * string) =
            let statusCode, message = msg
            do
                WebOperationContext.Current.OutgoingResponse.StatusCode <- statusCode
                WebOperationContext.Current.OutgoingResponse.StatusDescription <- message
            null
        abstract member _Authenticate: <%= name %>OperationContext -> System.ServiceModel.Web.WebOperationContext -> <%= name %>OperationContext
        default this._Authenticate context _ =
            context
        abstract member _handleException: <%= name %>MethodNames -> System.Exception -> unit
        default this._handleException methodName exceptionObj =
            ()
    <% for(var op in operations) {
            var $inMessage = operations[op].inMessage;
            var $outMessage = operations[op].outMessage;
            var $nschemaMessage,
                $nschemaMessageDirection;
        %>    /// <summary><%- operations[op].description || '' %></summary>
    <%
        $inMessage.data.forEach(function (par) {
        %>    /// <param name="<%- par.name %>"><%- par.description || '' %></param>
    <% }); %>    /// <returns><%- $outMessage.data.map(function (d) { return d.description || ''; }).join(', ') %></returns>
        abstract member <%= op %>: <% if ($inMessage.data.length) { %><% $nschemaMessage = $inMessage; $nschemaMessageDirection = 'in'; %><% include ../messageType %> -> <%- name %>OperationContext<% } else { %><%- name %>OperationContext<% } %> -> (<% $nschemaMessage = $outMessage; $nschemaMessageDirection = 'out'; %><% include ../messageType %>)
    <% } %>

    [<ServiceContract>]<% if ((fsharpAttributes || []).length) {%>
    <%- (fsharpAttributes || []).map(function (at) { return '[<' + at + '>]' }).join('\n') %><%}%>
    type <%= name %>Rest<'T when 'T :> <%= name %> and 'T: (new: unit -> 'T)> () =
        let _impl = new ('T)()
    <% include ../arraySplit %>
        let toStream value =
            let sb = new System.Text.StringBuilder ()
            use textWriter = new System.IO.StringWriter (sb)
            use writer = new Newtonsoft.Json.JsonTextWriter (textWriter)
            let responseBytes =
                serializer.Serialize(writer, value)
                do
                    writer.Flush()
                sb.ToString()
                |> System.Text.Encoding.UTF8.GetBytes
            new System.IO.MemoryStream (responseBytes)
            :> System.IO.Stream

        static member private toBody<'P> (serializer: Newtonsoft.Json.JsonSerializer) (s: System.IO.Stream): 'P =
            use streamReader = new System.IO.StreamReader(s)
            use jsonReader = new Newtonsoft.Json.JsonTextReader(streamReader)
            serializer.Deserialize<'P>(jsonReader)

    <% for(var op in operations) {
                var $inMessage = operations[op].inMessage;
                var $outMessage = operations[op].outMessage;
                var $nschemaMessage,
                    $nschemaMessageDirection,
                    method,
                    attSuffix,
                    route,
                    paramsInRoute,
                    paramsInQuery,
                    paramsInHeader,
                    paramsInBody;
        method = (operations[op].method || 'get').toLowerCase();
        attSuffix = (method.toLowerCase() === 'get')?'Get':'Invoke';
        route = operations[op].route || op;
        function getType (p) {
            return (typeof(p.type) === 'string')? { namespace: '', name: p.type } : p.type;
        }
        function includeInRoute (p) {
            var t = getType (p);
            return (route.indexOf('{' + p.name + '}') >= 0) &&
                    ((!p.modifier) || (!p.modifier.length)) &&
                    (t.namespace === '') &&
                    (t.name === 'string' || t.name === 'int' || t.name === 'float' || t.name === 'bool' || t.name === 'date');
        }
        function includeInQuery (p) {
            var t = getType (p);
            return (p.paramType === 'query') &&
                    ((!p.modifier) || (!p.modifier.length)) &&
                    (t.namespace === '') &&
                    (t.name === 'string' || t.name === 'int' || t.name === 'float' || t.name === 'bool' || t.name === 'date');
        }
        function includeInHeader (p) {
            var t = getType (p);
            return (p.paramType === 'header');
        }
        var allParams = $inMessage.data.slice(0);
        paramsInRoute =
                allParams
                        .filter(includeInRoute)
                        .map(function (p) {
                            return {
                                name: p.name,
                                realType: getType(p),
                                type: {
                                    namespace: '',
                                    name: 'string'
                                }
                            }
                        });
        allParams = allParams.filter(function (p) { return !includeInRoute(p); });
        paramsInQuery =
                allParams
                        .filter(includeInQuery)
                        .map(function (p) {
                            return {
                                name: p.name,
                                realType: getType(p),
                                type: {
                                    namespace: '',
                                    name: 'string'
                                }
                            }
                        });
        allParams = allParams.filter(function (p) { return !includeInQuery(p); });
        paramsInHeader =
                allParams
                        .filter(includeInHeader);
        allParams = allParams.filter(function (p) { return !includeInHeader(p); });
        paramsInBody =
                allParams
                        .filter(function (p) {
                            return !includeInRoute(p);
                        });
        if ((method === 'get') && (paramsInBody.length)) {
            throw new Error('Service "' + name + '" : operation "' + op + '" has method GET and body parameters. Fix this to continue.');
        }
        if (paramsInBody.length && (method !== 'get')) {
            paramsInRoute
                    .push({
                        name: '_body',
                        isBody: true,
                        isArray: (paramsInBody.length > 1),
                        type: {
                            namespace: 'System.IO',
                            name: 'Stream'
                        }
                    });
        }
        var queryString = "";
        if (paramsInQuery.length) {
            queryString = "?" + paramsInQuery.map(function (p) { return p.name + '={' + p.name + '}'; }).join('&');
        }
        //After all, paramsInQuery and paramsInRoute is treated the same way
        paramsInRoute = paramsInRoute.concat(paramsInQuery);
            %>
        [<OperationContract>]
        [<Web<%- attSuffix %>(UriTemplate = "<%- route + queryString %>"<% if (method !== 'get') { %>, Method="<%- method.toUpperCase() %>"<% } %>)>]
        member this.<%= op %><% if (!paramsInRoute.length) {%> () <%} else { paramsInRoute.forEach(function (par) {
                %> (<%= par.name %>: <%= $fsharp.typeName(par.type, $nschema) %>)<% }); } %> =
            let _ctx = (_impl._Authenticate (new <%- name %>OperationContext ( OperationName=<%- name %>MethodNames.<%- op %> )) System.ServiceModel.Web.WebOperationContext.Current )
            match _ctx.StatusCode with
            | None ->
                do
                    System.ServiceModel.Web.WebOperationContext.Current.OutgoingResponse.ContentType<- "application/json"
                try
                <% if (paramsInRoute.length) {
                    var $_result,
                        $nschemaType;
                    paramsInRoute.forEach(function (p) {
                        if (p.isBody) {
                            if (p.isArray) {%>
                    let <%- paramsInBody.map(function (p) { return p.name;}).join (', ') %> =
                        <% if (paramsInBody.length > 1) {%>
                        let parameters =
                            use _bodyReader = new System.IO.StreamReader ( _body )
                            _bodyReader.ReadToEnd()
                            |> arraySplit <% } else { %>
                        let parameters =
                            use _bodyReader = new System.IO.StreamReader ( _body )
                            [ _bodyReader.ReadToEnd() ]<% } %>
    <%              paramsInBody.forEach(function (p, idx) {%>
                        let parameter<%- idx %> =
                            use textReader = new System.IO.StringReader (parameters |> List.head)
                            let reader = new JsonTextReader (textReader)
                            serializer.Deserialize< <%
    $nschemaType = p.type; %><% include ../typeName %> >(reader)
    <%})
                     %>
                        <%- paramsInBody.map(function (p, idx) { return 'parameter' + idx;}).join (', ') %>
            <%
                            }
                            else {
                                %>
                    let <%- paramsInBody[0].name %> =
                        let _parameter =
                            use _bodyReader = new System.IO.StreamReader ( _body )
                            _bodyReader.ReadToEnd()
                        use textReader = new System.IO.StringReader (_parameter)
                        let reader = new JsonTextReader (textReader)
                        let r = serializer.Deserialize< <%
                            $nschemaType = paramsInBody[0].type;
                      %><% include ../typeName %> >(reader)
                        do
                            reader.Close ()
                        r<%
                            }
                        }
                        else if (p.realType.name !== 'string') {
                        %>
                    let <%- p.name %> = <%
                    switch (p.realType.name) {
                        case 'int':
                            %><%- p.name %> |> System.Int32.Parse<%
                            break;
                        case 'float':
                            %><%- p.name %> |> System.Double.Parse<%
                            break;
                        case 'bool':
                            %><%- p.name %> |> System.Boolean.Parse<%
                            break;
                        case 'date':
                            %><%- p.name %> |> System.DateTime.Parse<%
                            break;
                        default:
                            %>null<%
                            break;
                    }
                 %><%
                        }
                    });
                }
                    var inMessageData = $inMessage.data.slice(0);
                    inMessageData.push({
                        name: '_ctx'
                    });
                    if (paramsInHeader.length) {%>
                    let _headers = System.ServiceModel.Web.WebOperationContext.Current.IncomingRequest.Headers<% paramsInHeader.forEach(function (p) {%>
                    let <%- p.name %> =
                            use textReader = new System.IO.StringReader (_headers.["<%- p.headerName || ('X-' + p.name) %>"])
                            let reader = new JsonTextReader (textReader)
                            let r = serializer.Deserialize< <% $nschemaType = p.type; %><% include ../typeName %> >(reader)
                            do
                                reader.Close()
                            r
    <%              });
                    }
                    %>
                    _impl.<%- op %><% if (!inMessageData.length) { %> ()<% } else { inMessageData.forEach(function (par) {
                    %> <%- par.name %><% });} %>
                    |> toStream
                with
                    | :? System.UnauthorizedAccessException as ex ->
                        do
                            ex
                            |> _impl._handleException <%- name %>MethodNames.<%- op %>
                        _impl._dispatchStatusCode (System.Net.HttpStatusCode.Forbidden, ex.Message)
                    | ex ->
                        do
                            ex
                            |> _impl._handleException <%- name %>MethodNames.<%- op %>
                        _impl._dispatchStatusCode (System.Net.HttpStatusCode.BadRequest, ex.Message)
            | Some msg ->
                msg
                |> _impl._dispatchStatusCode

    <% } %>`;
  },
  producer() {
    return `namespace <%= namespace %>

    open System.Runtime.Serialization
    open Newtonsoft.Json
    open FSharp.Data

    type <%= name %> (_url: string, _headers: (string * string) list) =
    <% include ../arraySplit %>
        new (_url: string) = new ProdoctivityApiService (_url, [])
        new (_url: string, user: string, password: string) = new ProdoctivityApiService (_url, [("Authorization", "Basic " + user + ":" + password)] )
        static member private _serializeJson o =
            let sb = new System.Text.StringBuilder()
            use textWriter = new System.IO.StringWriter(sb)
            use writer = new Newtonsoft.Json.JsonTextWriter(textWriter)
            let serializer = new Newtonsoft.Json.JsonSerializer()
            serializer.Serialize(writer, o)
            do
                writer.Flush()
            sb.ToString()
    <% for (var op in operations) {
            var $inMessage = operations[op].inMessage;
            var $outMessage = operations[op].outMessage;
            var $nschemaMessage,
                $nschemaMessageDirection,
                route,
                method,
                paramsInRoute,
                paramsInQuery,
                paramsInHeader,
                paramsInBody;
            route = operations[op].route || op;
        method = (operations[op].method || 'get').toLowerCase();
        function getType (p) {
            return (typeof(p.type) === 'string')? { namespace: '', name: p.type } : p.type;
        }
        function includeInRoute (p) {
            var t = getType (p);
            return (route.indexOf('{' + p.name + '}') >= 0) &&
                    ((!p.modifier) || (!p.modifier.length)) &&
                    (t.namespace === '') &&
                    (t.name === 'string' || t.name === 'int' || t.name === 'float' || t.name === 'bool' || t.name === 'date');
        }
        function includeInQuery (p) {
            var t = getType (p);
            return (p.paramType === 'query') &&
                    ((!p.modifier) || (!p.modifier.length)) &&
                    (t.namespace === '') &&
                    (t.name === 'string' || t.name === 'int' || t.name === 'float' || t.name === 'bool' || t.name === 'date');
        }
        function includeInHeader (p) {
            var t = getType (p);
            return (p.paramType === 'header');
        }
        var allParams = $inMessage.data.slice(0);
        paramsInRoute =
                allParams
                        .filter(includeInRoute)
                        .map(function (p) {
                            return {
                                name: p.name,
                                realType: getType(p),
                                type: {
                                    namespace: '',
                                    name: 'string'
                                }
                            }
                        });
        allParams = allParams.filter(function (p) { return !includeInRoute(p); });
        paramsInQuery =
                allParams
                        .filter(includeInQuery)
                        .map(function (p) {
                            return {
                                name: p.name,
                                realType: getType(p),
                                type: {
                                    namespace: '',
                                    name: 'string'
                                }
                            }
                        });
        allParams = allParams.filter(function (p) { return !includeInQuery(p); });
        paramsInHeader =
                allParams
                        .filter(includeInHeader);
        allParams = allParams.filter(function (p) { return !includeInHeader(p); });
        paramsInBody =
                allParams
                        .filter(function (p) {
                            return !includeInRoute(p);
                        });
        if ((method === 'get') && (paramsInBody.length)) {
            throw new Error('Service "' + name + '" : operation "' + op + '" has method GET and body parameters. Fix this to continue.');
        }
        %>    /// <summary><%- operations[op].description || '' %></summary>
    <% $inMessage.data.forEach(function (par) {
    %>    /// <param name="<%- par.name %>"><%- par.description || '' %></param>
    <% }); %>    /// <returns><%- $outMessage.data.map(function (d) { return d.description || ''; }).join(', ') %></returns>
        member this.<%= op %><% if (!$inMessage.data.length) {%> () <%} else { $inMessage.data.forEach(function (par) {
    %> (<%= par.name %>: <%= $fsharp.typeName(par.type, $nschema) %>)<% }); } %> : (<% $nschemaMessage = $outMessage; $nschemaMessageDirection = 'out'; %><% include ../messageType %>) =
            let _query =
                <% if (paramsInQuery.length) { %>[ <%- paramsInQuery.map(function (p) { return '("' + p.name + '", ' + p.name + ' |> string)'; }).join('; ') %> ]<% } else { %>[]<% } %>
            <% if (paramsInHeader.length) { %>
            let _headers =
                [ [ <%- paramsInHeader.map(function (p) { return '("' + p.name + '", ' + p.name + ' |> ' + name + '._serializeJson)'; }).join('; ') %> ]; _headers ] |> List.concat <%
            }%>
            <% if (paramsInBody.length) {%>let _body =
                <% if (paramsInBody.length > 1) { %>"[" + <% } %><%- paramsInBody.map(function (d) { return '(' + d.name + ' |> ' + name + '._serializeJson )'; }).join(' + ') %><% if (paramsInBody.length > 1) { %> + "]"<% } %>
                |> HttpRequestBody.TextRequest
    <% }%>

            let response = Http.Request (_url + System.String.Format("<%- route %>"), silentHttpErrors = true, query=_query, headers=_headers, httpMethod="<%- method.toUpperCase() %>"<% if (paramsInBody.length) { %>, body=_body<% }%>)
            match response.StatusCode with
            | 200 ->
                let value =
                    match response.Body with
                    | HttpResponseBody.Binary b ->
                        b
                        |> System.Text.Encoding.UTF8.GetString
                    | HttpResponseBody.Text s ->
                        s
    <% if ($outMessage.data.length > 1) {%>
                let result =
                    let resultList =
                        value
                        |> arraySplit
    <% $outMessage.data.forEach (function (par, idx) {%>
                    let output<%=idx%> =
                        Newtonsoft.Json.JsonConvert.DeserializeObject<<%= $fsharp.typeName(par.type, $nschema) %>> (resultList |> List.head)
                    let resultList = resultList |> List.tail
    <% }) %>
                    <%- $outMessage.data.map (function (par, idx) { return 'output' + idx; }).join (', ') %>
                result
    <% } else if ($outMessage.data.length === 1) { %>
                Newtonsoft.Json.JsonConvert.DeserializeObject< <%= $fsharp.typeName($outMessage.data[0].type, $nschema) %> > (value)
    <% } else { %>()<% } %>

            | 404 ->
                Unchecked.defaultof< <% $nschemaMessage = $outMessage; $nschemaMessageDirection = 'out'; %><% include ../messageType %> >
            | statusCode ->
                let httpCode = System.Enum.ToObject(typedefof<System.Net.HttpStatusCode>, statusCode) :?> System.Net.HttpStatusCode
                let ex = new System.Exception(System.String.Format("Returned HTTP Status Code: {0} = {1}", statusCode, httpCode))
                raise ex
    <% } %>
        interface System.IDisposable with
            member this.Dispose () =
                ()`;
  }
};

const rest = {
  async init(nschema: NSchemaInterface) {
    await [
      { template: templates.consumer, serviceType: "consumer" },
      { template: templates.producer, serviceType: "producer" }
    ].map(({ template, serviceType }) => {
      return nschema.registerTarget({
        bind: "rest",
        description: "Rest services in fsharp",
        language: "fsharp",
        name: "fsharp/rest",
        serviceType,
        type: "service",
        async generate(
          config: ServiceTask,
          thisNschema: NSchemaInterface,
          target: Target
        ) {
          return baseGenerate(config, thisNschema, target, template);
        }
      });
    });
  }
};

export default rest;
