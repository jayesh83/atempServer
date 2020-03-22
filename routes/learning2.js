const express = require('express');
const app = express();
const authenticator = require('./learning1.js');


// #1 first way to use middleware

// app.use((req, res, next) => {
//     console.log('1st middleware is being executed...');
//     console.log('next: ', next);
//     next();
// });

// #2 second way     
// var myLogger = function (req, res, next) {
//     console.log('LOGGED')
//     next()
//}

// app.use(myLogger)

// function middleware1(req, res, next) {
//     console.log('secondly I want to do this, whenever there\'s a path request');
//     next();
// }

// app.use(middleware1);
app.use(authenticator('post_User', {
    userId: 7984431019,
    fname: 'Jayesh',
    mname: 'Mangilal',
    lname: 'Suthar',
    dob: '2000-08-18',
    salary: 80000,
    phone2: 7984431019,
    password: 'xyjjlddf23f',
}));
app.get('/', (req, res) => {
    console.log('viewing home...');
    res.send('<h2>middleware working</h2>');
});

app.listen(3000);