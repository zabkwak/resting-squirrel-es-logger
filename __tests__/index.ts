import { Client } from '@elastic/elasticsearch';
import { expect } from 'chai';
import * as fs from 'fs';
import * as moment from 'moment';
import * as path from 'path';
import rs, { Application, Error, Field, Param, Type } from 'resting-squirrel';
import RSConnector from 'resting-squirrel-connector';

import logger from '../src';

const TEMPLATE_NAME = 'dev_rs-logger';
const APP_NAME = 'RS Logger Test App';
const DEFAULT_HEADERS = {
	'accept': 'application/json',
	'accept-encoding': 'gzip, deflate',
	'connection': 'close',
	'host': 'localhost:8080',
};
const CUSTOM_DATA = {
	userId: {
		type: 'integer',
	},
};

const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, './config.json')).toString());
const pkg = JSON.parse(fs.readFileSync(path.resolve('./package.json')).toString());

const index = `${TEMPLATE_NAME}*`;

const client = new Client({ node: config.node });

const Api = RSConnector({ url: 'http://localhost:8080' });


let app: Application;

const wait = (duration: number = 500): Promise<void> => {
	return new Promise((resolve) => {
		setTimeout(resolve, duration);
	});
};

const validateRecord = async (
	statusCode: number,
	method: string,
	path: string,
	spec: string,
	took: number,
	body: { [key: string]: any } = {},
	query: { [key: string]: any } = {},
	params: { [key: string]: any } = {},
	error: { [key: string]: any } = null,
	headers: { [key: string]: any } = {},
	customData: { [key: string]: any } = {},
) => {
	await wait();
	await client.indices.refresh({ index });
	const r = await client.search({
		body: {
			sort: {
				'@timestamp': 'desc',
			},
		},
		index,
		size: 1,
	});
	const encodedBody = JSON.stringify(body);
	let autoHeaders: { [key: string]: any } = {};
	// For some reason the body is not empty in the DELETE method on the connector level
	if (encodedBody.length > 2 || method === 'DELETE') {
		autoHeaders = {
			'content-length': encodedBody.length.toString(),
			'content-type': 'application/json',
		};
	}
	const { hits } = r.body;
	expect(hits.hits.length).to.be.equal(1);
	const [hit] = hits.hits;
	const { _source: record, _index } = hit;
	expect(_index).to.be.equal(`${TEMPLATE_NAME}-${moment().format('YYYY-MM-DD')}`);
	const keys = [
		'@timestamp',
		'appName',
		'body',
		'error',
		'headers',
		'method',
		'params',
		'path',
		'query',
		'route',
		'spec',
		'statusCode',
		'took',
		'version',
	];
	const rest: { [key: string]: any } = {};
	Object.keys(record).forEach((key) => {
		if (keys.includes(key)) {
			return;
		}
		rest[key] = record[key];
	});
	expect(record).to.have.all.keys([
		...keys,
		...Object.keys(CUSTOM_DATA),
	]);
	expect(record.appName).to.be.equal(APP_NAME);
	expect(record.body).to.be.deep.equal(body);
	expect(record.error).to.be.deep.equal(error);
	expect(record.headers).to.be.deep.equal({
		...DEFAULT_HEADERS,
		...autoHeaders,
		...headers,
	});
	expect(record.method).to.be.equal(method);
	expect(record.params).to.be.deep.equal(params);
	expect(record.path).to.be.equal(path);
	expect(record.query).to.be.deep.equal(query);
	expect(record.route).to.be.equal(`${method} ${spec}`);
	expect(record.spec).to.be.equal(spec);
	expect(record.statusCode).to.be.equal(statusCode);
	if (statusCode !== 204) {
		expect(record.took).to.be.equal(took);
	}
	expect(record.version).to.be.equal(pkg.version);
	expect(rest).to.be.deep.equal({
		userId: null,
		...customData,
	});
};

