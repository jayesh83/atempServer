'use strict';
const mysql = require('mysql');
const express = require('express');
const Joi = require('joi');
const authenticator = require('./learning1');
const router = express.Router();

const pool = mysql.createPool({ //create connection
	connectionLimit: 100,
	host: 'localhost',
	user: 'root',
	password: '8347@MySql',
	database: 'atempdb'
});
// long scoped varibles
var wg = 0, sd, ed;

function runQuery(type, res, conn, q) {
	conn.query(q, (error, results) => {
		if (error) {
			console.log("Error executing sql: ", error.message);
			return res.status(400).send('ERR_BAD_SQL');
		}
		if (type == 'singleDate') {
			if (results.length == 0) {
				console.log("No attendance found of user");
				return res.status(404).send(`NO_ATTENDANCE_FOUND`);
			}
		}
		if (type == 'dateRange') {
			if (results.length == 0 || results[0].att === null) {
				console.log("No attendance found of user");
				return res.status(404).send(`NO_ATTENDANCE_FOUND`);
			}
		}
		let totalAttendance = 0;
		for (let i = 0; i < results.length; i++) {
			totalAttendance += results[i].att;
			results[i].att *= wg;
		}
		if (type == 'dateRange') {
			var totalMoneyEarned = totalAttendance * (wg);
			results.push({ "totalMoneyEarned": totalMoneyEarned });
		}
		results.push({ "wage": wg });
		console.log('results: ', results);
		res.json(results);
	});
}

function runFirst(uid) {
	return new Promise((resolve, reject) => {
		pool.getConnection((err, conn) => {
			if (err)
				return reject('ERR_CONN_DB');
			conn.query(`SELECT wage FROM wage where userId = ${uid}`, (error, results) => {
				if (error)
					return reject('ERR_BAD_SQL');
				resolve(results);
			});
		});
	})
}

router.get('/:userId/:startDate/:endDate', async (req, res) => {
	const uid = req.params.userId;
	sd = req.params.startDate;
	ed = req.params.endDate;
	//validate user
	const objToValidate = {
		id: uid,
		sd: sd,
		ed: ed,
	}

	try {
		await authenticator('id_sd_ed', objToValidate);
		let wgResults = await runFirst(uid);

		if (wgResults.length == 0) {
			console.log('user does not exist...');
			return res.status(404).send('USER_NOT_EXIST');
		}

		if (wgResults[0].wage === null) {
			console.log('No wage defined...');
			return res.status(404).send('NO_WAGE_DEFINED');
		}

		wg = wgResults[0].wage;
		pool.getConnection((err, conn) => {
			if (err) {
				console.log('Error connecting DB: ', err.stack);
				return res.status(400).send('ERR_CONN_DB');
			}

			runQuery('dateRange', res, conn, `SELECT SUM(attendance.att) AS att, attendance.atProject, project.name FROM attendance INNER JOIN project ON attendance.atProject = project.projectId WHERE 
			attendance.userId = ${uid} AND attendance.date BETWEEN '${sd}' AND  '${ed}' GROUP BY attendance.atProject`);
		}); // getConnection
	} catch (error) {
		console.log(error);
		switch (error.message) {
			case 'ERR_WRONG_USER_INFO':
				res.status(400).send(`ERR_WRONG_USER_INFO`); break;
			case 'ERR_CONN_DB':
				res.status(400).send(`ERR_CONN_DB`); break;
			case 'ERR_BAD_SQL':
				res.status(400).send(`ERR_BAD_SQL`); break;
			default:
				res.status(400).send('Error'); break;
		}
	}
});

router.get('/:userId/:atDate', async (req, res) => {
	const ad = req.params.atDate, uid = req.params.userId;
	const objToValidate = {
		id: uid,
		ad: ad,
	}

	try {
		await authenticator('id_ad', objToValidate);
		let wgResults = await runFirst(uid);

		if (wgResults.length == 0) {
			console.log('user does not exist...');
			return res.status(404).send('USER_NOT_EXIST');
		}

		if (wgResults[0].wage === null) {
			console.log('No wage defined...');
			return res.status(404).send('NO_WAGE_DEFINED');
		}

		wg = wgResults[0].wage;
		pool.getConnection((err, conn) => {
			if (err) {
				console.log('Error connecting DB: ', err.stack);
				return res.status(400).send('ERR_CONN_DB');
			}
			runQuery('singleDate', res, conn, `SELECT attendance.att, attendance.atProject, project.name FROM attendance INNER JOIN project ON attendance.atProject = project.projectId WHERE 
					attendance.userId = ${uid} AND attendance.date = '${ad}'`);
		}); // getConnection
	} catch (error) {
		console.log(error);
		switch (error.message) {
			case 'ERR_WRONG_USER_INFO':
				res.status(400).send(`ERR_WRONG_USER_INFO`); break;
			case 'ERR_CONN_DB':
				res.status(400).send(`ERR_CONN_DB`); break;
			case 'ERR_BAD_SQL':
				res.status(400).send(`ERR_BAD_SQL`); break;
			default:
				res.status(400).send('Error'); break;
		}
	}
});
module.exports = router;