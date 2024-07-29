// Import the Express.js framework
const express = require('express');
//TODO: Include code for body-parser
const bodyParser = require('body-parser');
// Create an instance of the Express application. This app variable will be used to define routes and configure the server.
const app = express();
//TODO: Include code for Middleware to parse request bodies
app.use(bodyParser.urlencoded({ extended: true }));
// Specify the port for the server to listen on
const port = 3000;
//TODO: Include code to set EJS as the view engine
app.set('view engine', 'ejs');
// Connect mysql
const mysql = require('mysql2');


// multer
const multer = require('multer');
// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images'); // Directory to save uploaded files
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }

});
const upload = multer({ storage: storage });

// enable static files
app.use(express.static('public'));
//enable form processing
app.use(express.urlencoded({
    extended: false
}));


// Create MySQL connection
const connection = mysql.createConnection({
    host: 'restaurantapp.c5lxsijfw2ub.us-east-1.rds.amazonaws.com',
    user: 'meitinguser',
    password: 'mt2017dbpass', 
    database: 'restaurantapp33'
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});


/* RESTAURANTS */

// Retrieve ALL restaurants
app.get('/', (req, res) => {
    const sql = 'SELECT * FROM restaurants';
    // Fetch data from MySQL
    connection.query(sql, (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error Retrieving restaurants');
        }
        // Render HTML page with data
        res.render('index', { restaurants: results });
    });

});

// Retrieve SPECIFIC restaurant
app.get('/restaurants/:id', (req, res) => {
    // Extract the restaurant ID from the request parameters
    const restaurantId = req.params.id;
    const sql = 'SELECT * FROM restaurants WHERE id = ?';
    
    // Fetch data from MySQL based on the restaurant ID
    connection.query(sql, [restaurantId], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error Retrieving restaurant by ID');
        }
        // Check if any restaurant with the given ID was found
        if (results.length > 0) {
            // Render HTML page with the restaurant data
            res.render('restaurantInfo', { restaurant: results[0] });
        } else {
            // If no restaurant with the given ID was found, render a 404 page or handle it accordingly
            res.status(404).send('Restaurant not found');

        }
    });
});


// Add a new restaurant form
// Load restaurant form
app.get('/addRestaurantForm', function (req, res) {

    res.render('addRestaurant')

});
// Post restaurant to index and database
app.post('/restaurants', upload.single('image'), (req, res) => {
    // Extract restaurant data from the request body
    const { id, name, type, description, address, pricerange, priceindicator } = req.body;

    let image;
    
    if (req.file) {
        image = req.file.filename; // Save only the filename
    } else {
        image = null;
    }   

    const descfiller = description || "No description provided"
    const imgfiller = image || '/images/noimage.png'

    const sql = 'INSERT INTO restaurants ( id, name, type, description, address, image, pricerange, priceindicator) VALUES (?,?, ?, ?, ?, ?, ?, ?)';
    // Insert the new restaurant into the database
    connection.query(sql, [ id, name, type, descfiller, address, imgfiller, pricerange, priceindicator], (error, results) => {
        if (error) {
            // Handle any error that occurs during the database operation
            console.error("Error adding restaurant:", error);
            res.status(500).send('Error adding restaurant');
        } else {
            // Send a success response
            res.redirect('/');
        }
    });
});

// Update a restaurant
// update Restaurant - Retrieve current information
app.get('/restaurants/:id/update', (req, res) => {
    const restaurantId = req.params.id;
    const sql = 'SELECT * FROM restaurants WHERE id = ?';

    connection.query(sql, [restaurantId], (error, results) => {
        //Fetch data from MySQL based on the restaurant ID connection.query( sql , [restaurantId], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving Restaurant by ID');
        }
        // Check if any restaurant with the given ID was found
        if (results.length > 0) {
            // Render HTML page with the restaurant data
            console.log(results)
            res.render('updateRestaurant', { restaurant: results[0] });
            

        } else {
            // If no restaurant with the given ID was found, render a 404 page or handle it accordingly
            res.status(404).send('Restaurant not found');
            
        }
    
    });
});
// update Restaurant - Post updated info
app.post('/restaurants/:id/update', upload.single('image'),  (req, res) => {
    const restaurantId = req.params.id;
    // Extract restaurant data from the request body
    const { name, type, description, address, priceindicator, pricerange } = req.body;

    let image = req.body.currentImage; //retrieve current image filename
    if (req.file) { //if new image is uploaded
        image = req.file.filename; // set image to be new image filename
    }

    const sql = 'UPDATE restaurants SET name = ?, type = ?, description = ?, address = ?, image = ?, priceindicator = ?, pricerange = ? WHERE id = ?';

    // Insert the new restaurant into the database
    connection.query(sql, [name, type, description, address, image, priceindicator, pricerange, restaurantId], (error, results) => {
        if (error) {
            // Handle any error that occurs during the database operation
            console.error("Error updating restaurant:", error);
            res.status(500).send('Error updating restaurant');
        } else {
            // Send a success response
            res.redirect('/restaurants/' + restaurantId);
        }
    });
});

