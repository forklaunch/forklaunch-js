import { AnySchemaValidator } from "@forklaunch/validator";
import { ForklaunchNextFunction, ForklaunchRequest, ForklaunchResponse } from "../types/api.types";
import { HttpContractDetails } from "../types/primitive.types";

function checkAnyValidation<SV extends AnySchemaValidator>(contractDetails: HttpContractDetails<SV>) {
    return contractDetails.body || contractDetails.params || contractDetails.requestHeaders || contractDetails.query;
}

export function parseResponse<
    SV extends AnySchemaValidator,
    Request extends ForklaunchRequest<SV>,
    Response extends ForklaunchResponse,
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
        req.schemaValidator.validate(req.schemaValidator.string, res.bodyData);
        return;
    }
    if (Object.prototype.hasOwnProperty.call(!req.contractDetails.responses, res.statusCode)) {
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