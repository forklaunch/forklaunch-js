import { forklaunchExpress, forklaunchRouter } from '@forklaunch/hyper-express';
import {
  SchemaValidator,
  array,
  number,
  optional,
  schemify,
  string
} from '@forklaunch/validator/typebox';

// Create a new instance of TypeboxSchemaValidator
const typeboxSchemaValidator = SchemaValidator();

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

const ResponseErrorSchema = schemify({
  error: string
});

// GET - Retrieve all books
router.get(
  '/',
  {
    name: 'GetBooks',
    summary: 'Retrieves list of all books',
    responses: {
      200: BooksSchema,
      500: ResponseErrorSchema
    }
  },
  (req, res) => {
    try {
      // HINT: TAKE A LOOK AT HOW YOU'VE DEFINED BOOKS SCHEMA
      res.status(200).json(books);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error in parsing books data.' });
    }
  }
);

// POST - Add a new book
router.post(
  '/',
  {
    name: 'AddBook',
    summary: 'Adds a new book',
    body: BookSchema,
    responses: {
      200: BookSchema,
      400: { error: string }
    }
  },
  (req, res) => {
    const { title, author, year } = req.body;
    if (!title || !author || !year) {
      res.status(400).json({ error: 'Missing required book fields.' } as any);
      return;
    }
    const booksId = books.length + 1;
    const createdBook = { id: booksId, title, author, year };
    books.push(createdBook);
    res.status(200).json(createdBook);
  }
);

// PUT - Update a book
router.put(
  '/:id',
  {
    name: 'UpdateBook',
    summary: 'Updates an existing book',
    params: {
      id: number
    },
    body: BookSchema,
    responses: {
      200: BookSchema,
      404: { error: string }
    }
  },
  (req, res) => {
    const index = books.findIndex((book) => book.id === req.params.id);
    if (index !== -1) {
      books[index] = { ...books[index], ...req.body };
      res.status(200).json(books[index]);
    } else {
      res.status(404).json({ error: 'Book not found' } as any);
    }
  }
);

// DELETE - Remove a book
router.delete(
  '/:id',
  {
    name: 'DeleteBook',
    summary: 'Deletes an existing book',
    params: {
      id: number
    },
    responses: {
      200: { message: string },
      404: { error: string }
    }
  },
  (req, res) => {
    const index = books.findIndex((book) => book.id === req.params.id);
    if (index !== -1) {
      books.splice(index, 1);
      res.status(200).json({ message: 'Book deleted successfully' } as any);
    } else {
      res.status(404).json({ error: 'Book not found' } as any);
    }
  }
);

// Apply the router to the application
forklaunchApp.use(router);

// Start the server on port 3000
forklaunchApp.listen(3000, () => {
  console.log('🔥Server running on http://localhost:3000 🔥');
});