describe('ES Logger', () => {

	it('clears the ES index', async () => {
		if ((await client.indices.exists({ index })).body) {
			await client.indices.delete({ index });
		}
	});

	it('starts the server', (done) => {
		const a: string[] = [];
		const next = async (key: string) => {
			a.push(key);
			if (a.length === 2) {
				// tslint:disable-next-line: no-unused-expression
				expect((await client.indices.existsTemplate({ name: TEMPLATE_NAME })).body).to.be.true;
				done();
			}
		};
		app = rs({
			logger: logger({
				appName: APP_NAME,
				clearTemplate: true,
				getCustomData(property, { response }) {
					switch (property) {
						case 'userId':
							return response?.data?.userId || null;
						default:
							return null;
					}
				},
				node: config.node,
				onReady: () => next('logger'),
				template: {
					name: TEMPLATE_NAME,
					properties: CUSTOM_DATA,
				},
				transformQuery(property, value) {
					switch (property) {
						case 'transform':
							return 'baf';
						default:
							return value;
					}
				},
				transformBody(property, value) {
					switch (property) {
						case 'password':
							return '********';
						default:
							return value;
					}
				},
			}),
		});
		app.get(0, '/test', {
			params: [
				new Param('transform', false, Type.string),
				new Param('test', false, Type.string),
			],
		}, async () => {
			return { data: true };
		});
		app.post(0, '/auth', {
			params: [
				new Param('email', true, Type.string),
				new Param('password', true, Type.string),
			],
		}, async () => {
			return { data: true };
		});
		app.get(0, '/user/:id', {
			args: [
				new Field('id', Type.integer),
			],
		}, async ({ params }) => {
			return { data: true, userId: params.id };
		});
		app.delete(0, '/user/:id', {
			args: [
				new Field('id', Type.integer),
			],
			response: null,
		}, async () => {
			return null;
		});
		app.start((err) => {
			// tslint:disable-next-line: no-unused-expression
			expect(err).to.be.undefined;
			next('ready');
		});
	});

	it('calls the test endpoint', async () => {
		const r = await new (Api.v(0)).Request()
			.get('/test')
			.execute();
		expect(r.statusCode).to.be.equal(200);
		await validateRecord(
			r.statusCode,
			'GET',
			'/0/test',
			'/0/test',
			r.meta.took,
		);
	});

	it('calls the test endpoint with query param', async () => {
		const r = await new (Api.v(0)).Request()
			.get('/test')
			.setParams({ test: 'test', transform: 'transform' })
			.execute();
		expect(r.statusCode).to.be.equal(200);
		await validateRecord(
			r.statusCode,
			'GET',
			'/0/test',
			'/0/test',
			r.meta.took,
			{},
			{ test: 'test', transform: 'baf' },
		);
	});

	it('calls the non-existing endpoint', async () => {
		try {
			await new (Api.v(0)).Request()
				.get('/non-existing')
				.setParams({ test: 'test', transform: 'transform' })
				.execute();
			throw new Error('Promise fulfilled.', 'promise_fulfilled');
		} catch (e) {
			if (e.code === 'ERR_PROMISE_FULFILLED') {
				throw e;
			}
			expect(e.statusCode).to.be.equal(404);
			await validateRecord(
				e.statusCode,
				'GET',
				'/0/non-existing',
				'/0/non-existing',
				e.meta.took,
				{},
				{ test: 'test', transform: 'baf' },
				{},
				{
					code: 'ERR_PAGE_NOT_FOUND',
					message: 'Page not found',
					payload: {},
				},
			);

		}
	});

	it('calls the auth endpoint without password', async () => {
		const params = { email: 'test@test.com' };
		try {
			await new (Api.v(0)).Request()
				.post('/auth')
				.setParams(params)
				.execute();
			throw new Error('Promise fulfilled.', 'promise_fulfilled');
		} catch (e) {
			if (e.code === 'ERR_PROMISE_FULFILLED') {
				throw e;
			}
			expect(e.statusCode).to.be.equal(400);
			await validateRecord(
				e.statusCode,
				'POST',
				'/0/auth',
				'/0/auth',
				e.meta.took,
				params,
				{},
				{},
				{
					code: 'ERR_MISSING_PARAMETER',
					message: 'Parameter \'password\' is missing.',
					payload: {},
				},
			);
		}
	});

	it('calls the auth endpoint', async () => {
		const params = { email: 'test@test.com', password: 'password' };
		const r = await new (Api.v(0)).Request()
			.post('/auth')
			.setParams(params)
			.execute();
		expect(r.statusCode).to.be.equal(200);
		await validateRecord(
			r.statusCode,
			'POST',
			'/0/auth',
			'/0/auth',
			r.meta.took,
			{ email: 'test@test.com', password: '********' },
		);
	});

	it('calls the user endpoint', async () => {
		const r = await new (Api.v(0)).Request()
			.get('/user/:id')
			.setArguments({ id: 1 })
			.execute();
		expect(r.statusCode).to.be.equal(200);
		await validateRecord(
			r.statusCode,
			'GET',
			'/0/user/1',
			'/0/user/:id',
			r.meta.took,
			{},
			{},
			{ id: 1 },
			null,
			{},
			{ userId: 1 },
		);
	});

	it('calls the delete user endpoint', async () => {
		const r = await new (Api.v(0)).Request()
			.delete('/user/:id')
			.setArguments({ id: 1 })
			.execute();
		expect(r.statusCode).to.be.equal(204);
		await validateRecord(
			r.statusCode,
			'DELETE',
			'/0/user/1',
			'/0/user/:id',
			null,
			{},
			{},
			{ id: 1 },
		);
	});

	it('stops the server', (done) => app.stop(done));
});
