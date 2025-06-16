# BookHaven Library Management Server

This is the backend server for the BookHaven Library Management System, providing API endpoints for book management, user authentication, and book borrowing/returning functionality.

## Features

- **Book Management**: CRUD operations for books in the library
- **Category Management**: API for book categories/genres
- **Borrowing System**: APIs to borrow and return books with quantity tracking
- **User Management**: Integration with Firebase Auth for user authentication
- **Efficient Database Operations**: Using MongoDB with proper indexing

## Technologies Used

- **Node.js**: JavaScript runtime for the server
- **Express**: Web framework for Node.js
- **MongoDB**: NoSQL database for storing book and user information
- **Firebase Admin SDK**: For user authentication and management
- **dotenv**: For environment variable management
- **cors**: For handling Cross-Origin Resource Sharing

## Setup Instructions

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   ```

3. Place your Firebase service account key in `firebaseServiceAccount.json`

4. Start the server:
   ```
   npm start
   ```
   
   For development with auto-restart:
   ```
   npm run dev
   ```

## API Endpoints

### Books

- `GET /api/books` - Get all books
- `GET /api/books/:id` - Get a specific book by ID
- `GET /api/books/category/:category` - Get books by category/genre
- `POST /api/books` - Add a new book
- `PUT /api/books/:id` - Update a book

### Categories

- `GET /api/categories` - Get all book categories

### Borrowed Books

- `GET /api/borrowed-books/:userId` - Get all borrowed books by user ID
- `POST /api/borrow` - Borrow a book (decrements quantity)
- `POST /api/return-book` - Return a borrowed book (increments quantity)

### Users

- `GET /api/users` - Get all users (Admin only)

## Database Schema

### Collections

1. **books**
   - _id: ObjectId
   - title: String
   - author: String
   - genre: String
   - description: String
   - rating: Number
   - image: String
   - quantity: Number

2. **categories**
   - _id: ObjectId
   - name: String
   - description: String
   - image: String

3. **borrowedBooks**
   - _id: ObjectId
   - bookId: ObjectId (reference to books collection)
   - bookTitle: String
   - bookImage: String
   - bookAuthor: String
   - bookCategory: String (optional)
   - userId: String
   - userName: String
   - userEmail: String
   - borrowDate: Date
   - returnDate: Date
   - status: String (borrowed/returned)
   - returnedDate: Date (when status is returned)
   
## Error Handling

The API includes proper error handling for:
- Invalid requests
- Database errors
- Authentication/Authorization errors
- Resource not found errors 