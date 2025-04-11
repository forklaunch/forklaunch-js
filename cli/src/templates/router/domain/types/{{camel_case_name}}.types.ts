// Exported type that matches the request schema
export type {{pascal_case_name}}RequestDto = {
    message: string;{{#is_worker}}
    processed: boolean;
    retryCount: number;{{/is_worker}}
}

// Exported type that matches the response schema
export type {{pascal_case_name}}ResponseDto = {
    message: string;{{#is_worker}}
    processed: boolean;
    retryCount: number;{{/is_worker}}
}