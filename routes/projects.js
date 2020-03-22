'use strict';
const msql = require('mysql');
const express = require('express');
const router = express.Router();
const authenticator = require('./learning1');

const pool = msql.createPool({ //create connection
	connectionLimit: 100,
	host: 'localhost',
	user: 'root',
	password: '8347@MySql',
	database: 'atempdb'
});

function runQuery(type, res, conn, query) {
	conn.query(query, (error, results) => {
		if (error) {
			console.log("Error executing sql: ", error.message);
			return res.status(400).send('ERR_BAD_SQL');
		}
		if (results.length == 0 && results !== null) {
			console.log('No projects found');
			return res.status(404).send('NO_PROJECT_FOUND');
		}
		if (type == 'dateRange')
			results.push({ "totalProjects: ": results.length });
		console.log('results: ', results);
		res.json(results);
	});
};
router.get('/:userId/:startDate/:endDate', async (req, res) => {
	let sd, ed, uid;
	uid = req.params.userId;
	sd = req.params.startDate;
	ed = req.params.endDate;
	const objToValidate = {
		id: uid,
		sd: sd,
		ed: ed,
	}

	try {
		// authenticate user information first
		await authenticator('id_sd_ed', objToValidate);

		pool.getConnection((err, conn) => {
			if (err) {
				console.log('Error connecting: ', err.stack);
				return res.status(400).send('ERR_CONN_DB');
			}
			runQuery('dateRange', res, conn, `SELECT * FROM project WHERE userId = ${uid} AND startDate BETWEEN '${sd}' AND '${ed}'`);
			conn.release();
		});
	} catch (error) {
		if (error.message == 'ERR_WRONG_USER_INFO')
			return res.status(400).send(`ERR_WRONG_USER_INFO`);
		console.log(error);
		return res.status(400).send('UNXPD_ERROR');
	}
});

router.get('/:userId/:atDate', async (req, res) => {
	var uid, ad;
	uid = req.params.userId;
	ad = req.params.atDate;
	const objToValidate = {
		id: req.params.userId,
		ad: ad
	}
	try {
		// authenticate user information first
		await authenticator('id_ad', objToValidate);

		pool.getConnection((err, conn) => {
			if (err) {
				console.log('Error connecting: ', err.stack);
				return res.status(400).send('ERR_CONN_DB');
			}
			runQuery('singleDate', res, conn, `SELECT * FROM project WHERE userId = ${uid} AND startDate = '${ad}'`);
			conn.release();
		});
	} catch (error) {
		if (error.message == 'ERR_WRONG_USER_INFO')
			return res.status(400).send(`ERR_WRONG_USER_INFO`);
		console.log(error);
		return res.status(400).send('UNXPD_ERROR');
	}
});

