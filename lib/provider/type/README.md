NSchema types
==========================

Types can be one of:

* bundle
    Defines a series of nschema definitions that must be executed in sequence.
    **Structure:**
        {
            '$type': 'bundle',
        	'list': [
        	    {}, //definition
        	    {}  //definition
        	]
        }
        
    Note that nesting bundles inside of bundles is allowed


* import
    Links to a definition in an external file. The import definition is equivalent to embedding the external definition file and replacing it with the import itself.
    **Structure:**
        {
            '$type': 'import',
            '$importLocation': './file.json'
        }

* message
    Represents a service operation's input and output message
    **Structure:**
        {
            '$type': 'message',
            'name': 'AuthMessage',
            'data': [
                {
                    'name': 'userName',
                    'type': 'string'
                },
                {
                    'name': 'password',
                    'type': 'string'
                }
            ]
        }

* object

* service




