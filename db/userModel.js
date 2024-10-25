const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  // New field: An array to store references to migration documents
  migrations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Migration' }]
});

const User = mongoose.model('User', userSchema);

module.exports = User;
