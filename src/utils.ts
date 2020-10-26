export const getTemplate = (
	templateName: string,
	numberOfShards: number,
	numberOfReplicas: number,
	properties: { [key: string]: any },
) => {
	return {
		body: {
			index_patterns: [`${templateName}-*`],
			mappings: {
				properties: {
					'@timestamp': {
						type: 'date',
					},
					'appName': {
						type: 'text',
					},
					'body': {
						enabled: false,
						type: 'object',
					},
					'error': {
						properties: {
							code: {
								type: 'text',
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
						type: 'text',
					},
					'params': {
						enabled: false,
						type: 'object',
					},
					'path': {
						type: 'text',
					},
					'query': {
						enabled: false,
						type: 'object',
					},
					'route': {
						type: 'text',
					},
					'spec': {
						type: 'text',
					},
					'statusCode': {
						type: 'integer',
					},
					'took': {
						type: 'integer',
					},
					'version': {
						type: 'text',
					},
					...properties,
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
