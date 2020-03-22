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

function runQuery(type, res, conn, q) {
	conn.query(q, (error, results) => {
		if (error) {
			console.log("Error executing sql: ", error.message);
			return res.status(400).send('ERR_BAD_SQL');
		}
		if (results.length == 0) {
			console.log('No offtake found of user');
			return res.status(404).send('NO_OFFTAKE_FOUND');
		}

		if (type == 'dateRange')
			results.push({ "totalOfftake": totalOfftake });
		console.log('results: ', results);
		res.send(results);
	});
};
var totalOfftake = 0;
router.get('/:userId/:startDate/:endDate', async (req, res) => {
	var sd, ed, uid;
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
			conn.query(`SELECT SUM(money) as totalOfftake FROM offtake WHERE takingDate BETWEEN '${sd}' AND '${ed}' AND 
			reqBy = ${uid}`, (error, results) => {
				if (error) {
					console.log("Error executing sql: ", error.message);
					return res.status(400).send(error);
				}
				if (results[0].totalOfftake === null) {
					console.log('No offtake found of user');
					return res.status(404).send('NO_OFFTAKE_FOUND');
				}
				totalOfftake = results[0].totalOfftake;
				runQuery('dateRange', res, conn, `SELECT * FROM offtake WHERE takingDate BETWEEN '${sd}' AND '${ed}' AND 
				reqBy = ${uid} ORDER BY takingDate DESC`);
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

router.get('/:userId/:atDate', async (req, res) => {
	var ad, uid;
	uid = req.params.userId;
	ad = req.params.atDate;

	const objToValidate = {
		id: uid,
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
			runQuery('singleDate', res, conn, `SELECT * FROM offtake WHERE reqBy = ${uid} AND takingDate = '${ad}'`);
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
	var projectId, offtakeId, takingDate, money, userId;
	userId = req.params.userId;

	projectId = req.body.projectId;
	offtakeId = req.body.offtakeId;
	takingDate = req.body.takingDate;
	money = req.body.money;

	const objToValidate = {
		offtakeId: offtakeId,
		takingDate: takingDate,
		money: money,
		userId: userId,
		projectId: projectId
	}

	try {
		// authenticate user information first
		await authenticator('post_Offtake', objToValidate);

		pool.getConnection((err, conn) => {
			if (err) {
				console.log('Error connecting: ', err.stack);
				return res.status(400).send('ERR_CONN_DB');
			}

			const q = `INSERT INTO offtake VALUES(?, ?, ?, ?, ?);`;
			conn.query({
				sql: `INSERT INTO offtake VALUES(?, ?, ?, ?, ?);`,
				values: [offtakeId, takingDate, money, userId, projectId]
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
				console.log('Offtake posted');
				res.json(['DONE']);
			});
		});
	} catch (error) {
		if (error.message == 'ERR_WRONG_USER_INFO')
			return res.status(400).send(`ERR_WRONG_USER_INFO`);
		console.log(error);
		return res.status(400).send('UNXPD_ERROR');
	}
}); // post()

router.put('/:offtakeId', async (req, res) => {
	var projectId, offtakeId, takingDate, money, userId;
	offtakeId = req.params.offtakeId;

	userId = req.body.userId;
	takingDate = req.body.takingDate;
	projectId = req.body.projectId;
	money = req.body.money;

	const objToValidate = {
		offtakeId: offtakeId,
		takingDate: takingDate,
		money: money,
		userId: userId,
		projectId: projectId
	}

	try {
		// authenticate user information first
		await authenticator('post_Offtake', objToValidate);

		pool.getConnection((err, conn) => {
			if (err) {
				console.log('Error connecting: ', err.stack);
				return res.status(400).send('ERR_CONN_DB');
			}
			conn.query({
				sql: `UPDATE offtake SET takingDate = ?, atProject = ?, money = ?, reqBy = ? WHERE offtakeId = ?`,
				values: [takingDate, projectId, money, userId, offtakeId]
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
					console.log('Offtake does not exist');
					return res.status(404).send(`OFFTAKE_NOT_EXIST`);
				}
				console.log('Offtake update');
				res.json(['UPDATED']);
			});
			conn.release();
		});
	} catch (error) {
		if (error.message == 'ERR_WRONG_USER_INFO')
			return res.status(400).send(`ERR_WRONG_USER_INFO`);
		console.log(error);
		return res.status(400).send('UNXPD_ERROR');
	}
}); // put()

router.delete('/d/:offtakeId', (req, res) => {
	var offtakeId = req.params.offtakeId;
	try {
		// authenticate user information first
		if (offtakeId.length > 11) {
			console.log('Incorrect offtakeId : ', offtakeId);
			return res.status(400).send('ERR_WRONG_USER_INFO');
		}
		pool.getConnection((err, conn) => {
			if (err) {
				console.log('Error connecting: ', err.stack);
				return res.status(400).send('ERR_CONN_DB');
			}
			conn.query(`DELETE FROM offtake WHERE offtakeId = ?;`, offtakeId, (error, results) => {
				if (error) {
					console.log('Error executing sql: ', error.message);
					return res.status(400).send('ERR_BAD_SQL');
				}
				if (results.affectedRows == 0) {
					console.log('Offtake does not exist');
					return res.status(404).send('OFFTAKE_NOT_EXIST');
				}
				console.log('Offtake deleted');
				res.send('DELETED');
			});
		});
	} catch (error) {
		console.log(error);
		return res.status(400).send('ERROR');
	}
}); // delete()
module.exports = router;