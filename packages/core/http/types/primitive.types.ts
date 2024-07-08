import { AnySchemaValidator } from "@forklaunch/validator";
import { UnboxedObjectSchema } from "@forklaunch/validator/types";

export type ParamsDictionary = { [key: string]: string; };

export type StringOnlyObject<SV extends AnySchemaValidator> = Omit<UnboxedObjectSchema<SV>, number | symbol>;
export type NumberOnlyObject<SV extends AnySchemaValidator> = Omit<UnboxedObjectSchema<SV>, string | symbol>;

export type BodyObject<SV extends AnySchemaValidator> = StringOnlyObject<SV> & unknown;
export type ParamsObject<SV extends AnySchemaValidator> = StringOnlyObject<SV> & unknown;
export type QueryObject<SV extends AnySchemaValidator> = StringOnlyObject<SV> & unknown;
export type HeadersObject<SV extends AnySchemaValidator> = StringOnlyObject<SV> & unknown;
export type ResponsesObject<SV extends AnySchemaValidator> = {
    [key: number]: SV['_ValidSchemaObject'] | UnboxedObjectSchema<SV> | string | SV['string'];
} & unknown;

export type Body<SV extends AnySchemaValidator> = BodyObject<SV>
    | SV['_ValidSchemaObject']
    | SV['_SchemaCatchall'];

export type AuthMethod = 'jwt' | 'session';
export interface PathParamHttpContractDetails<
    SV extends AnySchemaValidator,
    ParamSchemas extends ParamsObject<SV> = ParamsObject<SV>,
    ResponseSchemas extends ResponsesObject<SV> = ResponsesObject<SV>,
    QuerySchemas extends QueryObject<SV> = QueryObject<SV>
> {
    name: string,
    summary: string,
    responses: ResponseSchemas,
    requestHeaders?: HeadersObject<SV>,
    responseHeaders?: HeadersObject<SV>,
    params?: ParamSchemas,
    query?: QuerySchemas,
    auth?: {
        method: AuthMethod,
        allowedSlugs?: Set<string>,
        forbiddenSlugs?: Set<string>,
        allowedRoles?: Set<string>,
        forbiddenRoles?: Set<string>
    }
}

export interface HttpContractDetails<
    SV extends AnySchemaValidator,
    ParamSchemas extends ParamsObject<SV> = ParamsObject<SV>,
    ResponseSchemas extends ResponsesObject<SV> = ResponsesObject<SV>,
    BodySchema extends Body<SV> = Body<SV>,
    QuerySchemas extends QueryObject<SV> = QueryObject<SV>
> extends PathParamHttpContractDetails<SV, ParamSchemas, ResponseSchemas, QuerySchemas> {
    body?: BodySchema,
    contentType?:
    | 'application/json'
    | 'multipart/form-data'
    | 'application/x-www-form-urlencoded';
}
