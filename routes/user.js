'use strict';
const msql = require('mysql');
const moment = require('moment');
const express = require('express');
const router = express.Router();
const Joi = require('joi');

const pool = msql.createPool({ //create connection
	connectionLimit: 100,
	multipleStatements: true,
	host: 'localhost',
	user: 'root',
	password: '8347@MySql',
	database: 'atempdb'
});

/* getURL() function should be implemented to create URL in android, in order to get multiple 
   user's information 
*/

// let ar = [7984431019, 9998736590, 9998732310, 9558184632];
// function getURL(arrayOfIds) {
// NOTE: query strings are not the part of url 
/*
	means 
	if path: http://localhost:3000/learning
	url : http://localhost:3000/learning?totalid=12
*/
//     var baseURL = 'http://localhost:3000/learning?totalid=';
//     baseURL = baseURL + arrayOfIds.length;
//     for (var i = 0; i < arrayOfIds.length; i++) {
//         baseURL += '&u' + (i) + '=' + arrayOfIds[i];
//     }
//     console.log(baseURL);
// }

// in this route i'm supposed to pass query string, which is not the part of URL...
router.get('/gu/', (req, res) => {
	let userIds = [];
	try {
		let totalIds = req.query.totalid;
		let url = req.query;
		for (let key in url) {
			if (url.hasOwnProperty(key))
				userIds.push(parseInt(url[key]));
		}
		userIds.shift();
		console.log('totalIds: ', totalIds);
		console.log('ids: ', userIds);
	} catch (error) {
		console.log('Something went wrong...', error);
		return res.send(error);
	}
	pool.getConnection((err, conn) => {
		if (err) {
			console.log('Error connecting: ', err.stack);
			return res.send(err);
		}
		conn.query(`SELECT * FROM user WHERE userId IN (${userIds});`, (error, results) => {
			if (error) {
				console.log('Error executing sql : ', error.message);
				return res.send(error);
			}
			if (results.length == 0) {
				console.log('User not exist...');
				return res.status(404).send('USER_NOT_EXIST');
			}
			res.send(results);
			conn.release();
		});
	}); //getConnection()
}); //get()

router.get('/gu/:userId', (req, res) => {
	var userId = req.params.userId;
	if (userId > 9999999999 || isNaN(userId)) {
		console.log('Incorrect userId : ', userId);
		return res.send('Incorrect userId');
	}
	pool.getConnection((err, conn) => {
		if (err) {
			console.log('Error connecting: ', err.stack);
			return res.send(err);
		}
		conn.query(`SELECT * FROM user WHERE userId = ${userId};`, (error, results) => {
			if (error) {
				console.log('Error executing sql : ', error.message);
				return res.send(error);
			}
			if (results.length == 0) {
				console.log('User not exist...');
				return res.status(404).send('USER_NOT_EXIST');
			}
			res.send(results);
			conn.release();
		});
	}); //getConnection()
}); //get()

// userId is the phone1
router.post('/ru/:userId', (req, res) => {
	var userId, fname, type, dob, sex, mname, lname, salary, phone2, password, cls;  // cls - current login status
	userId = req.params.userId;

	dob = req.body.dob;
	fname = req.body.fname;
	mname = req.body.mname;
	lname = req.body.lname;
	salary = req.body.salary;
	phone2 = req.body.phone2;
	password = req.body.password;
	type = req.body.type;
	sex = req.body.sex;
	cls = req.body.cls;
	var objToValidate = {
		userId: userId,
		fname: fname,
		mname: mname,
		lname: lname,
		dob: dob,
		salary: salary,
		phone2: phone2,
		password: password
	}
	console.log("Object passed", objToValidate);
	// validating user info
	// one character cannot be validated through Joi that's why not validating...
	const Schema = Joi.object().keys({
		userId: Joi.number().integer().max(9999999999).required(),
		fname: Joi.string().min(3).max(50).required(),
		mname: Joi.string().min(3).max(50).allow(null, ''),
		lname: Joi.string().min(3).max(50).allow(null, ''),
		dob: Joi.date().min('01-01-1920').iso(),
		salary: Joi.number().integer().min(0).max(999999999).allow(null, ''),
		phone2: Joi.number().integer().max(9999999999).allow(null, ''),
		password: Joi.string().min(6).max(20).required(),
	});

	const validatedObj = Joi.validate(objToValidate, Schema);
	if (validatedObj.error == null)
		console.log("Checking user info : Ok");
	else {
		console.log("wrong user info : ", validatedObj.error.details);
		return res.send(validatedObj.error.details);
	}

	pool.getConnection((err, conn) => {
		if (err) {
			console.log('Error connecting: ', err.stack);
			return res.send(err);
		}
		conn.query({
			sql: `INSERT INTO user values(? , ?, ? , ?, ? , ?, ?, ?, ?);INSERT INTO user_auth(userId, password, type, cls) values(?, ?, ?, ?)`,
			values: [userId, fname, mname, lname, type, dob, sex, salary, phone2, userId, password, type, cls]
		}, (error, results) => {
			if (error) {
				console.log("Error executing sql: ", error.message);
				return res.send(error);
			}
			console.log('results: ', results);
			res.send('Done');
			conn.release();
		});
	}); // getConnection()
});

router.delete('/du/:userId', (req, res) => {
	var userId = req.params.userId;
	if (userId > 9999999999 || isNaN(userId)) {
		console.log('Incorrect userId : ', userId);
		return res.send('Incorrect userId');
	}
	pool.getConnection((err, conn) => {
		if (err) {
			console.log('Error connecting: ', err.stack);
			return res.send(err);
		}
		conn.query(`DELETE FROM user WHERE userId = ${userId};`, (error, results) => {
			if (error) {
				console.log('Error executing sql: ', error.message);
				return res.send(error);
			}
			if (results.affectedRows == 0) {
				console.log(`${userId} userId not exist`);
				return res.status(404).send('USER_NOT_EXIST');
			}
			console.log('results: ', results);
			res.send('Deleted');
		});
	})
}); // delete()

module.exports = router;