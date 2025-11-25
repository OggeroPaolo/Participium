# Vitest Test Suite

This project uses **Vitest** to test components and APIs. The suite includes both unit and end-to-end tests to ensure code quality and proper functionality.

## Running Tests

### Basic Test Run
```bash
npm test
```
Runs all tests without generating coverage reports:

### Complete Test Run
```bash
npm run test:coverage
```
Runs the full test suite with coverage.  
- Prints the test coverage directly in the console.  
- Generates a detailed, interactive coverage report inside the `test/coverage` folder.

## Test Policy

The testing strategy is organized as follows:

1. **Unit/Component Testing**  
   - Tests individual components located in the `integration` folder.  
   - Ensures each component works correctly in isolation.

2. **End-to-End (E2E) Testing**  
   - Tests the complete process of the application.  
   - Verifies each API endpoint for each route to ensure proper integration and functionality.
