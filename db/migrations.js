const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const migrationSchema = new Schema({
    mysqlConnection: {
        url: String,
        username: String,
    },
    mongoCollection: String,
    migratedCount: Number,
    timestamp: { type: Date, default: Date.now },
    // Reference to the user who performed the migration
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const Migration = mongoose.model('Migration', migrationSchema);

module.exports = Migration;
