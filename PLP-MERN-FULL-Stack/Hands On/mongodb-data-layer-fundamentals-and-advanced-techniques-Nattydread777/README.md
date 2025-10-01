# MongoDB Data Layer Fundamentals & Advanced Techniques

## Assignment Overview

This project demonstrates the fundamentals of MongoDB, including installation, creating collections, performing CRUD operations, using aggregation pipelines, and implementing indexing for performance optimization. All required tasks from the assignment have been completed and documented in the provided scripts.

---

## Process & What Was Done

### 1. **MongoDB Setup**
- Installed MongoDB Community Edition locally.
- Created a database named `plp_bookstore`.
- Created a collection named `books`.

### 2. **Data Insertion**
- Used `insert_books.js` to insert at least 10 book documents into the `books` collection.
- Each book document includes the following fields:
  - `title` (string)
  - `author` (string)
  - `genre` (string)
  - `published_year` (number)
  - `price` (number)
  - `in_stock` (boolean)
  - `pages` (number)
  - `publisher` (string)

### 3. **CRUD Operations & Queries**
- All queries are saved in `queries.js`.
- Implemented queries to:
  - Find all books in a specific genre.
  - Find books published after a certain year.
  - Find books by a specific author.
  - Update the price of a specific book.
  - Delete a book by its title.

### 4. **Advanced Queries**
- Queried books that are both in stock and published after 2010.
- Used projection to return only the title, author, and price fields.
- Implemented sorting by price (ascending and descending).
- Used limit and skip for pagination (5 books per page).

### 5. **Aggregation Pipelines**
- Calculated the average price of books by genre.
- Found the author with the most books in the collection.
- Grouped books by publication decade and counted them.

### 6. **Indexing & Performance**
- Created an index on the `title` field for faster searches.
- Created a compound index on `author` and `published_year`.
- Used the `explain()` method to demonstrate query performance improvements.

---

## How to Run the Scripts

1. **Install dependencies:**
   ```
   npm install mongodb
   ```

2. **Start MongoDB locally.**

3. **Insert sample data:**
   ```
   node insert_books.js
   ```

4. **Run queries and view results:**
   ```
   node queries.js
   ```

---

## Files to Submit

- `insert_books.js` &mdash; Script to insert sample book data.
- `queries.js` &mdash; Contains all required MongoDB queries and operations.
- `README.md` &mdash; This file, explaining the process and instructions.
- `screenshot.png` &mdash; Screenshot of MongoDB Compass showing your collections and sample data.

---

## Screenshot

See `screenshot.png` for a visual confirmation of the database and collection setup.

---

## Notes

- All output is printed to the terminal.
- You can modify the scripts to experiment with different queries or data.
- If you encounter connection issues, ensure MongoDB is running and accessible at `localhost:27017`.

---
