import { describe, expect, it } from 'vitest';
import { openApiCompliantPath } from '../src/openApiCompliantPath';

describe('openApiCompliantPath', () => {
  it('should convert single Express parameter to OpenAPI format', () => {
    const result = openApiCompliantPath('/users/:id');
    expect(result).toBe('/users/{id}');
  });

  it('should convert multiple Express parameters to OpenAPI format', () => {
    const result = openApiCompliantPath('/users/:id/posts/:postId');
    expect(result).toBe('/users/{id}/posts/{postId}');
  });

  it('should handle complex paths with multiple parameters', () => {
    const result = openApiCompliantPath(
      '/api/v1/products/:productId/reviews/:reviewId'
    );
    expect(result).toBe('/api/v1/products/{productId}/reviews/{reviewId}');
  });

  it('should handle paths with parameters at different positions', () => {
    const result = openApiCompliantPath(
      '/:category/items/:itemId/details/:detailId/edit'
    );
    expect(result).toBe('/{category}/items/{itemId}/details/{detailId}/edit');
  });

  it('should handle paths with no parameters', () => {
    const result = openApiCompliantPath('/users/profile/settings');
    expect(result).toBe('/users/profile/settings');
  });

  it('should handle empty string', () => {
    const result = openApiCompliantPath('');
    expect(result).toBe('');
  });

  it('should handle root path with parameter', () => {
    const result = openApiCompliantPath('/:id');
    expect(result).toBe('/{id}');
  });

  it('should handle parameters with underscores', () => {
    const result = openApiCompliantPath('/users/:user_id/posts/:post_id');
    expect(result).toBe('/users/{user_id}/posts/{post_id}');
  });

  it('should handle parameters with numbers', () => {
    const result = openApiCompliantPath('/api/v1/:param1/data/:param2');
    expect(result).toBe('/api/v1/{param1}/data/{param2}');
  });

  it('should handle mixed alphanumeric parameter names', () => {
    const result = openApiCompliantPath('/items/:itemId123/versions/:v2');
    expect(result).toBe('/items/{itemId123}/versions/{v2}');
  });

  it('should handle consecutive parameters', () => {
    const result = openApiCompliantPath('/api/:version/:resource/:id');
    expect(result).toBe('/api/{version}/{resource}/{id}');
  });

  it('should handle parameters at the end of path', () => {
    const result = openApiCompliantPath('/api/users/:userId');
    expect(result).toBe('/api/users/{userId}');
  });

  it('should handle single character parameters', () => {
    const result = openApiCompliantPath('/items/:a/details/:b');
    expect(result).toBe('/items/{a}/details/{b}');
  });

  it('should handle long parameter names', () => {
    const result = openApiCompliantPath(
      '/users/:veryLongParameterNameForTesting'
    );
    expect(result).toBe('/users/{veryLongParameterNameForTesting}');
  });

  it('should not modify already OpenAPI-compliant paths', () => {
    const result = openApiCompliantPath('/users/{id}/posts/{postId}');
    expect(result).toBe('/users/{id}/posts/{postId}');
  });

  it('should handle mixed Express and OpenAPI format (edge case)', () => {
    const result = openApiCompliantPath('/users/{id}/posts/:postId');
    expect(result).toBe('/users/{id}/posts/{postId}');
  });

  it('should handle paths with file extensions', () => {
    const result = openApiCompliantPath('/files/:filename.pdf/download/:id');
    expect(result).toBe('/files/{filename}.pdf/download/{id}');
  });

  it('should handle special characters in non-parameter segments', () => {
    const result = openApiCompliantPath('/api-v1/users_:id/posts-:postId');
    expect(result).toBe('/api-v1/users_{id}/posts-{postId}');
  });
});
