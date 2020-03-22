const msql = require('mysql');
const express = require('express');
const app = express();
const Joi = require('joi');
const helmet = require('helmet');
const morgan = require('morgan');
const debug = require('debug')('app:startup');
const offtake = require('./routes/offtake');
const attendance = require('./routes/attendance');
const moneyEarned = require('./routes/moneyEarned');
const projects = require('./routes/projects');
const user = require('./routes/user');
const authenticator = require('./routes/learning1');

const port = process.env.PORT || 3000;

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/go/', offtake);
app.use('/ga/', attendance);
app.use('/gme/', moneyEarned);
app.use('/gp/', projects);
app.use('/u/', user);
if (app.get('env') === 'development') {
	app.use(morgan('tiny'));
	//	console.log('Morgan enabled...');
	debug('Morgan enabled...');
};

const pool = msql.createPool({ //create connection
	connectionLimit: 100,
	host: 'localhost',
	user: 'root',
	password: '8347@MySql',
	database: 'atempdb'
});

function runQuery(conn, q) {
	return new Promise((resolve, reject) => {
		conn.query(q, (error, results) => {
			if (error)
				reject(error);
			resolve(results);
		});
	});
}

// TODO: for not available user, home screen info is not correct. Fix it
// problem in third query. check it out


// TODO: each response should be an array of atleast one element because 
// android application's requirment

app.get('/:id/:startDate/:endDate', async (req, res) => {
	let response = [];
	const id = req.params.id;
	const sd = req.params.startDate;
	const ed = req.params.endDate;
	// validate user information
	const objToValidate = {
		id: id,
		sd: sd,
		ed: ed,
	}

	try {
		await authenticator('id_sd_ed', objToValidate);

		pool.getConnection(async (err, conn) => {  //connect to conn
			let att, me;
			if (err) {
				console.error('error connecting: ' + err.stack);
				return res.status(400).send('ERR_CONN_DB');
			}

			await runQuery(conn, `SELECT SUM(att) AS att FROM attendance WHERE userId = ${id} AND date BETWEEN '${sd}' AND '${ed}'`)
				.then(results => {
					att = results[0].att;
					response.push(results[0]); console.log('1: ', results);
				})
				.catch((e) => {
					response.push({ "error": e.sqlMessage });
					console.log('1E: ', e)
				});

			await runQuery(conn, `SELECT COALESCE(SUM(money), 0) AS totalOfftake FROM offtake where reqBy = ${id} AND takingDate BETWEEN '${sd}' AND '${ed}'`) // COALESCE return first non-NULL value
				.then(results => {
					response.push(results[0]); console.log('2: ', results)
				})
				.catch(e => {
					response.push({ "error": e.sqlMessage }); console.log('2E: ', e.sqlMessage)
				});

			await runQuery(conn, `SELECT wage FROM wage WHERE userId = ${id}`)
				.then(results => {
					me = att * (results[0].wage);
					response.push({ "totalMoneyEarned": me != null && !(me instanceof ReferenceError) ? me : 0 }); console.log('3: ', results)
				})
				.catch(e => {
					response.push({ "error": e.sqlMessage }); console.log('3E: ', e.sqlMessage)
				});

			await runQuery(conn, `SELECT project.name, employee_under_project.projectId FROM employee_under_project LEFT JOIN project ON project.projectId = employee_under_project.projectId WHERE employee_under_project.userId = ${id} AND employee_under_project.currentStatus = 'running'`)
				.then(results => {
					console.log('4: ', results)
					response.push(results);
					// after all the queries has been resolved then we'll respond
					res.send(response)
				})
				.catch(e => {
					response.push({ "error": e.sqlMessage });
					console.log('4E: ', e.sqlMessage)
					// after all the queries has been resolved then we'll respond
					res.send(response);
				});
		});

	} catch (error) {
		// if authentication fails
		if (error.message === 'ERR_WRONG_USER_INFO')
			return res.status(400).send(error.message);

		else if (error.message === 'ERR_CONN_DB') {
			console.error('error connecting: ' + error.stack);
			return res.status(400).send('ERR_CONN_DB');
		}
		else {
			console.log('	---- Something went wrong ---- \n Error: ', error);
			return res.status(400).send('Error');
		}
	}

});

app.listen(port, () => console.log(`Listening on port : ${port}`));