router.post('/:userId', async (req, res) => {
	var projectId, name, startDate, endDate, budget, userId, currentStatus,
		pincode, city, state, area, landmark;
	userId = req.params.userId;

	projectId = req.body.projectId;
	name = req.body.name;
	startDate = req.body.startDate;
	endDate = req.body.endDate;
	budget = req.body.budget;
	currentStatus = req.body.currentStatus;
	pincode = req.body.pincode;
	city = req.body.city;
	state = req.body.state;
	area = req.body.area;
	landmark = req.body.landmark;

	const objToValidate = {
		userId: userId,
		projectId: projectId,
		startDate: startDate,
		endDate: endDate,
		name: name,
		budget: budget,
		currentStatus: currentStatus,
		pincode: pincode,
		city: city,
		state: state,
		area: area,
		landmark: landmark
	}

	try {
		// authenticate user information first
		await authenticator('post_Project', objToValidate);

		pool.getConnection((err, conn) => {
			if (err) {
				console.log('Error connecting: ', err.stack);
				return res.status(400).send('ERR_CONN_DB');
			}
			conn.query({
				sql: `INSERT INTO project values(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
				values: [projectId, name, startDate, endDate, budget, userId, currentStatus, pincode, city, state, area, landmark]
			}, (error, results) => {
				if (error) {
					if (error.code == 'ER_DUP_ENTRY') {
						console.log('Duplicate - entry already exist');
						return res.status(400).send('ER_DUP_ENTRY');
					}
					console.log("Error executing sql: ", error.message);
					return res.status(400).send('ERR_BAD_SQL');
				}
				if (results.affectedRows == 0) {
					console.log('Something went wrong - ', results);
					return res.status(400).send('NOT INSERTED');
				}
				console.log('Project posted');
				res.json(['DONE']);
			});
			conn.release();
		});
	} catch (error) {
		if (error.message == 'ERR_WRONG_USER_INFO')
			return res.status(400).send(`ERR_WRONG_USER_INFO`);
		console.log(error);
		return res.status(400).send('UNXPD_ERROR');
	}
});

router.put('/:projectId', async (req, res) => {
	var projectId, name, startDate, endDate, budget, userId, currentStatus,
		pincode, city, state, area, landmark;
	projectId = req.params.projectId;

	userId = req.body.userId;
	name = req.body.name;
	startDate = req.body.startDate;
	endDate = req.body.endDate;
	budget = req.body.budget;
	currentStatus = req.body.currentStatus;
	pincode = req.body.pincode;
	city = req.body.city;
	state = req.body.state;
	area = req.body.area;
	landmark = req.body.landmark;

	const objToValidate = {
		userId: userId,
		projectId: projectId,
		startDate: startDate,
		endDate: endDate,
		name: name,
		budget: budget,
		currentStatus: currentStatus,
		pincode: pincode,
		city: city,
		state: state,
		area: area,
		landmark: landmark
	}

	try {
		// authenticate user information first
		await authenticator('post_Project', objToValidate);

		pool.getConnection((err, conn) => {
			if (err) {
				console.log('Error connecting: ', err.stack);
				return res.status(400).send('ERR_CONN_DB');
			}

			conn.query({
				sql: `UPDATE project SET name = ?, startDate = ?, endDate = ?, budget = ?, userId = ?, currentStatus = ?, pincode = ?, city = ?, state = ?, area = ?, landmark = ? WHERE projectId = ?;`,
				values: [name, startDate, endDate, budget, userId, currentStatus, pincode, city, state, area, landmark, projectId]
			}, (error, results) => {
				if (error) {
					if (error.code == 'ER_DUP_ENTRY') {
						console.log('Duplicate - entry already exist');
						return res.status(400).send('ER_DUP_ENTRY');
					}
					console.log("Error executing sql: ", error.message);
					return res.status(400).send('ERR_BAD_SQL');
				}
				if (results.affectedRows == 0 && results.changedRows == 0) {
					console.log('Project does not exist');
					return res.status(404).send(`PROJECT_NOT_EXIST`);
				}
				console.log('Project updated');
				res.send('UPDATED');
			});
			conn.release();
		});
	} catch (error) {
		if (error.message == 'ERR_WRONG_USER_INFO')
			return res.status(400).send(`ERR_WRONG_USER_INFO`);
		console.log(error);
		return res.status(400).send('UNXPD_ERROR');
	}
});

router.delete('/d/:projectId', (req, res) => {
	var projectId = req.params.projectId;

	try {
		// authenticate user information first
		if (projectId.length > 11 || typeof projectId !== 'string') {
			console.log('Incorrect projectId : ', projectId);
			return res.status(400).send('ERR_WRONG_USER_INFO');
		}

		pool.getConnection((err, conn) => {
			if (err) {
				console.log('Error connecting: ', err.stack);
				return res.status(400).send('ERR_CONN_DB');
			}
			conn.query(`DELETE FROM project WHERE projectId = ?;`, projectId, (error, results) => {
				if (error) {
					console.log('Error executing sql: ', error.message);
					return res.status(400).send('ERR_BAD_SQL');
				}
				if (results.affectedRows == 0) {
					console.log(`Project not exist`);
					return res.status(404).send('PROJECT_NOT_EXIST');
				}
				console.log('Project deleted');
				res.send('DELETED');
			});
			conn.release();
		})
	} catch (error) {
		console.log(error);
		return res.status(400).send('UNXPD_ERROR');
	}
}); // delete()

module.exports = router;