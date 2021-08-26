const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    imageUrl: { type: Buffer, required: 'false' },
    userName: { type: String, required: 'true' },
    email: { type: String, required: 'true', unique: true },
    permission: { type: String, required: 'true' },
    password: { type: String, required: 'true' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Users", UserSchema);