import { AnySchemaValidator, SchemaValidator } from '@forklaunch/validator';
import * as jose from 'jose';
import { v4 } from 'uuid';
import {
    ForklaunchNextFunction,
    ForklaunchRequest,
    ForklaunchResponse
} from '../types/api.types';
import {
    AuthMethod,
    HttpContractDetails,
    PathParamHttpContractDetails,
    StringOnlyObject
} from '../types/primitive.types';

export function createRequestContext<
    SV extends AnySchemaValidator,
    Request extends ForklaunchRequest<SV>,
    Response extends ForklaunchResponse,
    NextFunction extends ForklaunchNextFunction
>(schemaValidator: SV) {
    return (req: Request, res: Response, next?: NextFunction) => {
        req.schemaValidator = schemaValidator as SchemaValidator;

        let correlationId = v4();

        if (req.headers['x-correlation-id']) {
            correlationId = req.headers['x-correlation-id'] as string;
        }

        res.setHeader('x-correlation-id', correlationId);

        req.context = {
            correlationId: correlationId
        };

        if (next) {
            next();
        }
    };
}

export function enrichRequestDetails<
    SV extends AnySchemaValidator,
    Request extends ForklaunchRequest<SV>,
    Response extends ForklaunchResponse,
    NextFunction extends ForklaunchNextFunction
>(contractDetails: PathParamHttpContractDetails<SV> | HttpContractDetails<SV>) {
    return (req: Request, _res: Response, next?: NextFunction) => {
        req.contractDetails = contractDetails;

        if (next) {
            next();
        }
    };
}

export function preHandlerParse<SV extends AnySchemaValidator>(
    schemaValidator: SchemaValidator,
    object: unknown,
    schemaInput?: StringOnlyObject<SV>
) {
    if (!schemaInput) {
        return;
    }

    const schema = schemaValidator.schemify(schemaInput);
    if (!schemaValidator.validate(schema, object)) {
        return 400;
    }
}

export function parseRequestParams<
    SV extends AnySchemaValidator,
    Request extends ForklaunchRequest<SV>,
    Response extends ForklaunchResponse,
    NextFunction extends ForklaunchNextFunction
>(req: Request, res: Response, next?: NextFunction) {
    const params = req.contractDetails.params;
    if (preHandlerParse(req.schemaValidator, req.params, params) === 400) {
        res.status(400).send('Invalid request parameters.');
        if (next) {
            next(new Error('Invalid request parameters.'));
        }
    }
    if (next) {
        next();
    }
}

export function parseRequestBody<
    SV extends AnySchemaValidator,
    Request extends ForklaunchRequest<SV>,
    Response extends ForklaunchResponse,
    NextFunction extends ForklaunchNextFunction
>(req: Request, res: Response, next?: NextFunction) {
    if (req.headers['content-type'] === 'application/json') {
        const body = (req.schemaValidator,
            req.contractDetails as HttpContractDetails<SV>).body;
        if (
            preHandlerParse(
                req.schemaValidator,
                req.body,
                body as StringOnlyObject<SV>
            ) === 400
        ) {
            res.status(400).send('Invalid request body.');
            if (next) {
                next(new Error('Invalid request body.'));
            }
        }
    }
    if (next) {
        next();
    }
}

export function parseRequestHeaders<
    SV extends AnySchemaValidator,
    Request extends ForklaunchRequest<SV>,
    Response extends ForklaunchResponse,
    NextFunction extends ForklaunchNextFunction
>(req: Request, res: Response, next?: NextFunction) {
    const headers = req.contractDetails.requestHeaders;
    if (preHandlerParse(req.schemaValidator, req.headers, headers) === 400) {
        res.status(400).send('Invalid request headers.');
        if (next) {
            next(new Error('Invalid request headers.'));
        }
    }
    if (next) {
        next();
    }
}

export function parseRequestQuery<
    SV extends AnySchemaValidator,
    Request extends ForklaunchRequest<SV>,
    Response extends ForklaunchResponse,
    NextFunction extends ForklaunchNextFunction
>(req: Request, res: Response, next?: NextFunction) {
    const query = req.contractDetails.query;
    if (preHandlerParse(req.schemaValidator, req.query, query) === 400) {
        res.status(400).send('Invalid request query.');
        if (next) {
            next(new Error('Invalid request query.'));
        }
    }
    if (next) {
        next();
    }
}

async function checkAuthorizationToken(
    authorizationMethod?: AuthMethod,
    authorizationString?: string
): Promise<[401 | 403, string] | string | undefined> {
    if (!authorizationString) {
        return [401, 'No Authorization token provided.'];
    }
    switch (authorizationMethod) {
        case 'jwt': {
            if (!authorizationString.startsWith('Bearer ')) {
                return [401, 'Invalid Authorization token format.'];
            }
            try {
                const decodedJwt = await jose.jwtVerify(
                    authorizationString.split(' ')[1],
                    new TextEncoder().encode(
                        process.env.JWT_SECRET || 'your-256-bit-secret'
                    )
                );
                return decodedJwt.payload.iss;
            } catch (error) {
                console.error(error);
                return [403, 'Invalid Authorization token.'];
            }
        }
        default:
            return [401, 'Invalid Authorization method.'];
    }
}

function mapRoles(
    authorizationType?: AuthMethod,
    authorizationToken?: string
): string[] {
    return [];
}
function mapPermissions(
    authorizationType?: AuthMethod,
    authorizationToken?: string
): string[] {
    return [];
}

export async function parseRequestAuth<
    SV extends AnySchemaValidator,
    Request extends ForklaunchRequest<SV>,
    Response extends ForklaunchResponse,
    NextFunction extends ForklaunchNextFunction
>(req: Request, res: Response, next?: NextFunction) {
    const auth = req.contractDetails.auth;
    if (auth) {
        const errorAndMessage = await checkAuthorizationToken(
            auth.method,
            req.headers.authorization
        );
        if (Array.isArray(errorAndMessage)) {
            res.status(errorAndMessage[0]).send(errorAndMessage[1]);
            if (next) {
                next(new Error(errorAndMessage[1]));
            }
        }

        // TODO: Implement role and permission checking
        const permissionSlugs = mapPermissions(
            auth.method,
            req.headers.authorization
        );
        const roles = mapRoles(auth.method, req.headers.authorization);

        const permissionErrorMessage =
            'User does not have sufficient permissions to perform action.';
        const roleErrorMessage =
            'User does not have correct role to perform action.';

        // this is wrong, we need to check if any of the user's permissions are in the allowed permissions, while checking that any of the permissions is not in the forbidden slugs
        // currently this is checking if any of the user's permissions are NOT in the allowed permissions
        permissionSlugs.forEach((permissionSlug) => {
            if (
                !req.contractDetails.auth?.allowedSlugs?.has(permissionSlug) ||
                req.contractDetails.auth?.forbiddenSlugs?.has(permissionSlug)
            ) {
                res.status(403).send(permissionErrorMessage);
                if (next) {
                    next(new Error(permissionErrorMessage));
                }
            }
        });
        roles.forEach((role) => {
            if (
                !req.contractDetails.auth?.allowedRoles?.has(role) ||
                req.contractDetails.auth?.forbiddenRoles?.has(role)
            ) {
                res.status(403).send(roleErrorMessage);
                if (next) {
                    next(new Error(roleErrorMessage));
                }
            }
        });
    }

    // if (next) {
    //     next();
    // }
}
