# BookHaven Library Management Server

This is the backend server for the BookHaven Library Management System.

## Setup Instructions

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file in the root directory with the following variables (see example.env):
   ```
   PORT=5000
   MONGODB_URI=mongodb+srv://libraryManagement:V64snpiDvEnF6Fqk@cluster0.0ykpaho.mongodb.net/bookHavenDB?retryWrites=true&w=majority
   ```

3. Start the server:
   ```
   npm start
   ```
   
   For development with auto-restart:
   ```
   npm run dev
   ```

## API Endpoints

### Users

- `POST /api/users` - Store user information
  - Request body: `{ "email": "user@example.com", "name": "User Name" }`
  - Response: MongoDB insertion result or error message if user already exists

### Books

- `GET /api/books` - Get all books
- `GET /api/books/genre/:genre` - Get books by genre/category
- `GET /api/books/:id` - Get a specific book by ID
- `POST /api/books` - Add a new book
- `PUT /api/books/:id` - Update a book
- `DELETE /api/books/:id` - Delete a book

### Borrowed Books

- `GET /api/borrowed/:email` - Get all borrowed books by user email
- `POST /api/borrow` - Borrow a book
- `DELETE /api/return/:id` - Return a borrowed book

## Database Structure

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

2. **borrowedBooks**
   - _id: ObjectId
   - bookId: String
   - bookTitle: String
   - bookImage: String
   - userEmail: String
   - userName: String
   - borrowDate: Date
   - returnDate: Date

3. **users**
   - _id: ObjectId
   - email: String
   - name: String
   - role: String
   - createdAt: Date 