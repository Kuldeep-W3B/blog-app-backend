const mongoose = require('mongoose');
const {Schema, model} = mongoose;
const validator = require( "validator" );

const UserSchema = new Schema({
  username: {type: String, required: true, min: 4, unique: true},
  email:   { type: String, required: [true, 'Please provide an email'] , validate: [validator.isEmail,"Invalid Email"] },
  password: {type: String, required: true, min: 6, max: 16},
});

const UserModel = model('User', UserSchema);

module.exports = UserModel;