// Delete Restaurant
app.get('/restaurants/:id/delete', (req, res) => {
    const restaurantId = req.params.id;
    const deleteReviewsSql = 'DELETE FROM reviews WHERE restaurantId = ?';
    const deleteRestaurantSql = 'DELETE FROM restaurants WHERE id = ?';

    // Delete from reviews (child table)
    connection.query(deleteReviewsSql, [restaurantId], (err, reviewResults) => {
        if (err) {
            console.error("Error deleting review:", err);
            res.status(500).send('Error deleting review');
        }
        // Then delete from restaurants (parent table)
        connection.query(deleteRestaurantSql, [restaurantId], (err, restaurantResults) => {
            if (err) {
                console.error("Error deleting restaurant:", err);
                res.status(500).send('Error deleting restaurant');
            }
            res.redirect('/');
        });
    });
});




/* REVIEWS */

// Retrieve reviews
app.get('/restaurants/:id/reviews', (req, res) => {
    const restaurantId = req.params.id;
    const restaurantSql = 'SELECT * FROM restaurants WHERE id = ?';
    const reviewsSql = 'SELECT * FROM reviews WHERE restaurantId = ? ORDER BY reviewrating DESC'; // ratings ordered by highest rated reviews to lowest rated reviews
    

    connection.query(restaurantSql, [restaurantId], (err, restaurantResults) => {
        if (err) {
            console.error("Error finding restaurant:", err);
            res.status(500).send('Error finding restaurant');
        }

        if (restaurantResults.length > 0) {
            const restaurant = restaurantResults[0];
            connection.query(reviewsSql, [restaurantId], (err, reviewsResults) => {
                if (err) {
                    console.error("Error finding review:", err);
                    res.status(500).send('Error finding review');
                }
                res.render('reviews', { restaurant: restaurant, reviews: reviewsResults });
            });
        } else {
            res.send('Restaurant not found');
        }
    });
});

// Route to get a specific review by ID
app.get('/restaurants/:restaurantId/reviews/:reviewId', (req, res) => {
    const { restaurantId, reviewId } = req.params;
    const sql = 'SELECT * FROM reviews WHERE id = ? AND restaurantId = ?';
    connection.query(sql, [reviewId, restaurantId], (err, results) => {
        if (err) {
            console.error("Error retrieving specific review:", err);
            res.status(500).send('Error retrieving specific review');
        }
        if (results.length > 0) {
            res.render('reviewInfo', { review: results[0] });
        } else {
            res.send('Review not found');
        }
    });
});

// Add a new review
// load review form
app.get('/restaurants/:id/addReviewForm', (req, res) => {
    const restaurantId = req.params.id;
    const sql = 'SELECT * FROM restaurants WHERE id = ?';
    connection.query(sql, [restaurantId], (err, results) => {
        if (err) {
            console.error("Error retrieving review form:", err);
            res.status(500).send('Error retrieving review form');
        }
        if (results.length > 0) {
            res.render('addReview', { restaurant: results[0] });
        } else {
            res.send('Restaurant not found');
        }
    });
});
// POST review form
app.post('/restaurants/:id/addReviewForm', function (req, res) {
    // Extract review data from the request body
    const id = req.params.id;
    const { reviewername, reviewtitle, reviewrating, reviewdescription, reviewdate } = req.body;

    const reviewdescfiller = reviewdescription || "No description provided"

    const sql = 'INSERT INTO reviews ( reviewername, reviewtitle, reviewrating, reviewdescription, reviewdate, restaurantId) VALUES (?,?, ?, ?, ?, ?)';
    // Insert the new review into the database
    connection.query(sql, [ reviewername, reviewtitle, reviewrating, reviewdescfiller, reviewdate, id ], (error, results) => {
        if (error) {
            // Handle any error that occurs during the database operation
            console.error("Error adding review:", error);
            res.status(500).send('Error adding review');
        } else {
            // Send a success response
            res.redirect('/restaurants/' + id + '/reviews');
        }
    });
});

