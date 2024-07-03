import { SchemaValidator } from "@forklaunch/validator/interfaces";
import { ForklaunchNextFunction, ForklaunchRequest, ForklaunchResponse } from "../types/api.types";
import { HttpContractDetails } from "../types/primitive.types";

function checkAnyValidation<SV extends SchemaValidator>(contractDetails: HttpContractDetails<SV>) {
    return contractDetails.body || contractDetails.params || contractDetails.requestHeaders || contractDetails.query;
}

export function parseResponse<
    Request extends ForklaunchRequest<any, any, any, any>,
    Response extends ForklaunchResponse<any, any>, 
    NextFunction extends ForklaunchNextFunction
> (req: Request, res: Response, next?: NextFunction) {
    if (req.contractDetails.responseHeaders) {
        const schema = req.schemaValidator.schemify(req.contractDetails.responseHeaders);
        req.schemaValidator.validate(schema, res.getHeaders());
    }

    if (res.statusCode === 500 || 
        (checkAnyValidation(req.contractDetails) && res.statusCode === 400) || 
        (req.contractDetails.auth && (res.statusCode === 401 || res.statusCode === 403))
    ) {
        return;
    }
    if (!req.contractDetails.responses.hasOwnProperty(res.statusCode)) {
        if (next) {
            next(new Error(`Response code ${res.statusCode} not defined in contract.`));
        };
    }
    
    const schema = req.schemaValidator.schemify(req.contractDetails.responses[res.statusCode]);
    req.schemaValidator.validate(schema, res.bodyData);

    if (next) {
        next();
    }
}