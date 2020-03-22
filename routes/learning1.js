const Joi = require('joi');

module.exports = async (schema, object) => {
    // there are different(2) schemas to validate that is why, creating individual schema for 
    // each one of module(s).

    const post_Project = Joi.object().keys({
        userId: Joi.number().integer().max(9999999999).required(),
        projectId: Joi.string().max(11).required(),
        startDate: Joi.date().min('01-01-1950').max(new Date().toISOString()).iso().required(),
        endDate: Joi.date().min('01-01-1950').max('01-01-2090').iso().allow(null, ''),
        name: Joi.string().max(150).required(),
        budget: Joi.number().integer().max(10000000000).allow(null, ''),
        currentStatus: Joi.string().max(20).required(),
        pincode: Joi.number().integer().required(),
        city: Joi.string().max(30).required(),
        state: Joi.string().max(30).required(),
        area: Joi.string().max(100).allow(null, ''),
        landmark: Joi.string().max(100).allow(null, ''),
    });

    // userId, startDate, endDate
    const id_sd_ed = Joi.object().keys({
        id: Joi.number().integer().max(9999999999).required(),
        sd: Joi.date().min('01-01-1950').max(new Date().toISOString()).iso().required(),
        ed: Joi.date().min('01-01-1950').max(new Date().toISOString()).iso().required(),
    });

    // userId, atDate
    const id_ad = Joi.object().keys({
        id: Joi.number().integer().max(9999999999).required(),
        ad: Joi.date().min('01-01-1950').max(new Date().toISOString()).iso().required(),
    });

    // userId, attendance, date, atProject(project id)
    const id_att_date_ap = Joi.object().keys({
        id: Joi.number().integer().max(9999999999).required(),
        att: Joi.number().min(0).max(3).required(),
        date: Joi.date().min('01-01-1950').max(new Date().toISOString()).iso().required(),
        ap: Joi.string().max(11).required(),
    });

    // userId, startDate, endDate, atProject(project id)
    const id_sd_ed_ap = Joi.object().keys({
        id: Joi.number().integer().max(9999999999).required(),
        sd: Joi.date().min('01-01-1950').max(new Date().toISOString()).iso().required(),
        ed: Joi.date().min('01-01-1950').max(new Date().toISOString()).iso().required(),
        ap: Joi.string().max(11).required(),
    });

    const post_Offtake = Joi.object().keys({
        offtakeId: Joi.string().max(11).required(),
        takingDate: Joi.date().min('01-01-1950').max(new Date().toISOString()).iso().required(),
        money: Joi.number().integer().max(9999999999).required(),
        userId: Joi.number().integer().max(9999999999).required(),
        projectId: Joi.string().max(11).required(),
    });

    const post_User = Joi.object().keys({
        userId: Joi.number().integer().max(9999999999).required(),
        fname: Joi.string().min(3).max(50).required(),
        mname: Joi.string().min(3).max(50).allow(null, ''),
        lname: Joi.string().min(3).max(50).allow(null, ''),
        dob: Joi.date().min('01-01-1920').iso(),
        salary: Joi.number().integer().min(0).max(999999999).allow(null, ''),
        phone2: Joi.number().integer().max(9999999999).allow(null, ''),
        password: Joi.string().min(6).max(20).required(),
    });

    const validateObj = Joi.validate(object, eval(schema));
    if (validateObj.error === null)
        return console.log('Checking user info: ok');
    else {
        console.log('Wrong user infos: ', validateObj.error.details);
        throw new Error('ERR_WRONG_USER_INFO');
    }
}