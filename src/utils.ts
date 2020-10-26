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
						fields: {
							keyword: {
								type: 'keyword',
								ignore_above: 256,
							},
						},
					},
					'body': {
						enabled: false,
						type: 'object',
					},
					'error': {
						properties: {
							code: {
								type: 'text',
								fields: {
									keyword: {
										type: 'keyword',
										ignore_above: 256,
									},
								},
							},
							message: {
								type: 'text',
								fields: {
									keyword: {
										type: 'keyword',
										ignore_above: 256,
									},
								},
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
						fields: {
							keyword: {
								type: 'keyword',
								ignore_above: 256,
							},
						},
					},
					'params': {
						enabled: false,
						type: 'object',
					},
					'path': {
						type: 'text',
						fields: {
							keyword: {
								type: 'keyword',
								ignore_above: 256,
							},
						},
					},
					'query': {
						enabled: false,
						type: 'object',
					},
					'route': {
						type: 'text',
						fields: {
							keyword: {
								type: 'keyword',
								ignore_above: 256,
							},
						},
					},
					'spec': {
						type: 'text',
						fields: {
							keyword: {
								type: 'keyword',
								ignore_above: 256,
							},
						},
					},
					'statusCode': {
						type: 'integer',
					},
					'took': {
						type: 'integer',
					},
					'version': {
						type: 'text',
						fields: {
							keyword: {
								type: 'keyword',
								ignore_above: 256,
							},
						},
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
