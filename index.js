const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const uri = process.env.MONGODB_URI || "mongodb+srv://libraryManagement:V64snpiDvEnF6Fqk@cluster0.0ykpaho.mongodb.net/bookHavenDB?retryWrites=true&w=majority&appName=Cluster0";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
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
    await client.connect();
    
    // Database collections
    const booksCollection = client.db("bookHavenDB").collection("books");
    const borrowedCollection = client.db("bookHavenDB").collection("borrowedBooks");
    const usersCollection = client.db("bookHavenDB").collection("users");
    
    // Root route
    app.get('/', (req, res) => {
      res.send('BookHaven Server is running');
    });
    
    // Store user information
    app.post('/api/users', async (req, res) => {
      try {
        const user = req.body;
        
        // Check if user already exists
        const existingUser = await usersCollection.findOne({ email: user.email });
        
        if (existingUser) {
          return res.send({ message: 'User already exists', insertedId: null });
        }
        
        // Store user in database
        const result = await usersCollection.insertOne({
          email: user.email,
          name: user.name,
          role: 'user',
          createdAt: new Date()
        });
        
        res.status(201).send(result);
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
    
    // Get books by category/genre
    app.get('/api/books/genre/:genre', async (req, res) => {
      try {
        const genre = req.params.genre;
        const query = { genre: genre };
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
    
    // Add a new book
    app.post('/api/books', async (req, res) => {
      try {
        const book = req.body;
        const result = await booksCollection.insertOne(book);
        res.status(201).send(result);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });
    
    // Update a book
    app.put('/api/books/:id', async (req, res) => {
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
    
    // Delete a book
    app.delete('/api/books/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await booksCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });
    
    // Get all borrowed books by user email
    app.get('/api/borrowed/:email', async (req, res) => {
      try {
        const email = req.params.email;
        const query = { userEmail: email };
        const result = await borrowedCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });
    
    // Borrow a book
    app.post('/api/borrow', async (req, res) => {
      try {
        const borrowInfo = req.body;
        
        // Check if user has already borrowed this book
        const existingBorrow = await borrowedCollection.findOne({
          bookId: borrowInfo.bookId,
          userEmail: borrowInfo.userEmail
        });
        
        if (existingBorrow) {
          return res.status(400).send({ message: 'You have already borrowed this book' });
        }
        
        // Check if book exists and has available quantity
        const bookId = borrowInfo.bookId;
        const book = await booksCollection.findOne({ _id: new ObjectId(bookId) });
        
        if (!book) {
          return res.status(404).send({ message: 'Book not found' });
        }
        
        if (book.quantity <= 0) {
          return res.status(400).send({ message: 'Book is out of stock' });
        }
        
        // Add to borrowed collection
        const result = await borrowedCollection.insertOne({
          ...borrowInfo,
          borrowDate: new Date(),
          returnDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days from now
        });
        
        // Decrease book quantity
        await booksCollection.updateOne(
          { _id: new ObjectId(bookId) },
          { $inc: { quantity: -1 } }
        );
        
        res.status(201).send(result);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });
    
    // Return a borrowed book
    app.delete('/api/return/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const borrowedBook = await borrowedCollection.findOne({ _id: new ObjectId(id) });
        
        if (!borrowedBook) {
          return res.status(404).send({ message: 'Borrowed book record not found' });
        }
        
        // Increase book quantity
        await booksCollection.updateOne(
          { _id: new ObjectId(borrowedBook.bookId) },
          { $inc: { quantity: 1 } }
        );
        
        // Remove from borrowed collection
        const result = await borrowedCollection.deleteOne({ _id: new ObjectId(id) });
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });
    
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
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
