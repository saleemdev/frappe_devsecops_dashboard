# Software Product Zenhub Hook - Unit Tests

## Overview

This test suite validates the automatic Zenhub workspace creation hook for Software Products. The hook creates a workspace with the format `DSO-T{docname}` when a Software Product is saved without a `zenhub_workspace_id`.

## Test File

`test_software_product_zenhub_hook.py`

## Running the Tests

### Run all tests in the suite:
```bash
bench --site <site> run-tests --module tests.test_software_product_zenhub_hook
```

### Run a specific test:
```bash
bench --site <site> console
```

```python
import unittest
from frappe_devsecops_dashboard.tests.test_software_product_zenhub_hook import TestSoftwareProductZenhubHook

# Run specific test
suite = unittest.TestLoader().loadTestsFromName(
    'TestSoftwareProductZenhubHook.test_create_workspace_for_new_product'
)
runner = unittest.TextTestRunner(verbosity=2)
runner.run(suite)
```

## Test Cases

### 1. `test_create_workspace_for_new_product`
- **Purpose**: Verify workspace is created when saving a new Software Product
- **Mocks**: Zenhub API `createWorkspace` mutation
- **Asserts**: 
  - Workspace ID is set after save
  - Workspace name follows `DSO-T{docname}` format

### 2. `test_skip_workspace_creation_if_id_exists`
- **Purpose**: Verify workspace is not created if `zenhub_workspace_id` already exists
- **Mocks**: None (API should not be called)
- **Asserts**: 
  - API is not called
  - Existing workspace ID is preserved

### 3. `test_workspace_name_format`
- **Purpose**: Verify workspace name follows `DSO-T{docname}` format
- **Mocks**: Zenhub API `createWorkspace` mutation
- **Asserts**: Workspace name in API call matches expected format

### 4. `test_use_existing_workspace_if_found`
- **Purpose**: Verify existing workspace is reused if found by name
- **Mocks**: Zenhub API `searchWorkspaces` query
- **Asserts**: 
  - Existing workspace ID is used
  - No new workspace is created

### 5. `test_error_handling_on_api_failure`
- **Purpose**: Verify document save succeeds even if workspace creation fails
- **Mocks**: Zenhub API error
- **Asserts**: Document is saved despite API error

### 6. `test_workspace_creation_with_description`
- **Purpose**: Verify workspace description includes product information
- **Mocks**: Zenhub API `createWorkspace` mutation
- **Asserts**: Description includes product name and details

### 7. `test_update_existing_product_without_workspace`
- **Purpose**: Verify workspace is created when updating existing product without workspace ID
- **Mocks**: Zenhub API `createWorkspace` mutation
- **Asserts**: Workspace ID is set after update

### 8. `test_search_workspace_by_name_function`
- **Purpose**: Test the `search_workspace_by_name` function directly
- **Mocks**: Zenhub API `searchWorkspaces` query
- **Asserts**: Returns correct workspace data when found

### 9. `test_search_workspace_by_name_not_found`
- **Purpose**: Test `search_workspace_by_name` when workspace doesn't exist
- **Mocks**: Zenhub API `searchWorkspaces` query (empty result)
- **Asserts**: Returns `None` when workspace not found

### 10. `test_create_zenhub_workspace_function`
- **Purpose**: Test the `create_zenhub_workspace` function directly
- **Mocks**: Zenhub API `createWorkspace` mutation
- **Asserts**: Returns success with workspace data

### 11. `test_create_zenhub_workspace_with_errors`
- **Purpose**: Test `create_zenhub_workspace` when API returns errors
- **Mocks**: Zenhub API error response
- **Asserts**: Raises `frappe.ValidationError` on API errors

## Test Setup

### Prerequisites
- Zenhub Settings doctype must exist
- Test Zenhub token is configured in setUp

### Test Fixtures
- Creates test Zenhub Settings with mock token
- Cleans up test Software Products after each test
- Clears Zenhub token cache

## Mocking Strategy

All Zenhub API calls are mocked using `unittest.mock.patch` to:
- Avoid actual API calls during testing
- Control API responses for different scenarios
- Test error handling without affecting real Zenhub workspaces

### Mocked Functions
- `frappe_devsecops_dashboard.doc_hooks.software_product_zenhub.execute_graphql_query`

## Expected Test Results

When all tests pass:
```
Ran 11 tests in X.XXXs

OK
```

## Troubleshooting

### Test Failures

1. **Mandatory Field Errors**
   - Ensure all required fields (`product_name`, `description`, `version`) are set in test cases

2. **Mock Not Working**
   - Verify patch decorator is correctly applied
   - Check that mock is called with correct arguments

3. **Hook Not Triggering**
   - Ensure hook is registered in `hooks.py`
   - Clear cache: `bench --site <site> clear-cache`

4. **Database Errors**
   - Ensure test cleanup in `tearDown` is working
   - Check for duplicate product names

## Integration with CI/CD

These tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run Software Product Zenhub Hook Tests
  run: |
    bench --site test_site run-tests \
      --module tests.test_software_product_zenhub_hook \
      --app frappe_devsecops_dashboard
```

## Coverage

The test suite covers:
- ✅ Workspace creation for new products
- ✅ Skipping creation when ID exists
- ✅ Workspace name format validation
- ✅ Existing workspace reuse
- ✅ Error handling
- ✅ Description inclusion
- ✅ Update scenarios
- ✅ Helper function testing

---

**Last Updated**: 2025-01-14  
**Version**: 1.0.0

