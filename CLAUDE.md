# CLAUDE.md — MultiShop

## 1. Project Identity

MultiShop is an e-commerce shoes/shopping website.

This is an existing application. Your responsibility is to
understand and maintain its current architecture.

## 2. Technology Stack

- Node.js
- TypeScript 5.9
- Express.js 4
- MongoDB
- Mongoose 6
- EJS templates
- JavaScript
- CSS
- Socket.IO
- JWT authentication
- bcryptjs
- Multer for file uploads

## 3. Project Structure

### Application

- src/server.ts
- src/app.ts

### Routing

- src/router.ts
- src/router-admin.ts

### Controllers

- src/controllers/

### Services

- src/model/

### Database Models

- src/schema/

### Shared Libraries

- src/libs/
- src/libs/types/
- src/libs/enums/
- src/libs/utils/

### Frontend

- src/views/
- src/public/css/
- src/public/js/
- src/public/img/

### Build

- TypeScript output: dist/
- TypeScript configuration: tsconfig.json

## 4. Architecture Rules

Follow the existing architecture:

- Routers handle endpoint definitions.
- Controllers handle HTTP request/response logic.
- Services contain business logic.
- Schemas define MongoDB models.
- Shared types define application data structures.

These are expected responsibilities. Verify their actual
implementation before making architectural decisions.

Do not move files or restructure layers without approval.

## 5. Coding Standards

- Use TypeScript strictly.
- Prefer async/await.
- Use try/catch for asynchronous error handling.
- Avoid unnecessary any types.
- Reuse existing interfaces and types.
- Follow existing naming conventions.
- Avoid unnecessary dependencies.
- Do not duplicate existing business logic.

## 6. Database Rules

- Use existing Mongoose models and conventions.
- Understand schemas before modifying them.
- Never delete existing data.
- Never reset the database.
- Explain schema and migration implications before changes.

## 7. Authentication and Security

- Inspect JWT and session implementations.
- Understand cookie configuration.
- Inspect authentication middleware.
- Never expose .env files or credentials.
- Never print tokens, secrets or passwords.
- Never weaken authentication to bypass errors.
- Validate user input and protect sensitive routes.

## 8. Frontend Rules

- Preserve existing EJS architecture.
- Follow existing JavaScript and CSS conventions.
- Do not introduce React or another frontend framework
  without explicit approval.
- Keep frontend and backend behavior consistent.

## 9. Development Commands

- npm run dev: Development server
- npm start: Start application
- npm run build: Compile TypeScript and run extra build step
- npm run start:prod: Start compiled application

Inspect package.json before executing commands.
The current test script is only a placeholder.

## 10. Agent Workflow

For every task:

1. Explore existing implementation.
2. Identify affected files.
3. Trace dependencies and request flow.
4. Explain the current behavior.
5. Prepare an implementation plan.
6. Identify risks and possible breaking changes.
7. Wait for approval before modifications.
8. Implement incrementally.
9. Run appropriate tests and checks.
10. Report all changes and verification results.

## 11. Important Instructions

- Never assume functionality based only on filenames.
- Never read or print .env.
- Never modify production configuration.
- Never make destructive changes without explicit approval.
- Distinguish confirmed bugs from potential improvements.
- Ask questions when important requirements are unclear.
