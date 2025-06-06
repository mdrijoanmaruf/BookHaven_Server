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
    
    // Root route
    app.get('/', (req, res) => {
      res.send('BookHaven Server is running');
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
