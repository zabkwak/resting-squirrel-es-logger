import { Client } from '@elastic/elasticsearch';
import * as fs from 'fs';
import * as moment from 'moment';
import * as path from 'path';
import { HttpError, IAppOptions } from 'resting-squirrel';
import { getTemplate } from './utils';

const pkg = JSON.parse(fs.readFileSync(path.resolve('./package.json')).toString());

export interface IOptions {
	node: string;
	template: Partial<{
		name: string;
		numberOfShards: number;
		numberOfReplicas: number;
		properties: { [key: string]: any };
	}>;
	indexTimeFormat: string;
	getCustomData: (property: string, loggerData: ILoggerOptions) => any;
	transformBody: (property: string, value: any) => any;
	transformQuery: (property: string, value: any) => any;
	onError: (error: any) => void;
	onReady: () => void;
	clearTemplate: boolean;
	appName: string;
}

interface ILoggerOptions {
	statusCode: number;
	method: string;
	path: string;
	spec: string;
	body: {
		[key: string]: any;
	};
	params: {
		[key: string]: any;
	};
	query: {
		[key: string]: any;
	};
	headers: {
		[key: string]: any;
	};
	took: number;
	response: {
		data?: any;
		error?: HttpError;
		_meta?: any;
	};
}

const DEFAULT_OPTIONS: IOptions = {
	appName: 'RS App',
	clearTemplate: false,
	getCustomData: null,
	indexTimeFormat: 'YYYY-MM-DD',
	node: 'http://localhost:9200',
	onError: null,
	onReady: null,
	template: {
		name: 'rs-es-logger',
		numberOfReplicas: 0,
		numberOfShards: 1,
		properties: {},
	},
	transformBody: null,
	transformQuery: null,
};

class Logger {

	private _options: IOptions;

	private _client: Client;

	constructor(options: Partial<IOptions> = {}) {
		this._options = {
			...DEFAULT_OPTIONS,
			...options,
			template: {
				...DEFAULT_OPTIONS.template,
				...options.template,
			},
		};
		this._client = new Client({ node: this._options.node });
	}

	public async log(data: ILoggerOptions): Promise<void> {
		const { template, indexTimeFormat, transformBody, transformQuery, appName, getCustomData } = this._options;
		const { statusCode, method, path, spec, body, params, query, headers, took, response } = data;
		const version: string = pkg.version;
		const index = `${template.name}-${moment().format(indexTimeFormat)}`;
		let error: any = null;
		if (response?.error) {
			error = {
				code: response.error.code,
				message: response.error.message,
				payload: HttpError.parsePayload(response.error),
			};
		}
		const b = { ...body };
		const q = { ...query };
		const customData: { [key: string]: any } = {};
		if (typeof transformBody === 'function') {
			Object.keys(b).forEach((key) => {
				b[key] = transformBody(key, b[key]);
			});
		}
		if (typeof transformQuery === 'function') {
			Object.keys(q).forEach((key) => {
				q[key] = transformQuery(key, q[key]);
			});
		}
		Object.keys(template.properties).forEach((key) => {
			customData[key] = typeof getCustomData === 'function' ? getCustomData(key, data) : null;
		});
		try {
			await this._client.index({
				body: {
					'@timestamp': new Date(),
					appName,
					'body': b,
					error,
					headers,
					'method': method.toUpperCase(),
					params,
					path,
					'query': q,
					'route': `${method.toUpperCase()} ${spec}`,
					spec,
					statusCode,
					took,
					version,
					...customData,
				},
				index,
			});
		} catch (e) {
			this._error(e);
		}
	}

	public async init(): Promise<void> {
		const { template, clearTemplate, onReady } = this._options;
		try {
			if ((await this._client.indices.existsTemplate({ name: template.name })).body) {
				if (!clearTemplate) {
					return;
				}
				await this._client.indices.deleteTemplate({
					name: template.name,
				});
			}
			await this._client.indices.putTemplate(
				getTemplate(
					template.name,
					template.numberOfShards,
					template.numberOfReplicas,
					template.properties,
				),
			);
		} catch (e) {
			this._error(e);
		}
		if (typeof onReady === 'function') {
			onReady();
		}
	}

	private _error(e: any): void {
		const { onError } = this._options;
		if (typeof onError === 'function') {
			onError(e);
		}

	}
}

export default (options: Partial<IOptions> = {}): IAppOptions['logger'] => {
	const logger = new Logger(options);
	logger.init();
	return (opt) => logger.log(opt);
};
