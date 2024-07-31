import { forklaunchExpress, forklaunchRouter } from '@forklaunch/hyper-express';
import { TypeboxSchemaValidator, array, number, optional, schemify, string } from '@forklaunch/validator/typebox';
// Create a new instance of TypeboxSchemaValidator
const typeboxSchemaValidator = new TypeboxSchemaValidator();
// Initialize the application using forklaunchExpress with TypeboxSchemaValidator
const forklaunchApp = forklaunchExpress(typeboxSchemaValidator);
// Create a router instance
const router = forklaunchRouter('/api/books', typeboxSchemaValidator);
// Define TypeBox schemas using schemify
const BookSchema = {
    id: optional(number),
    title: string,
    author: string,
    year: number
};
const BooksSchema = {
    items: array(BookSchema)
};
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
const ResponseErrorSchema = schemify({
    error: string
});
// GET - Retrieve all books
router.get('/', {
    name: 'GetBooks',
    summary: 'Retrieves list of all books',
    responses: {
        200: BooksSchema,
        500: ResponseErrorSchema
    }
}, (req, res) => {
    try {
        // HINT: TAKE A LOOK AT HOW YOU'VE DEFINED BOOKS SCHEMA
        res.status(200).json(books);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error in parsing books data.' });
    }
});
// POST - Add a new book
router.post('/', {
    name: 'AddBook',
    summary: 'Adds a new book',
    body: BookSchema,
    responses: {
        200: BookSchema,
        400: { error: string }
    }
}, (req, res) => {
    const { title, author, year } = req.body;
    if (!title || !author || !year) {
        res.status(400).json({ error: 'Missing required book fields.' });
        return;
    }
    const booksId = books.length + 1;
    const createdBook = { id: booksId, title, author, year };
    books.push(createdBook);
    const validatedBook = BookSchema.parse(createdBook);
    res.status(200).json(validatedBook);
});
// PUT - Update a book
router.put('/:id', {
    name: 'UpdateBook',
    summary: 'Updates an existing book',
    params: schemify({
        id: number
    }),
    body: BookSchema,
    responses: {
        200: BookSchema,
        404: { error: string }
    }
}, (req, res) => {
    const id = parseInt(req.params.id);
    const index = books.findIndex((book) => book.id === id);
    if (index !== -1) {
        books[index] = { ...books[index], ...req.body };
        // HINT, FORKLAUNCH DOES THIS FOR YOU
        const validatedBook = BookSchema.parse(books[index]);
        res.status(200).json(validatedBook);
    }
    else {
        res.status(404).json({ error: 'Book not found' });
    }
});
// DELETE - Remove a book
router.delete('/:id', {
    name: 'DeleteBook',
    summary: 'Deletes an existing book',
    params: schemify({
        id: number
    }),
    responses: {
        200: { message: string },
        404: { error: string }
    }
}, (req, res) => {
    const id = parseInt(req.params.id);
    const index = books.findIndex((book) => book.id === id);
    if (index !== -1) {
        books.splice(index, 1);
        res.status(200).json({ message: 'Book deleted successfully' });
    }
    else {
        res.status(404).json({ error: 'Book not found' });
    }
});
// Apply the router to the application
forklaunchApp.use(router);
// Start the server on port 3000
forklaunchApp.listen(3000, () => {
    console.log('🔥Server running on http://localhost:3000 🔥');
});
