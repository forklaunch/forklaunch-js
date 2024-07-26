import { TypeboxSchemaValidator, string } from "../packages/validator/typebox";
import forklaunchExpress, { Application, Router, forklaunchRouter } from "../packages/express/forklaunch.express";
import { Static, Type } from '@sinclair/typebox';

// Create a new instance of TypeboxSchemaValidator
const typeboxSchemaValidator = new TypeboxSchemaValidator();

// Initialize the application using forklaunchExpress with TypeboxSchemaValidator
const forklaunchApp: Application<TypeboxSchemaValidator> = forklaunchExpress(typeboxSchemaValidator);

// Create a router instance
const router: Router<TypeboxSchemaValidator> = forklaunchRouter('/api/books', typeboxSchemaValidator);

// Define TypeBox schemas
const BookSchema = Type.Object({
    id: Type.Optional(Type.Number()),
    title: Type.String(),
    author: Type.String(),
    year: Type.Number()
});

const BooksSchema = Type.Array(BookSchema);

// Dummy data for books
const books = [
    { id: 1, title: '1984', author: 'George Orwell', year: 1949 },
    { id: 2, title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', year: 1925 }
];

type Book = Static<typeof BookSchema>;
type Books = Static<typeof BooksSchema>;

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
        const validatedBooks = BooksSchema.parse(books);
        res.status(200).json(validatedBooks);
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error in parsing books data.");
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
        const bookData: Book = BookSchema.parse(req.body);
        const booksId = books.length + 1;
        const createdBook = { id: booksId, ...bookData };
        books.push(createdBook);
        const validatedBook = BookSchema.parse(createdBook);
        res.status(200).json(validatedBook);
    } catch (error) {
        res.status(400).send("Invalid book data provided.");
    }
});

// PUT - Update a book
router.put('/:id', {
    name: 'UpdateBook',
    summary: 'Updates an existing book',
    params: Type.Object({
        id: Type.Number()
    }),
    body: BookSchema,
    responses: {
        200: BookSchema,
        404: string
    }
}, (req, res) => {
    const id = parseInt(req.params.id);
    const index = books.findIndex(book => book.id === id);
    if (index !== -1) {
        books[index] = { ...books[index], ...req.body };
        const validatedBook = BookSchema.parse(books[index]);
        res.status(200).json(validatedBook);
    } else {
        res.status(404).send('Book not found');
    }
});

// DELETE - Remove a book
router.delete('/:id', {
    name: 'DeleteBook',
    summary: 'Deletes an existing book',
    params: Type.Object({
        id: Type.Number()
    }),
    responses: {
        200: string,
        404: string
    }
}, (req, res) => {
    const id = parseInt(req.params.id);
    const index = books.findIndex(book => book.id === id);
    if (index !== -1) {
        books.splice(index, 1);
        res.status(200).send('Book deleted successfully');
    } else {
        res.status(404).send('Book not found');
    }
});

// Apply the router to the application
forklaunchApp.use(router);

// Start the server on port 3000
forklaunchApp.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});