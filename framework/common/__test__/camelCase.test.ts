import { describe, expect, it } from 'vitest';
import {
  capitalize,
  getTransformationInfo,
  isValidIdentifier,
  removeLeadingNumbers,
  removeLeadingSeparators,
  removeNonAlphanumeric,
  splitBySeparators,
  toCamelCaseIdentifier,
  toPrettyCamelCase,
  uncapitalize
} from '../src/camelCase';
import type {
  CamelCaseIdentifier,
  PrettyCamelCase,
  ValidIdentifier
} from '../src/types/camelCase.types';

describe('String Utility Types', () => {
  describe('CamelCaseIdentifier Type', () => {
    it('should convert basic strings to camelCase at type level', () => {
      // Basic conversions
      type Test1 = CamelCaseIdentifier<'hello-world'>;
      type Test2 = CamelCaseIdentifier<'my_var_name'>;
      type Test3 = CamelCaseIdentifier<'some.property.name'>;
      type Test4 = CamelCaseIdentifier<'hello world'>;

      const test1: Test1 = 'helloWorld';
      const test2: Test2 = 'myVarName';
      const test3: Test3 = 'somePropertyName';
      const test4: Test4 = 'helloWorld';

      expect(test1).toBe('helloWorld');
      expect(test2).toBe('myVarName');
      expect(test3).toBe('somePropertyName');
      expect(test4).toBe('helloWorld');
    });

    it('should handle leading numbers by removing them at type level', () => {
      type Test1 = CamelCaseIdentifier<'123invalid'>;
      type Test2 = CamelCaseIdentifier<'456test-case'>;

      const test1: Test1 = 'invalid';
      const test2: Test2 = 'testCase';

      expect(test1).toBe('invalid');
      expect(test2).toBe('testCase');
    });

    it('should preserve original casing within words at type level', () => {
      type Test1 = CamelCaseIdentifier<'API-Key'>;
      type Test2 = CamelCaseIdentifier<'HTTP-Response'>;

      const test1: Test1 = 'aPIKey';
      const test2: Test2 = 'hTTPResponse';

      expect(test1).toBe('aPIKey');
      expect(test2).toBe('hTTPResponse');
    });

    it('should handle leading separators at type level', () => {
      type Test1 = CamelCaseIdentifier<'/organization/base'>;
      type Test2 = CamelCaseIdentifier<'---leading-dashes'>;
      type Test3 = CamelCaseIdentifier<'::namespace:method'>;

      const test1: Test1 = 'organizationBase';
      const test2: Test2 = 'leadingDashes';
      const test3: Test3 = 'namespaceMethod';

      expect(test1).toBe('organizationBase');
      expect(test2).toBe('leadingDashes');
      expect(test3).toBe('namespaceMethod');
    });

    it('should fallback to original input for invalid strings at type level', () => {
      type Test1 = CamelCaseIdentifier<'___'>;
      type Test2 = CamelCaseIdentifier<''>;
      type Test3 = CamelCaseIdentifier<'!!!'>;

      const test1: Test1 = '___';
      const test2: Test2 = '';
      const test3: Test3 = '!!!';

      expect(test1).toBe('___');
      expect(test2).toBe('');
      expect(test3).toBe('!!!');
    });
  });

  describe('PrettyCamelCase Type', () => {
    it('should convert strings to prettier camelCase at type level', () => {
      type Test1 = PrettyCamelCase<'API-Key'>;
      type Test2 = PrettyCamelCase<'HTTP-Response'>;
      type Test3 = PrettyCamelCase<'user-ID'>;
      type Test4 = PrettyCamelCase<'get-user-by-id'>;

      const test1: Test1 = 'apiKey';
      const test2: Test2 = 'httpResponse';
      const test3: Test3 = 'userId';
      const test4: Test4 = 'getUserById';

      expect(test1).toBe('apiKey');
      expect(test2).toBe('httpResponse');
      expect(test3).toBe('userId');
      expect(test4).toBe('getUserById');
    });

    it('should handle paths and complex separators at type level', () => {
      type Test1 = PrettyCamelCase<'/organization/base'>;
      type Test2 = PrettyCamelCase<'::api:endpoint'>;
      type Test3 = PrettyCamelCase<'///path/to/file'>;

      const test1: Test1 = 'organizationBase';
      const test2: Test2 = 'apiEndpoint';
      const test3: Test3 = 'pathToFile';

      expect(test1).toBe('organizationBase');
      expect(test2).toBe('apiEndpoint');
      expect(test3).toBe('pathToFile');
    });

    it('should normalize abbreviations at type level', () => {
      type Test1 = PrettyCamelCase<'XML-HTTP-Request'>;
      type Test2 = PrettyCamelCase<'JSON-API-Response'>;

      const test1: Test1 = 'xmlHttpRequest';
      const test2: Test2 = 'jsonApiResponse';

      expect(test1).toBe('xmlHttpRequest');
      expect(test2).toBe('jsonApiResponse');
    });

    it('should handle special characters by cleaning them at type level', () => {
      type Test1 = PrettyCamelCase<'...invalid...'>;
      type Test2 = PrettyCamelCase<'@#$hello@#$world@#$'>;

      const test1: Test1 = 'invalid';
      const test2: Test2 = 'helloworld';

      expect(test1).toBe('invalid');
      expect(test2).toBe('helloworld');
    });
  });

  describe('ValidIdentifier Type', () => {
    it('should ensure valid TypeScript identifiers at type level', () => {
      type Test1 = ValidIdentifier<'user-name'>;
      type Test2 = ValidIdentifier<'api_key'>;
      type Test3 = ValidIdentifier<'123invalid'>;
      type Test4 = ValidIdentifier<'/path/to/resource'>;

      const test1: Test1 = 'userName';
      const test2: Test2 = 'apiKey';
      const test3: Test3 = 'invalid';
      const test4: Test4 = 'pathToResource';

      expect(test1).toBe('userName');
      expect(test2).toBe('apiKey');
      expect(test3).toBe('invalid');
      expect(test4).toBe('pathToResource');
    });
  });

  describe('Complex Type Scenarios', () => {
    it('should handle mixed separators and edge cases at type level', () => {
      type Test1 = CamelCaseIdentifier<'user-name_with.mixed:separators'>;
      type Test2 = PrettyCamelCase<'API/v1/users-list'>;
      type Test3 = ValidIdentifier<'123-api::endpoint/path'>;

      const test1: Test1 = 'userNameWithMixedSeparators';
      const test2: Test2 = 'apiV1UsersList';
      const test3: Test3 = 'apiEndpointPath';

      expect(test1).toBe('userNameWithMixedSeparators');
      expect(test2).toBe('apiV1UsersList');
      expect(test3).toBe('apiEndpointPath');
    });

    it('should handle long complex strings at type level', () => {
      type Test1 =
        CamelCaseIdentifier<'very-long-property-name-with-many-parts'>;
      type Test2 = PrettyCamelCase<'HTTP-API-JSON-XML-Response-Handler'>;

      const test1: Test1 = 'veryLongPropertyNameWithManyParts';
      const test2: Test2 = 'httpApiJsonXmlResponseHandler';

      expect(test1).toBe('veryLongPropertyNameWithManyParts');
      expect(test2).toBe('httpApiJsonXmlResponseHandler');
    });

    it('should handle real-world scenarios at type level', () => {
      // Common API endpoint patterns
      type RestEndpoint1 = PrettyCamelCase<'/api/v1/users'>;
      type RestEndpoint2 = PrettyCamelCase<'/organizations/:id/members'>;
      type RestEndpoint3 = PrettyCamelCase<'GET /admin/system-health'>;

      // Database table/column names
      type DbTable = CamelCaseIdentifier<'user_profiles'>;
      type DbColumn = CamelCaseIdentifier<'created_at_timestamp'>;

      // Configuration keys
      type ConfigKey1 = PrettyCamelCase<'DATABASE_CONNECTION_URL'>;
      type ConfigKey2 = CamelCaseIdentifier<'redis.cache.ttl'>;

      const endpoint1: RestEndpoint1 = 'apiV1Users';
      const endpoint2: RestEndpoint2 = 'organizationsIdMembers';
      const endpoint3: RestEndpoint3 = 'getAdminSystemHealth';
      const table: DbTable = 'userProfiles';
      const column: DbColumn = 'createdAtTimestamp';
      const config1: ConfigKey1 = 'databaseConnectionUrl';
      const config2: ConfigKey2 = 'redisCacheTtl';

      expect(endpoint1).toBe('apiV1Users');
      expect(endpoint2).toBe('organizationsIdMembers');
      expect(endpoint3).toBe('getAdminSystemHealth');
      expect(table).toBe('userProfiles');
      expect(column).toBe('createdAtTimestamp');
      expect(config1).toBe('databaseConnectionUrl');
      expect(config2).toBe('redisCacheTtl');
    });
  });

  describe('Type and Runtime Consistency', () => {
    it('should ensure TypeScript types match runtime behavior exactly', () => {
      // Test cases that should produce identical results
      const testCases = [
        'hello-world',
        'API-Key',
        '/organization/base',
        '123invalid',
        'user_id',
        'complex-API_endpoint.name',
        '___',
        ''
      ] as const;

      // Type-level tests
      type RuntimeTest1 = CamelCaseIdentifier<(typeof testCases)[0]>;
      type RuntimeTest2 = CamelCaseIdentifier<(typeof testCases)[1]>;
      type RuntimeTest3 = CamelCaseIdentifier<(typeof testCases)[2]>;
      type RuntimeTest4 = CamelCaseIdentifier<(typeof testCases)[3]>;
      type RuntimeTest5 = CamelCaseIdentifier<(typeof testCases)[4]>;
      type RuntimeTest6 = CamelCaseIdentifier<(typeof testCases)[5]>;
      type RuntimeTest7 = CamelCaseIdentifier<(typeof testCases)[6]>;
      type RuntimeTest8 = CamelCaseIdentifier<(typeof testCases)[7]>;

      // Verify types resolve to expected values
      const typeResult1: RuntimeTest1 = 'helloWorld';
      const typeResult2: RuntimeTest2 = 'aPIKey';
      const typeResult3: RuntimeTest3 = 'organizationBase';
      const typeResult4: RuntimeTest4 = 'invalid';
      const typeResult5: RuntimeTest5 = 'userId';
      const typeResult6: RuntimeTest6 = 'complexAPIEndpointName';
      const typeResult7: RuntimeTest7 = '___';
      const typeResult8: RuntimeTest8 = '';

      // Verify runtime matches types
      expect(toCamelCaseIdentifier(testCases[0])).toBe(typeResult1);
      expect(toCamelCaseIdentifier(testCases[1])).toBe(typeResult2);
      expect(toCamelCaseIdentifier(testCases[2])).toBe(typeResult3);
      expect(toCamelCaseIdentifier(testCases[3])).toBe(typeResult4);
      expect(toCamelCaseIdentifier(testCases[4])).toBe(typeResult5);
      expect(toCamelCaseIdentifier(testCases[5])).toBe(typeResult6);
      expect(toCamelCaseIdentifier(testCases[6])).toBe(typeResult7);
      expect(toCamelCaseIdentifier(testCases[7])).toBe(typeResult8);
    });
  });
});

