import { TypeboxSchemaValidator, string } from "@forklaunch/validator/typebox";
import forklaunchExpress, { Application, Router, forklaunchRouter } from "@forklaunch/hyper-express";
import { Type } from '@sinclair/typebox';

// Create a new instance of TypeboxSchemaValidator
const typeboxSchemaValidator = new TypeboxSchemaValidator();

// Initialize the application using forklaunchExpress with TypeboxSchemaValidator
const app: Application<TypeboxSchemaValidator> = forklaunchExpress(typeboxSchemaValidator);

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

// GET - Retrieve all books
router.get('/', {
    name: 'GetBooks',
    summary: 'Retrieves list of all books',
    responses: {
        200: BooksSchema
    }
}, (req, res) => {
    res.status(200).json(books);
});

// POST - Add a new book
router.post('/', {
    name: 'AddBook',
    summary: 'Adds a new book',
    body: BookSchema.omit({ id: true }), // ID is not required when adding a new book
    responses: {
        200: BookSchema
    }
}, (req, res) => {
    const newBook = { id: books.length + 1, ...req.body };
    books.push(newBook);
    res.status(200).json(newBook);
});

// PUT - Update a book
router.put('/:id', {
    name: 'UpdateBook',
    summary: 'Updates an existing book',
    body: BookSchema,
    responses: {
        200: BookSchema
    }
}, (req, res) => {
    const id = parseInt(req.params.id);
    const index = books.findIndex(book => book.id === id);
    if (index !== -1) {
        books[index] = { ...books[index], ...req.body };
        res.status(200).json(books[index]);
    } else {
        res.status(404).send('Book not found');
    }
});

// DELETE - Remove a book
router.delete('/:id', {
    name: 'DeleteBook',
    summary: 'Deletes an existing book',
    responses: {
        200: string
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
app.use(router);

// Start the server on port 3000
app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});