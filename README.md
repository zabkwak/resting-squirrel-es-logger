# resting-squirrel-es-logger
ElasticSearch logger for Resting Squirrel apps.

## Requirements
- Node.js >= 8
- ElasticSearch 7

## Installation
```bash
npm install resting-squirrel-es-logger --save
```

## Usage
```javascript
import rs from 'resting-squirrel'; // peer dependency
import logger from 'resting-squirrel-es-logger';

const app = rs({
	logger: logger(/* options */),
});

app.start();

```

## Options
**appName: string** - Name of the application. Default: `RS App`  
**clearTemplate: boolean** - Indicates if the ES template is deleted before the logger init. Default: `false`  
**getCustomData: (property: string, loggerData: ILoggerData) => any** - Function to get the value of custom property. Default: `null`  
**indexTimeFormat: string** - Time format from `moment` for the index suffix. Default: `YYYY-MM-DD`  
**node: string** - ES node. Default: `http://localhost:9200`  
**onError: (error: any) => void** - Function called if some error occurs. Default: `null`  
**onReady: () => void** - Function called if the logger is ready. Default: `null`  
**template: Template** - Template data. Default: `{ name: 'rs-es-logger', numberOfReplicas: 0, numberOfShards: 1, properties: {} }`  
**transformBody: (property: string, value: any) => any** - Function to transform property value before the save in the request body. Default: `null`  
**transformQuery: (property: string, value: any) => any** - Function to transform property value before the save in the request query. Default: `null`  
### Template
**name: string** - Name of the template. Default: `rs-es-logger`  
**numberOfReplicas: number** - Number of replicas. Default: `0`  
**numberOfShards: number** - Number of shards. Default: `1`  
**properties: { [key: string]: any }** - Custom template properties for custom data. Default: `{}`  

## Transforms
Data in body and query can be transformed. 
```javascript
import logger from 'resting-squirrel-es-logger';

logger({
	transformBody(property, value) {
		switch (property) {
			case 'password':
				return '********'; // We really don't want to have passwords in database
			case 'profile_picture': // The picture is in base64
				return `[file(${value?.length})]`; // We don't want to save large data to database
			default: 
				return value;
		}
	},
});

```

## Custom data
Custom data can be indexed as well. It should be the data for further searches.
```javascript
import logger from 'resting-squirrel-es-logger';

logger({
	template: {
		properties: {
			userId: {
				type: 'integer',
			},
		},
	},
	getCustomData(property, { headers }) {
		// Logger doesn't have access to the incoming request so we have to store the userId to the headers in auth middleware
		switch (property) {
			case 'userId':
				// After that we can access userId from headers and save it
				return headers?.userId || null;
			default: 
				return null;
		}
	},
});

```