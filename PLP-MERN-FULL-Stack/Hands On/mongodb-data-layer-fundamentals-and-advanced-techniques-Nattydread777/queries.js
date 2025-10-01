// queries.js
const { MongoClient } = require('mongodb');

const uri = 'mongodb://localhost:27017'; // Local MongoDB connection
const dbName = 'plp_bookstore';
const collectionName = 'books';

async function runQueries() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        // ----------------- Task 2: Basic CRUD -----------------

        // 1. Find all books in a specific genre
        const sciFiBooks = await collection.find({ genre: "Science Fiction" }).toArray();
        console.log("\n📚 Science Fiction Books:");
        console.log(sciFiBooks);

        // 2. Find books published after a certain year
        const recentBooks = await collection.find({ published_year: { $gt: 2015 } }).toArray();
        console.log("\n📚 Books published after 2015:");
        console.log(recentBooks);

        // 3. Find books by a specific author
        const rowlingBooks = await collection.find({ author: "J.K. Rowling" }).toArray();
        console.log("\n📚 Books by J.K. Rowling:");
        console.log(rowlingBooks);

        // 4. Update the price of a specific book
        const updateResult = await collection.updateOne(
            { title: "Harry Potter" },
            { $set: { price: 25.99 } }
        );
        console.log("\n💲 Update result (Harry Potter price):");
        console.log(updateResult);

        // // 5. Delete a book by its title
        const deleteResult = await collection.deleteOne({ title: "Old Book" });
        console.log("\n🗑️ Delete result (Old Book):");
        console.log(deleteResult);

        // ----------------- Task 3: Advanced Queries -----------------

        // 6. Books in stock and published after 2010
        const inStockRecent = await collection.find({
            in_stock: true,
            published_year: { $gt: 2010 }
        }).toArray();
        console.log("\n📦 Books in stock & published after 2010:");
        console.log(inStockRecent);

        // 7. Projection: return only title, author, price
        const projectedBooks = await collection.find(
            {},
            { projection: { title: 1, author: 1, price: 1, _id: 0 } }
        ).toArray();
        console.log("\n🎯 Projection (title, author, price only):");
        console.log(projectedBooks);

        // 8. Sorting by price ascending
        const booksAsc = await collection.find().sort({ price: 1 }).toArray();
        console.log("\n⬆️ Books sorted by price (ascending):");
        console.log(booksAsc);

        // 9. Sorting by price descending
        const booksDesc = await collection.find().sort({ price: -1 }).toArray();
        console.log("\n⬇️ Books sorted by price (descending):");
        console.log(booksDesc);

        // 10. Pagination: 5 books per page (example: page 1)
        const page1Books = await collection.find().skip(0).limit(5).toArray();
        console.log("\n📑 Pagination (Page 1, 5 books):");
        console.log(page1Books);

        // ----------------- Task 4: Aggregation -----------------

        // 11. Average price of books by genre
        const avgPriceByGenre = await collection.aggregate([
            { $group: { _id: "$genre", avgPrice: { $avg: "$price" } } }
        ]).toArray();
        console.log("\n📊 Average price of books by genre:");
        console.log(avgPriceByGenre);

        // 12. Author with most books
        const topAuthor = await collection.aggregate([
            { $group: { _id: "$author", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 1 }
        ]).toArray();
        console.log("\n🏆 Author with most books:");
        console.log(topAuthor);

        // 13. Group books by publication decade
        const booksByDecade = await collection.aggregate([
            {
                $group: {
                    _id: { $multiply: [ { $floor: { $divide: ["$published_year", 10] } }, 10 ] },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]).toArray();
        console.log("\n📅 Books grouped by publication decade:");
        console.log(booksByDecade);

        // ----------------- Task 5: Indexing -----------------

        // 14. Index on title
        const indexTitle = await collection.createIndex({ title: 1 });
        console.log("\n⚡ Index created on title:");
        console.log(indexTitle);

        // 15. Compound index on author and published_year
        const indexAuthorYear = await collection.createIndex({ author: 1, published_year: 1 });
        console.log("\n⚡ Compound index created on author + published_year:");
        console.log(indexAuthorYear);

        // 16. Explain query performance
        const explainResult = await collection.find({ title: "Harry Potter" }).explain("executionStats");
        console.log("\n🔍 Explain query performance (find Harry Potter by title):");
        console.log(JSON.stringify(explainResult, null, 2));

    } finally {
        await client.close();
    }
}

runQueries().catch(console.dir);
