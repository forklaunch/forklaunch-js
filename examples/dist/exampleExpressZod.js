import { forklaunchExpress, forklaunchRouter } from '@forklaunch/express';
import { ZodSchemaValidator, array, number, optional, string } from '@forklaunch/validator/zod';
// Create a new instance of TypeboxSchemaValidator
const zodSchemaValidator = new ZodSchemaValidator();
// Initialize the application using forklaunchExpress with TypeboxSchemaValidator
const forklaunchApp = forklaunchExpress(zodSchemaValidator);
// Create a router instance
const router = forklaunchRouter('/api/books', zodSchemaValidator);
// Define Zod schemas
const BookSchema = {
    id: optional(number),
    title: string,
    author: string,
    year: number
};
// HINT: THE FOLLOWING LINE IS PROBABLY SCREWING WITH THINGS
const BooksSchema = array(BookSchema);
// Dummy data for books
const books = [
    { id: 1, title: '1984', author: 'George Orwell', year: 1949 },
    {
        id: 2,
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        year: 1925
    }
];
// GET - Retrieve all books
router.get('/', {
    name: 'GetBooks',
    summary: 'Retrieves list of all books',
    responses: {
        200: BooksSchema,
        500: string
    }
}, (req, res) => {
    try {
        res.status(200).json(books);
    }
    catch (error) {
        console.error(error);
        res.status(500).send('Server error in parsing books data.');
    }
});
// POST - Add a new book
router.post('/', {
    name: 'AddBook',
    summary: 'Adds a new book',
    body: BookSchema,
    responses: {
        200: BookSchema,
        400: string
    }
}, (req, res) => {
    try {
        const bookData = req.body;
        const booksId = books.length + 1;
        const createdBook = { id: booksId, ...bookData };
        books.push(createdBook);
        res.status(200).json(createdBook);
    }
    catch (error) {
        res.status(400).send('Invalid book data provided.');
    }
});
// PUT - Update a book
router.put('/:id', {
    name: 'UpdateBook',
    summary: 'Updates an existing book',
    params: {
        id: number
    },
    body: BookSchema,
    responses: {
        200: BookSchema,
        404: string
    }
}, (req, res) => {
    const id = req.params.id;
    const index = books.findIndex((book) => book.id === id);
    if (index !== -1) {
        books[index] = { ...books[index], ...req.body };
        res.status(200).json(books[index]);
    }
    else {
        res.status(404).send('Book not found');
    }
});
// DELETE - Remove a book
router.delete('/:id', {
    name: 'DeleteBook',
    summary: 'Deletes an existing book',
    params: {
        id: number
    },
    responses: {
        200: string,
        404: string
    }
}, (req, res) => {
    const id = req.params.id;
    const index = books.findIndex((book) => book.id === id);
    if (index !== -1) {
        books.splice(index, 1);
        res.status(200).send('Book deleted successfully');
    }
    else {
        res.status(404).send('Book not found');
    }
});
// Apply the router to the application
forklaunchApp.use(router);
// Start the server on port 3000
forklaunchApp.listen(3000, () => {
    console.log('🔥Server running on http://localhost:3000 🔥');
});
