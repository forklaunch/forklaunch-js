import forklaunchExpress, {
  forklaunchRouter
} from '../forklaunch.hyperExpress';
import { z } from 'zod';
import { ZodSchemaValidator } from "@forklaunch/validator/zod";

// Create a new instance of TypeboxSchemaValidator
const zodSchemaValidator = new ZodSchemaValidator();

// Initialize the application using forklaunchExpress with TypeboxSchemaValidator
const forklaunchApp = forklaunchExpress(zodSchemaValidator);
// Create a router instance
const router = forklaunchRouter('/api/books', zodSchemaValidator);

// Define Zod schemas
const BookSchema = z.object({
  id: z.number().optional(),
  title: z.string(),
  author: z.string(),
  year: z.number()
});

const BooksSchema = z.array(BookSchema);

// Dummy data for books
const books = [
  { id: 1, title: '1984', author: 'George Orwell', year: 1949 },
  { id: 2, title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', year: 1925 }
];

type Book = z.infer<typeof BookSchema>;
type Books = z.infer<typeof BooksSchema>;

// GET - Retrieve all books
router.get('/', {
  name: 'GetBooks',
  summary: 'Retrieves list of all books',
  responses: {
    200: BooksSchema,
    500: z.string()
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
    400: z.string()
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
  params: {
    id: z.number()
  },
  body: BookSchema,
  responses: {
    200: BookSchema,
    404: z.string()
  }
}, (req, res) => {
  const id = req.params.id;
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
  params: {
    id: z.number()
  },
  responses: {
    200: z.string(),
    404: z.string()
  }
}, (req, res) => {
  const id = req.params.id;
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

// Start the server on port 3001
forklaunchApp.listen(3001, () => {
  console.log('Server running on http://localhost:3001');
});