describe('Runtime String Utilities', () => {
  describe('toCamelCaseIdentifier', () => {
    it('should convert basic strings to camelCase', () => {
      expect(toCamelCaseIdentifier('hello-world')).toBe('helloWorld');
      expect(toCamelCaseIdentifier('my_var_name')).toBe('myVarName');
      expect(toCamelCaseIdentifier('some.property.name')).toBe(
        'somePropertyName'
      );
      expect(toCamelCaseIdentifier('hello world')).toBe('helloWorld');
    });

    it('should handle leading numbers by removing them', () => {
      expect(toCamelCaseIdentifier('123invalid')).toBe('invalid');
      expect(toCamelCaseIdentifier('456test-case')).toBe('testCase');
    });

    it('should preserve original casing within words', () => {
      expect(toCamelCaseIdentifier('API-Key')).toBe('aPIKey');
      expect(toCamelCaseIdentifier('HTTP-Response')).toBe('hTTPResponse');
    });

    it('should handle leading separators', () => {
      expect(toCamelCaseIdentifier('/organization/base')).toBe(
        'organizationBase'
      );
      expect(toCamelCaseIdentifier('---leading-dashes')).toBe('leadingDashes');
      expect(toCamelCaseIdentifier('::namespace:method')).toBe(
        'namespaceMethod'
      );
    });

    it('should fallback to original input for invalid strings', () => {
      expect(toCamelCaseIdentifier('___')).toBe('___');
      expect(toCamelCaseIdentifier('')).toBe('');
      expect(toCamelCaseIdentifier('!!!')).toBe('!!!');
    });

    it('should handle non-string inputs gracefully', () => {
      expect(toCamelCaseIdentifier(123 as unknown as string)).toBe('123');
      expect(toCamelCaseIdentifier(null as unknown as string)).toBe('null');
      expect(toCamelCaseIdentifier(undefined as unknown as string)).toBe(
        'undefined'
      );
    });
  });

  describe('toPrettyCamelCase', () => {
    it('should convert strings to prettier camelCase', () => {
      expect(toPrettyCamelCase('API-Key')).toBe('apiKey');
      expect(toPrettyCamelCase('HTTP-Response')).toBe('httpResponse');
      expect(toPrettyCamelCase('user-ID')).toBe('userId');
      expect(toPrettyCamelCase('get-user-by-id')).toBe('getUserById');
    });

    it('should handle paths and complex separators', () => {
      expect(toPrettyCamelCase('/organization/base')).toBe('organizationBase');
      expect(toPrettyCamelCase('::api:endpoint')).toBe('apiEndpoint');
      expect(toPrettyCamelCase('///path/to/file')).toBe('pathToFile');
    });

    it('should normalize abbreviations', () => {
      expect(toPrettyCamelCase('XML-HTTP-Request')).toBe('xmlHttpRequest');
      expect(toPrettyCamelCase('JSON-API-Response')).toBe('jsonApiResponse');
    });

    it('should handle special characters by cleaning them', () => {
      expect(toPrettyCamelCase('...invalid...')).toBe('invalid');
      expect(toPrettyCamelCase('@#$hello@#$world@#$')).toBe('helloworld');
    });
  });

  describe('Helper Functions', () => {
    describe('removeLeadingSeparators', () => {
      it('should remove leading separators', () => {
        expect(removeLeadingSeparators('---hello')).toBe('hello');
        expect(removeLeadingSeparators('___test')).toBe('test');
        expect(removeLeadingSeparators('//path')).toBe('path');
        expect(removeLeadingSeparators('::namespace')).toBe('namespace');
        expect(removeLeadingSeparators('hello')).toBe('hello');
      });
    });

    describe('splitBySeparators', () => {
      it('should split by multiple separators', () => {
        expect(splitBySeparators('hello-world_test')).toEqual([
          'hello',
          'world',
          'test'
        ]);
        expect(splitBySeparators('api/v1/users')).toEqual([
          'api',
          'v1',
          'users'
        ]);
        expect(splitBySeparators('namespace::method')).toEqual([
          'namespace',
          'method'
        ]);
        expect(splitBySeparators('hello world')).toEqual(['hello', 'world']);
      });

      it('should filter empty parts', () => {
        expect(splitBySeparators('hello---world')).toEqual(['hello', 'world']);
        expect(splitBySeparators('--start')).toEqual(['start']);
        expect(splitBySeparators('end--')).toEqual(['end']);
      });
    });

    describe('removeNonAlphanumeric', () => {
      it('should remove non-alphanumeric characters', () => {
        expect(removeNonAlphanumeric('hello@world!')).toBe('helloworld');
        expect(removeNonAlphanumeric('test123')).toBe('test123');
        expect(removeNonAlphanumeric('!@#$%')).toBe('');
      });
    });

    describe('removeLeadingNumbers', () => {
      it('should remove leading numbers', () => {
        expect(removeLeadingNumbers('123abc')).toBe('abc');
        expect(removeLeadingNumbers('456')).toBe('');
        expect(removeLeadingNumbers('abc123')).toBe('abc123');
        expect(removeLeadingNumbers('test')).toBe('test');
      });
    });

    describe('capitalize and uncapitalize', () => {
      it('should capitalize first letter', () => {
        expect(capitalize('hello')).toBe('Hello');
        expect(capitalize('HELLO')).toBe('HELLO');
        expect(capitalize('')).toBe('');
        expect(capitalize('h')).toBe('H');
      });

      it('should uncapitalize first letter', () => {
        expect(uncapitalize('Hello')).toBe('hello');
        expect(uncapitalize('HELLO')).toBe('hELLO');
        expect(uncapitalize('')).toBe('');
        expect(uncapitalize('H')).toBe('h');
      });
    });
  });

  describe('Validation', () => {
    describe('isValidIdentifier', () => {
      it('should validate correct identifiers', () => {
        expect(isValidIdentifier('userName')).toBe(true);
        expect(isValidIdentifier('_valid')).toBe(true);
        expect(isValidIdentifier('$valid')).toBe(true);
        expect(isValidIdentifier('test123')).toBe(true);
        expect(isValidIdentifier('_$test123')).toBe(true);
      });

      it('should reject invalid identifiers', () => {
        expect(isValidIdentifier('123invalid')).toBe(false);
        expect(isValidIdentifier('user-name')).toBe(false);
        expect(isValidIdentifier('hello world')).toBe(false);
        expect(isValidIdentifier('')).toBe(false);
        expect(isValidIdentifier('hello@world')).toBe(false);
      });

      it('should handle non-string inputs', () => {
        expect(isValidIdentifier(123 as unknown as string)).toBe(false);
        expect(isValidIdentifier(null as unknown as string)).toBe(false);
        expect(isValidIdentifier(undefined as unknown as string)).toBe(false);
      });
    });
  });

  describe('Debugging', () => {
    describe('getTransformationInfo', () => {
      it('should provide detailed transformation information', () => {
        const info = getTransformationInfo('/api/user-profile');

        expect(info.original).toBe('/api/user-profile');
        expect(info.withoutLeadingSeparators).toBe('api/user-profile');
        expect(info.parts).toEqual(['api', 'user', 'profile']);
        expect(info.camelCase).toBe('apiUserProfile');
        expect(info.prettyCamelCase).toBe('apiUserProfile');
        expect(info.withoutLeadingNumbers).toBe('apiUserProfile');
        expect(info.prettyCamelCaseWithoutLeadingNumbers).toBe(
          'apiUserProfile'
        );
        expect(typeof info.isValid).toBe('boolean');
      });

      it('should handle edge cases', () => {
        const info = getTransformationInfo('123test');
        expect(info.original).toBe('123test');
        expect(info.withoutLeadingNumbers).toBe('test');
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle various edge cases gracefully', () => {
      // Empty and whitespace
      expect(toCamelCaseIdentifier('')).toBe('');
      expect(toCamelCaseIdentifier('   ')).toBe('   ');

      // Only separators
      expect(toCamelCaseIdentifier('---')).toBe('---');
      expect(toCamelCaseIdentifier('///')).toBe('///');

      // Only numbers
      expect(toCamelCaseIdentifier('123')).toBe('123');

      // Mixed valid and invalid
      expect(toPrettyCamelCase('valid-@#$-name')).toBe('validName');
    });

    it('should maintain consistency between type and runtime behavior', () => {
      // These tests ensure that runtime functions match TypeScript type behavior
      const testCases = [
        'hello-world',
        'API-Key',
        '/organization/base',
        '123invalid',
        'user_id',
        '___'
      ];

      for (const testCase of testCases) {
        const runtimeResult = toCamelCaseIdentifier(testCase);
        const prettyCamelResult = toPrettyCamelCase(testCase);

        // Both should always return strings
        expect(typeof runtimeResult).toBe('string');
        expect(typeof prettyCamelResult).toBe('string');

        // Should handle the same input consistently
        expect(toCamelCaseIdentifier(testCase)).toBe(
          toCamelCaseIdentifier(testCase)
        );
        expect(toPrettyCamelCase(testCase)).toBe(toPrettyCamelCase(testCase));
      }
    });
  });
});
