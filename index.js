const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());


// Firebase Admin 
const admin = require("firebase-admin");
const serviceAccount = require('./firebaseServiceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'secret-key';

// Verify JWT Token Middleware
const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send({ message: 'Unauthorized access' });
  }
  
  const token = authHeader.split(' ')[1];
  
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: 'Forbidden access' });
    }
    req.decoded = decoded;
    next();
  });
};

app.get('/api/users', async (req, res) => {
  const result = await admin.auth().listUsers(1000);
  const users = result.users.map(u => ({
    uid: u.uid,
    email: u.email,
    displayName: u.displayName
  }));
  res.send(users);
});

// MongoDB Connection
// Use MONGODB_URI if available, otherwise construct from DB_USER and DB_PASS
const uri = process.env.MONGODB_URI || 
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.0ykpaho.mongodb.net/bookHavenDB?retryWrites=true&w=majority`;
// const uri = process.env.MONGODB_URI || 
//   `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.0ykpaho.mongodb.net/bookHavenDB?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server
    // await client.connect();
    
    // Database collections
    const booksCollection = client.db("bookHavenDB").collection("books");
    const categoriesCollection = client.db("bookHavenDB").collection("categories");
    const borrowedBooksCollection = client.db("bookHavenDB").collection("borrowedBooks");
    
    // Root route
    app.get('/', (req, res) => {
      res.send('BookHaven Server is running');
    });
    
    // JWT Token Generation Route
    app.post('/api/jwt', async (req, res) => {
      try {
        const user = req.body;
        
        if (!user || !user.uid) {
          return res.status(400).send({ message: 'Invalid user data' });
        }
        
        // Generate token with user data and expiration
        const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
        
        res.send({ token });
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });
    
    // Get all books
    app.get('/api/books', async (req, res) => {
      try {
        const books = await booksCollection.find().toArray();
        res.send(books);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    // Get all book categories
    app.get('/api/categories', async (req, res) => {
      try {
        const categories = await categoriesCollection.find().toArray();
        res.send(categories);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    // Get books by category
    app.get('/api/books/category/:category', async (req, res) => {
      try {
        const category = req.params.category;
        const query = { genre: category };
        const books = await booksCollection.find(query).toArray();
        res.send(books);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    // Get a specific book by ID
    app.get('/api/books/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const book = await booksCollection.findOne(query);
        
        if (!book) {
          return res.status(404).send({ message: 'Book not found' });
        }
        
        res.send(book);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });
    
    // Add a new book (protected route)
    app.post('/api/books', verifyJWT, async (req, res) => {
      try {
        const book = req.body;
        const result = await booksCollection.insertOne(book);
        res.status(201).send(result);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    // Update a book (protected route)
    app.put('/api/books/:id', verifyJWT, async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedBook = req.body;
        const options = { upsert: false };
        
        const update = {
          $set: {
            title: updatedBook.title,
            author: updatedBook.author,
            genre: updatedBook.genre,
            description: updatedBook.description,
            rating: updatedBook.rating,
            image: updatedBook.image,
            quantity: updatedBook.quantity
          }
        };
        
        const result = await booksCollection.updateOne(filter, update, options);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    // Borrow a book (protected route)
    app.post('/api/borrow', verifyJWT, async (req, res) => {
      try {
        const { bookId, userId, userName, userEmail, returnDate } = req.body;
        
        // Verify user from token matches the request
        if (req.decoded.uid !== userId) {
          return res.status(403).send({ message: 'Forbidden: User ID mismatch' });
        }
        
        // Get the book to check its quantity
        const bookQuery = { _id: new ObjectId(bookId) };
        const book = await booksCollection.findOne(bookQuery);
        
        if (!book) {
          return res.status(404).send({ message: 'Book not found' });
        }
        
        if (book.quantity <= 0) {
          return res.status(400).send({ message: 'Book is out of stock' });
        }
        
        // Check if user has already borrowed this book and not returned it yet
        const existingBorrow = await borrowedBooksCollection.findOne({
          bookId: new ObjectId(bookId),
          userId: userId,
          status: 'borrowed'
        });
        
        if (existingBorrow) {
          return res.status(400).send({ 
            message: 'You have already borrowed this book. You can borrow it again after returning it.',
            alreadyBorrowed: true
          });
        }
        
        // Create session for transaction
        const session = client.startSession();
        
        try {
          // Start transaction
          session.startTransaction();
          
          // Decrement book quantity using $inc operator
          const decrementResult = await booksCollection.updateOne(
            bookQuery,
            { $inc: { quantity: -1 } },
            { session }
          );
          
          if (decrementResult.modifiedCount !== 1) {
            throw new Error('Failed to update book quantity');
          }
          
          // Add to borrowed books collection
          const borrowedBook = {
            bookId: new ObjectId(bookId),
            bookTitle: book.title,
            bookImage: book.image,
            bookAuthor: book.author,
            bookCategory: book.genre,
            userId,
            userName,
            userEmail,
            borrowDate: new Date(),
            returnDate: new Date(returnDate),
            status: 'borrowed'
          };
          
          const borrowResult = await borrowedBooksCollection.insertOne(borrowedBook, { session });
          
          if (!borrowResult.insertedId) {
            throw new Error('Failed to add to borrowed books');
          }
          
          // Commit transaction
          await session.commitTransaction();
          
          res.status(201).send({ 
            message: 'Book borrowed successfully',
            bookId,
            currentQuantity: book.quantity - 1
          });
        } catch (error) {
          // Abort transaction on error
          await session.abortTransaction();
          throw error;
        } finally {
          // End session
          session.endSession();
        }
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });
    
    // Get borrowed books for a user (protected route)
    app.get('/api/borrowed-books/:userId', verifyJWT, async (req, res) => {
      try {
        const userId = req.params.userId;
        
        // Verify user from token matches the request
        if (req.decoded.uid !== userId) {
          return res.status(403).send({ message: 'Forbidden: User ID mismatch' });
        }
        
        const query = { userId: userId };
        const borrowedBooks = await borrowedBooksCollection.find(query).toArray();
        res.send(borrowedBooks);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });
    
    // Return a borrowed book (protected route)
    app.post('/api/return-book', verifyJWT, async (req, res) => {
      try {
        const { borrowId, bookId, userId } = req.body;
        
        // Verify user from token matches the request
        if (req.decoded.uid !== userId) {
          return res.status(403).send({ message: 'Forbidden: User ID mismatch' });
        }
        
        // Validate required fields
        if (!borrowId || !bookId || !userId) {
          return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // Update the borrow record to mark it as returned
        const borrowResult = await borrowedBooksCollection.updateOne(
          { _id: new ObjectId(borrowId), userId: userId }, 
          { $set: { status: 'returned', returnedDate: new Date() } }
        );

        if (borrowResult.modifiedCount === 0) {
          return res.status(404).json({ 
            success: false, 
            message: 'Borrow record not found or you do not have permission to return this book' 
          });
        }

        // Increment the book quantity using $inc operator
        const bookResult = await booksCollection.updateOne(
          { _id: new ObjectId(bookId) },
          { $inc: { quantity: 1 } }
        );

        if (bookResult.modifiedCount === 0) {
          return res.status(404).json({ success: false, message: 'Book not found' });
        }

        res.json({ success: true, message: 'Book returned successfully' });
      } catch (error) {
        console.error('Error returning book:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
      }
    });
    
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (error) {
    console.error("Database connection error:", error);
  }
}
run().catch(console.dir);

// Start the server
app.listen(port, () => {
  console.log(`BookHaven Server is running on port ${port}`);
});
