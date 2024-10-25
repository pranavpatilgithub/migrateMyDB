const express = require('express');
const app = express();
const connectMongoDB = require('./db/mongoConnection');
const migrationModel = require('./db/migrations');
const userModel = require('./db/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const cookieParser = require('cookie-parser');
const mysql = require('mysql2/promise');

let mongoConnection;
connectMongoDB()
  .then(connection => {
    mongoConnection = connection;
    console.log("MongoDB connected and ready to use");
  })
  .catch(err => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

app.set('view engine', 'ejs');
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname , 'public')));

// our main logic *******************************

app.post("/migrate", isAuthenticated, async function(req, res) {
    let { mysqlhost, port, mysqlusername, mysqlpassword, mysqldb, tablename,mongodbname, collectionname } = req.body;
    let mysqlConnection;

    try {
        // 1. Start MySQL Connection
        mysqlConnection = await mysql.createConnection({
            host: mysqlhost,
            port,
            user: mysqlusername,
            password: mysqlpassword,
            database: mysqldb
        });

        // 2. Fetch data from MySQL
        const [rows] = await mysqlConnection.execute(`SELECT * FROM ${tablename}`);
        if (!rows.length) throw new Error("No records found in MySQL.");

        // 3. Insert data into MongoDB in batches
        const mongoDB = await mongoConnection; // Ensure MongoDB connection
        const collection = mongoDB.connection.collection(collectionname);
        
        let batchSuccess = await migrateInBatches(rows, collection);
        if (!batchSuccess) throw new Error("Batch migration failed."); // Handle batch failure
        
        // 4. Save migration details with user ID and username
        const migrationDetails = {
            username: req.cookies.username,
            userId: req.userId,
            mysqlConnection: { url: mysqlhost, username: mysqlusername },
            mongoCollection: collectionname,
            migratedCount: rows.length,
            timestamp: new Date(),
            status: 'Success' 
        };

        const migrationCollection = mongoDB.connection.collection('migrations');
        await migrationCollection.insertOne(migrationDetails); // Insert migration details

        // 5. Update user model with the migration ID
        await userModel.findByIdAndUpdate(req.userId, {
            $push: { migrations: migrationDetails } // Just for tracking
        });

        // 6. Redirect to /services
        res.redirect('/services');

    } catch (error) {
        console.error('Migration failed:', error.message);

        // Handle migration failure details
        const migrationDetails = {
            username: req.cookies.username,
            userId: req.userId,
            mysqlConnection: { url: mysqlhost, username: mysqlusername },
            mongoCollection: collectionname,
            migratedCount: 0, // Failed migration
            timestamp: new Date(),
            status: 'Failed'
        };

        const mongoDB = await mongoConnection;
        const migrationCollection = mongoDB.collection('migrations');
        await migrationCollection.insertOne(migrationDetails); // Save failed migration details

        // Update user model with the failed migration
        await userModel.findByIdAndUpdate(req.userId, {
            $push: { migrations: migrationDetails } // Just for tracking failed migration
        });

        // Redirect to /services after a failure
        res.redirect('/services');
    } finally {
        // Always close the MySQL connection if it was created
        if (mysqlConnection) await mysqlConnection.end();
    }
});

// Function for Batch Processing
async function migrateInBatches(rows, mongoCollection) {
    const BATCH_SIZE = 500; // Define the batch size for migration
    let success = true;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        try {
            await mongoCollection.insertMany(batch); // Insert batch into MongoDB
        } catch (error) {
            console.error(`Batch migration failed at record ${i}`, error.message);
            success = false; // Mark as failed if any batch fails
            break; // Exit the loop on failure
        }
    }
    return success;
}

// **********************************************


//rendering home page
app.get('/', function(req, res) {
    const username = req.cookies.username; // Retrieve username from cookie
    res.render('index', { username: username });
});


app.get('/signin', function(req,res){
    res.render("signin");
});

app.get('/signup', function(req,res){
    res.render("signup");
});

app.get('/services', isAuthenticated, async function(req, res) {
    try {
        const mongoDB = await mongoConnection;
        const migrationCollection = mongoDB.connection.collection('migrations');
        const allMigrations = await migrationCollection.find({ userId: req.userId }).sort({ timestamp: -1 }).toArray();

        
        res.render('services', {
            username: req.cookies.username,
            allMigrations: allMigrations // Pass all migrations to the template
        });
    } catch (error) {
        console.error('Error fetching migrations:', error);
        res.render('services', {
            username: req.cookies.username,
            allMigrations: [] // If an error occurs, pass an empty array
        });
    }
});



app.get('/documentation', function(req,res){
    const username = req.cookies.username; // Retrieve username from cookie
    res.render('documentation', { username: username });
});

app.post('/postSignup', function(req,res){
    let {username, email, password} = req.body;
    // search if any user is already registered
    // ... 

    //if not then registered new user
    bcrypt.genSalt(10, (err,salt)=> {
        bcrypt.hash(password, salt, async (err,hash)=>{
            let user = await userModel.create({
                username,
                email,
                password: hash
            });

            let token = jwt.sign({email: email, userid: user._id}, "shhh");
            res.cookie("token",token, {httpOnly: true});
            res.cookie("username", user.username, { httpOnly: true });
            res.redirect("/")
        })
    })
});

app.post('/postSignin', async function(req,res){
    let {email, password} = req.body;
    let user = await userModel.findOne({email});
    // check if user is not there the show 'something went wrong' 
    
    // if user exist then
    bcrypt.compare(password, user.password, function(err, result){
        if(result){
            let token = jwt.sign({email: email, userid: user._id}, "shhh");
            res.cookie("token",token, {httpOnly: true});
            res.cookie("username", user.username, { httpOnly: true });
            res.redirect('/');
        }
        else{
            res.redirect("/");
        }
    })

});

app.get("/logout",function(req,res){
    res.cookie("token","");
    res.clearCookie('username');
    res.redirect("/");
});

// Middleware to check if the user is logged in
function isAuthenticated(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        // If no token, redirect to the signup page
        return res.redirect('/signup');
    }

    // Verify the token
    jwt.verify(token, "shhh", (err, decoded) => {
        if (err) {
            // If token is invalid, redirect to signup
            return res.redirect('/signup');
        }

        // If valid, attach user info to the request and proceed
        req.userId = decoded.userid; // Attach the user ID to the request object
        next();
    });
}


app.listen('3000');