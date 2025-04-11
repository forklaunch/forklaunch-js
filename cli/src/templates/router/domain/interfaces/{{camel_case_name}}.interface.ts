import {
  {{pascal_case_name}}RequestDto,
  {{pascal_case_name}}ResponseDto
} from '../mappers/{{camel_case_name}}.mappers';

// Interface that defines the methods that the {{pascal_case_name}}Service must implement
export interface {{pascal_case_name}}Service {
  {{camel_case_name}}Post: (
    dto: {{pascal_case_name}}RequestDto
  ) => Promise<{{pascal_case_name}}ResponseDto>;
}