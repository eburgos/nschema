'use strict';
// This is a NSchema sample config file. Config files can either be defined as pure JSON or as a CJS module like this one.
// NSchema configs work in a parent-child model. Each child config overrides whatever a parent defines.
// Eg: If parent defines target language as 'javascript' then a child can redefine target language as ['javascript', 'fsharp']
module.exports = {
	// By convention, schema variables (such as $type) gets defined first. Preferrably in alphabetical order.

	// type can be one of: 'import', 'bundle', 'message', 'model', 'service'
	// 'import'  defines that this object is a reference to a NSchema definition somewhere else (probably a local file but possibly a remote file via http)
	// 'bundle'  defines that this object is a bundle (an array of other NSchema definitions)
	// 'object'   defines that this object is an object model. A class such as Person, Dog, etc
	// 'service' defines that this object is a service definition. It probably defines all it's methods, types, parameters, etc
	// 'message' defines that this object is a service message. A message can be a parameter or a group of parameters
	//
	// It's probably better to start off with a bundle since a bundle let's you define a list of objects
	'$type': 'bundle',
	'list': [
		// This import executes whatever is in the external subschema.json file
		{
			'$type': 'import',
			'$importLocation': './subschema.json'
		},
		// As you can see, we can have bundles inside of bundles
		{
			// $namespace means Append this string to the current 'namespace' variable. This sets 'namespace' to 'NSchema.Model.Invoicing'
			'$namespace': 'Invoicing',
			'$type': 'bundle',
			'list': [
				{
					'$type': 'object',
					'name': 'Invoice',
					'properties': {
						'customerId': {
							'description': 'Customer\'s number',
							// Simple types normally have just a string value
							'type': 'int' //primitive types can be 'int', 'string', 'bool', 'float'
						},
						'details': {
							'description': 'Invoice details',
							// Custom types can be defined as an object
							'type': {
								// If namespace is not present it is assumed as if the type belongs to your namespace.
								// Empty namespaces must be defined as ''
								'namespace': 'NSchema.Model.InvoicingDetail',
								'name': 'InvoiceDetail',
								// This tells that 'details' is a list of InvoiceDetail
								'modifier': 'list'
							}
						}
					}
				},
				{
					'$type': 'object',
					'$subType': 'enumeration',
					'name': 'AuthenticationStatus',
					'properties': {
						'LoggedIn': {
							'description': 'User is logged in'
						},
						'LoggedOut': {
							'description': 'User is logged out'
						}
					}
				},
				{
					'$type': 'object',
					'name': 'UserInfo',
					'properties': {
						'name': {
							'description': 'User name',
							'type': 'string'
						},
						'status': {
							'description': 'Auth Status',
							'type': {
								'name': 'AuthenticationStatus'
							}
						}
					}
				},
				{
					'$type': 'message',
					'name': 'AuthMessage',
					'data': [
						{
							'description': 'Your login that you registered',
							'name': 'userName',
							'type': 'string',
							'paramType': 'query'
						},
						{
							'description': 'Your secret password',
							'name': 'password',
							'type': 'string',
							'paramType': 'query'
						}
					]
				},
			]
		},
		{
			$namespace: 'Services',
			$type: 'bundle',
			list: [
				// Finally our first service
				{
					'$target': [
						{
							'serviceType': 'producer',
							'location': './generated/test1/schema/client',
							'language': 'fsharp',
							'bind': 'amqpRpc'
						},
						{
							'serviceType': 'consumer',
							'location': './generated/test1/schema/server',
							'$fileName': 'InvoiceServiceConsumer.fs',
							'language': 'fsharp',
							'bind': 'amqpRpc'
						},
						{
							'serviceType': 'producer',
							'location': './generated/typescriptClient/schema/client',
							'language': 'typescript',
							'bind': 'rest',
							$namespaceMapping: {
								'@angular/core': '@angular/core',
								'@angular/http': '@angular/http',
								'rxjs/Rx': 'rxjs/Rx'
							}
						},
						{
							'serviceType': 'consumer',
							'location': './generated/typescriptClient/schema/server',
							'language': 'typescript',
							'bind': 'rest'
						}
					],
					'$type': 'service',
					'name': 'InvoiceService',
					'operations': {
						'GetInvoiceList': {
							'description': 'Returns the list of invoices',
							'inMessage': {
								// This message inherits AuthMessage
								'$extends': {
									'name': 'AuthMessage',
									'namespace': 'NSchema.Model.Invoicing'
								}
							},
							'outMessage': {
								'data': [
									{
										'description': 'List of invoices',
										'type': {
											'name': 'Invoice',
											'namespace': 'NSchema.Model.Invoicing',
											'modifier': 'list'
										}
									}
								]
							}
						},
						'GetTwoValueOperation': {
							'description': 'Tests an operation that yields 2 values',
							'inMessage': {
								// This message inherits AuthMessage
								'$extends': {
									'name': 'AuthMessage',
									'namespace': 'NSchema.Model.Invoicing'
								}
							},
							'outMessage': {
								'data': [
									{
										'description': 'List of invoices',
										'type': {
											'name': 'Invoice',
											'namespace': 'NSchema.Model.Invoicing',
											'modifier': 'list'
										}
									},
									{
										'description': 'error message',
										'type': 'string'
									}
								]
							}
						},
						'Authenticate': {
							'description': 'Tests for authentication',
							'inMessage': {
								// This message inherits AuthMessage
								'$extends': {
									'name': 'AuthMessage',
									'namespace': 'NSchema.Model.Invoicing'
								}
							},
							'outMessage': {
								'data': [
									{
										'description': '',
										'type': {
											'name': 'UserInfo',
											'namespace': 'NSchema.Model.Invoicing'
										}
									}
								]
							}
						},
						'AllParametersOperation': {
							'description': 'Tests an operation that has parameters of all kinds',
							method: 'post',
							route: 'parameters/{routeParameter1}/all',
							'inMessage': {
								// This message inherits AuthMessage
								'$extends': {
									'name': 'AuthMessage',
									'namespace': 'NSchema.Model.Invoicing'
								},
								data: [
									{
										'description': 'Header parameter',
										'name': 'headerParameter1',
										'type': 'string',
										'paramType': 'header'
									},
									{
										'description': 'Get parameter',
										'name': 'getParameter1',
										'type': 'int',
										'paramType': 'query'
									},
									{
										'description': 'route parameter',
										'name': 'routeParameter1',
										'type': 'int',
										'paramType': 'query'
									},
									{
										'description': 'body parameter',
										'name': 'bodyParameter1',
										'type': 'string',
										'paramType': 'body'
									},
									{
										'description': 'body parameter 2',
										'name': 'bodyParameter2',
										'type': {
											'name': 'Invoice',
											'namespace': 'NSchema.Model.Invoicing'
										},
										'paramType': 'body'
									}
								]
							},
							'outMessage': {
								'data': [
									{
										'description': 'List of invoices',
										'type': {
											'name': 'Invoice',
											'namespace': 'NSchema.Model.Invoicing',
											'modifier': 'list'
										}
									},
									{
										'description': 'error message',
										'type': 'string',
										paramType: 'header'
									},
									{
										name: 'instanceName',
										'description': 'Instance name who took the message',
										'type': 'string',
										paramType: 'header'
									}
								]
							}
						}
					}
				}
			],
			'$target': [{
				location: './generated/typescriptClient/schema',
				language: 'typescript',
				$restClientStrategy: 'NineJS',
				$namespaceMapping: {
					'ninejs/request': 'ninejs/request',
					'@angular/core': '@angular/core',
					'@angular/http': '@angular/http',
					'rxjs/Rx': 'rxjs/Rx'
				}
			}]
		}
	],
	// Target generation location
	'location': './generated/test1/schema',
	// Namespace used assuming this generation generates classes or something that requires namespaces (such as C# or Java)
	'namespace': 'NSchema.Model',
	// Schema. Schema used for services and messages (assuming you are generating XML based ones).
	// This doesn't mean anything important regarding code generation or how code is going to be generated.
	'schema': 'http://ninejs.org/nineschema/2017',
	// Available default targets can be found in lib/provider/target. The names are the same as it's filename
	// 'javascript' and 'fsharp' are valid values
	// This property can either be an array or a single string
	'$target': [{
		location: './generated/test1/schema',
		language: 'fsharp'
	},{
		location: './generated/typescriptClient/schema',
		language: 'typescript',
		$restClientStrategy: 'NineJS',
		$namespaceMapping: {
			'ninejs/request': 'ninejs/request',
			'@angular/core': '@angular/core',
			'@angular/http': '@angular/http',
			'rxjs/Rx': 'rxjs/Rx'
		}
	}]
};
