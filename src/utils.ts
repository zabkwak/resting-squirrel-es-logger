export const getTemplate = (templateName: string, numberOfShards: number = 1, numberOfReplicas: number = 0) => {
	return {
		body: {
			index_patterns: [`${templateName}-*`],
			mappings: {
				properties: {
					'@timestamp': {
						type: 'date',
					},
					'appName': {
						type: 'keyword',
					},
					'body': {
						enabled: false,
						type: 'object',
					},
					'error': {
						properties: {
							code: {
								type: 'keyword',
							},
							message: {
								type: 'text',
							},
							payload: {
								enabled: false,
								type: 'object',
							},
						},
					},
					'headers': {
						enabled: false,
						type: 'object',
					},
					'method': {
						type: 'keyword',
					},
					'params': {
						enabled: false,
						type: 'object',
					},
					'path': {
						type: 'keyword',
					},
					'query': {
						enabled: false,
						type: 'object',
					},
					'route': {
						type: 'keyword',
					},
					'spec': {
						type: 'keyword',
					},
					'statusCode': {
						type: 'integer',
					},
					'took': {
						type: 'integer',
					},
					'version': {
						type: 'keyword',
					},
				},
			},
			settings: {
				index: {
					number_of_replicas: numberOfReplicas,
					number_of_shards: numberOfShards,
				},
			},
		},
		name: templateName,
	};
};