// Update specific review
// update review - retrieve
app.get('/restaurants/:restaurantId/reviews/:reviewId/update', (req, res) => {
    const { restaurantId, reviewId } = req.params
    const restaurantSql = 'SELECT * FROM restaurants WHERE id = ?';
    const reviewSql = 'SELECT * FROM reviews WHERE id = ? AND restaurantId = ?';

    connection.query(restaurantSql, [restaurantId], (err, restaurantResults) => {
        if (err) {
            console.error("Error finding restaurant:", err);
            res.status(500).send('Error finding restaurant');
        }
        if (restaurantResults.length > 0) {
            const restaurant = restaurantResults[0];
            connection.query(reviewSql, [reviewId, restaurantId], (err, reviewResults) => {
                if (err) {
                    console.error("Error finding review:", err);
                    res.status(500).send('Error finding review');
                }
                if (reviewResults.length > 0) {
                    res.render('updateReview', { restaurant: restaurant, review: reviewResults[0] });
                } else {
                    res.send('Review not found');
                }
            });
        } else {
            res.send('Restaurant not found');
        }
    });
});
// update review - post
app.post('/restaurants/:restaurantId/reviews/:reviewId/update', (req, res) => {
    const { restaurantId, reviewId } = req.params
    const { reviewername, reviewrating, reviewtitle, reviewdescription, reviewdate } = req.body;
    const sql = 'UPDATE reviews SET reviewername = ?, reviewrating = ?, reviewtitle = ?, reviewdescription = ?, reviewdate = ? WHERE id = ? AND restaurantId = ?';
    connection.query(sql, [reviewername, reviewrating, reviewtitle, reviewdescription, reviewdate, reviewId, restaurantId], (err, results) => {
        if (err) {
            console.error("Error updating review:", err);
            res.status(500).send('Error updating review');
        }
        res.redirect('/restaurants/' + restaurantId + '/reviews/' + reviewId);
    });
});

// Delete review
app.get('/restaurants/:restaurantId/reviews/:reviewId/delete', (req, res) => {
    const { restaurantId, reviewId } = req.params;
    const deleteReviewsSql = 'DELETE FROM reviews WHERE id = ? AND restaurantId = ?';

    connection.query(deleteReviewsSql, [reviewId, restaurantId], (err) => {
        if (err) {
            console.error("Error deleting review:", err);
            res.status(500).send('Error deleting review');
        }
        res.redirect('/restaurants/' + restaurantId + '/reviews');
        // similar to restaurant delete, but only deletes the child table
    });
});




/* ABOUT */
// Load About page
app.get('/about', function (req, res) {

    res.render('about')

});




/* SEARCH */
// Search for restaurant
app.post('/search', (req, res) => { // Define the route for POST requests, will be sent to the '/search' endpoint 
    const searchQuery = req.body.search; // Extracts the search query from the body, search is the input field name
    const columns = ['name', 'type', 'description', 'address', 'priceindicator', 'pricerange' ]; // Define the columns to be searching through, restaurant ID not searchable because why would customers search using that
    const sql = `SELECT * FROM restaurants WHERE ${columns.map(col => `${col} LIKE ?`).join(' OR ')}`; // SQL query, map through all the columns and create a LIKE condition for each column, then use .join('OR') to connect all of them, meaning: WHERE name LIKE ? OR type LIKE ? OR description LIKE ?
    const searchTerm = `%${searchQuery}%`; //the search term
    const queryParams = columns.map(() => searchTerm); //query parameters
    connection.query(sql, queryParams, (err, results) => { // connect to the database, put in the sql query, using the parameters of queryParams, definging error and results
        if (err) {
            console.error("Error searching restaurant:", err);
            res.status(500).send('Error searching restaurant');
        } //if error, handle the error with a log and status
        res.render('index', { restaurants: results }); //render the new index, with only the restaurants that matched the search
    });
});
// Created to first search restaurant name, but remembered
// that i stated in my proposal to search based on location, I intended to search through the 'address' column
// but I expanded on this after to search multiple columns

// AI (ChatGPT) used to know how to use map to make the search function able to search multiple columns at once using mapping
// input prompt: "how can i set column to search through all the columns and print out all that meet the search criteria"




// Start the server and listen on the specified port
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
