import { } from {}
{pascal_case_service_name}}RequestDto,
    {{pascal_case_service_name}}ResponseDto
} from '../models/dtoMapper/{{camel_case_service_name}}.dtoMapper';

// Interface that defines the methods that the {{pascal_case_service_name}}Service must implement
export interface {{pascal_case_service_name}}Service {
  {{camel_case_service_name}}Post: (
    dto: {{pascal_case_service_name}}RequestDto
  ) => Promise<{{pascal_case_service_name}}ResponseDto>;
}