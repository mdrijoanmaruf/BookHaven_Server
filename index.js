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
    
    // Add a new book (only API endpoint we're keeping)
    app.post('/api/books', async (req, res) => {
      try {
        const book = req.body;
        const result = await booksCollection.insertOne(book);
        res.status(201).send(result);
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
