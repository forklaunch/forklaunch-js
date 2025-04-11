import { string{{#is_worker}}, boolean, number{{/is_worker}} } from '@{{app_name}}/core';

// idiomatic validator schema defines the request schema. This should extend the request type
export const {{pascal_case_name}}RequestSchema = { 
    message: string{{#is_worker}},
    processed: boolean,
    retryCount: number{{/is_worker}}
};

// idiomatic validator schema defines the response schema. This should extend the response type
export const {{pascal_case_name}}ResponseSchema = {
    message: string{{#is_worker}},
    processed: boolean,
    retryCount: number{{/is_worker}}
};
