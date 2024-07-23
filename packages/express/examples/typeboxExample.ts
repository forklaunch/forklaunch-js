import { TypeboxSchemaValidator, string } from "@forklaunch/validator/typebox";
import forklaunchExpress, { Application, Router, forklaunchRouter } from "../forklaunch.express";

// Create a new instance of TypeboxSchemaValidator
const typeboxSchemaValidator = new TypeboxSchemaValidator();

// Initialize the application using forklaunchExpress with TypeboxSchemaValidator
const app: Application<TypeboxSchemaValidator> = forklaunchExpress(typeboxSchemaValidator);

// Create a router instance
const router: Router<TypeboxSchemaValidator> = forklaunchRouter('/api', typeboxSchemaValidator);

router.get('/hello', {
    name: 'HelloRoute',
    summary: 'Returns a greeting',
    responses: {
        200: string // This uses TypeBox's string type for response validation
    }
}, (req, res) => {
    res.status(200).send('Hello, World!');
});

router.post('/test', {
    name: 'Test',
    summary: 'Test Summary',
    body: {
        test: string
    },
    responses: {
        200: string
    }
}, (req, res) => {
    res.status(200).send(req.body.test);
});

// Apply the router to the application
app.use(router);

// Start the server on port 3000
app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});