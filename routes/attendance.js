'use strict';
const msql = require('mysql');
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const authenticator = require('./learning1');

const pool = msql.createPool({ //create connection
	connectionLimit: 100,
	multipleStatements: true,
	host: 'localhost',
	user: 'root',
	password: '8347@MySql',
	database: 'atempdb'
});
var wg = 0;
function runQuery(type, res, conn, query) {
	conn.query(query, (error, results) => {
		if (error) {
			console.log("Error executing sql: ", error.sqlMessage);
			return res.status(400).send('ERROR');
		}
		if (results.length == 0 && results === null) {
			console.log("No attendance found of user");
			return res.status(404).send(`NO_ATTENDANCE_FOUND`);
		}

		if (type == 'dateRange') {
			var tatt = 0;
			for (let i = 0; i < results.length; i++)
				tatt += results[i].totalAtt;
			results.push({ "totalAttendance": tatt });
		}
		if (type == 'dateRangeWithProject') {
			for (let i = 0; i < results.length; i++) // here date coming is DateTime and we want only date
				results[i].date = new Date(results[i].date).toLocaleDateString();
		}
		if (type != 'dateRangeWithProject')
			results.push({ "wage": wg });
		console.log('results: ', results);
		res.send(results);
	});
};

function getWage(userId, conn) {
	return new Promise((resolve, reject) => {
		conn.query(`SELECT wage FROM wage WHERE userId = ${userId}`, (error, results) => {
			if (error) {
				console.log('Error executing sql: ', error.sqlMessage);
				reject(error.sqlMessage);
			}
			else resolve(results); // null if not exist, [{wage: null}] if set to NULL in DB
		});
	});
}

router.get('/:userId/:startDate/:endDate', async (req, res) => {
	var sd, ed, uid;
	uid = req.params.userId;
	sd = req.params.startDate;
	ed = req.params.endDate;
	// checking user input
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
			getWage(uid, conn)
				.then(result => {
					if (result.length > 0 && result !== null) {
						if (result[0].wage !== null) {
							wg = result[0].wage;
							return runQuery('dateRange', res, conn, `SELECT project.name, project.projectId, SUM(attendance.att) as totalAtt FROM attendance LEFT JOIN project ON attendance.atProject = project.projectId WHERE attendance.userId = ${uid} AND  attendance.date BETWEEN '${sd}' AND '${ed}' GROUP BY project.projectId`);
						}
						console.log('Wage not defined');
						return res.status(400).send('WAGE_NOT_DEFINED')
					} else {
						console.log('User not exist');
						return res.status(400).send('USER_NOT_EXIST');
					}
				}).catch(error => {
					console.log(error);
					res.status(400).send(`ERROR`);
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

router.get('/:userId/:startDate/:endDate/:atProject', async (req, res) => {
	var sd, ed, uid, atp;
	atp = req.params.atProject;
	uid = req.params.userId;
	sd = req.params.startDate;
	ed = req.params.endDate;

	const objToValidate = {
		id: uid,
		sd: sd,
		ed: ed,
		ap: atp,
	}
	try {
		// authenticate user information first
		await authenticator('id_sd_ed_ap', objToValidate);

		pool.getConnection((err, conn) => {
			if (err) {
				console.log('Error connecting: ', err.stack);
				return res.status(400).send('ERR_CONN_DB');
			}
			runQuery('dateRangeWithProject', res, conn, `SELECT date, att as totalAtt FROM attendance WHERE userId = ${uid} AND  date BETWEEN '${sd}' AND '${ed}' AND atProject = '${atp}'`);
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
			getWage(uid, conn)
				.then(result => {
					if (result.length > 0 && result !== null) {
						if (result[0].wage !== null) {
							wg = result[0].wage;
							return runQuery('singleDate', res, conn, `SELECT project.name, project.projectId, attendance.att FROM attendance LEFT JOIN project ON project.projectId = attendance.atProject WHERE attendance.userId = ${uid} AND attendance.date = '${ad}'`);
						}
						console.log('Wage not defined');
						return res.status(400).send('WAGE_NOT_DEFINED')
					} else {
						console.log('User not exist');
						return res.status(400).send('USER_NOT_EXIST');
					}
				}).catch(error => {
					console.log(error);
					res.status(400).send('ERROR');
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
router.post('/p/:userId', async (req, res) => {
	const objToValidate = {
		id: req.params.userId,
		att: req.body.attendance,
		date: req.body.date,
		ap: req.body.atProject
	}

	try {
		// authenticate user information first
		await authenticator('id_att_date_ap', objToValidate);

		pool.getConnection((err, conn) => {
			if (err) {
				console.log('Error connecting: ', err.stack);
				return res.status(400).send('ERR_CONN_DB');
			}

			const q = `INSERT INTO attendance VALUES(${req.params.userId}, '${req.body.date}', ${req.body.attendance}, '${req.body.atProject}');`;
			conn.query(q, (error, results) => {
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
				console.log('Attendance posted');
				res.json(['DONE']);
			});
		});
	} catch (error) {
		if (error.message == 'ERR_WRONG_USER_INFO')
			return res.status(400).send(`ERR_WRONG_USER_INFO`);
		console.log(error);
		return res.status(400).send('UNXPD_ERROR');
	}
});

router.put('/:userId/:atDate', async (req, res) => {
	const objToValidate = {
		id: req.params.userId,
		att: req.body.attendance,
		date: req.body.date,
		ap: req.body.atProject
	}

	try {
		// authenticate user information first
		await authenticator('id_att_date_ap', objToValidate);

		pool.getConnection((err, conn) => {
			if (err) {
				console.log('Error connecting: ', err.stack);
				return res.status(400).send('ERR_CONN_DB');
			}

			const q = `UPDATE attendance SET att = ${req.body.attendance}, atProject = '${req.body.atProject}' WHERE date = '${req.params.atDate}' AND userId =${req.params.userId}`;
			conn.query(q, (error, results) => {
				if (error) {
					if (error.code == 'ER_DUP_ENTRY') {
						console.log('Duplicate - entry already exist');
						return res.status(400).send('ER_DUP_ENTRY');
					}
					console.log("Error executing sql: ", error.message);
					return res.status(400).send('ERR_BAD_SQL');
				}
				if (results.affectedRows == 0) {
					console.log('Attendance not exist');
					return res.status(404).send(`ATTENDANCE_NOT_EXIST`);
				}
				console.log('Attendance Updated');
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

router.delete('/d/:userId/:atDate', async (req, res) => {
	var userId = req.params.userId;
	var atDate = req.params.atDate;

	const objToValidate = {
		id: userId,
		ad: atDate
	}

	try {
		// authenticate user information first
		await authenticator('id_ad', objToValidate);

		pool.getConnection((err, conn) => {
			if (err) {
				console.log('Error connecting: ', err.stack);
				return res.status(400).send('ERR_CONN_DB');
			}
			conn.query(`DELETE FROM attendance WHERE userId = ${userId} AND date = '${atDate}';`, (error, results) => {
				if (error) {
					console.log('Error executing sql: ', error.message);
					return res.status(400).send('ERR_BAD_SQL');
				}
				if (results.affectedRows == 0) {
					console.log(`Attendance not exist`);
					return res.status(404).send('ATTENDANCE_NOT_EXIST');
				}
				console.log('Attendance deleted');
				res.json(['DELETED']);
			});
		});
	} catch (error) {
		if (error.message == 'ERR_WRONG_USER_INFO')
			return res.status(400).send(`ERR_WRONG_USER_INFO`);
		console.log(error);
		return res.status(400).send('UNXPD_ERROR');
	}
}); // delete()

module.exports = router;