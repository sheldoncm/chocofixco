# ChocoFixCo

## Module 7 — Modern Frameworks Using AI Engineering

ChocoFixCo is a chocolate e-commerce and business management
application developed using React, Express and MariaDB.

This project builds upon the previous Module 8 application,
migrating the EJS frontend to a React Single Page Application
while retaining the existing database and business logic.

## Technology Stack

- React and Vite
- JavaScript and JSX
- Axios
- Wouter
- Jotai
- Bootstrap CSS
- Express.js
- MariaDB

## Application Features

### Customer Storefront

- Dynamic chocolate catalogue
- Product availability and stock display
- Customer ordering
- Self-collection and home delivery
- Reactive order total calculation
- Order confirmation

### Business Management

- Product creation, retrieval, updating and deletion
- Product image uploads
- Product search, filtering and sorting
- Stock and availability management
- Customer order management
- Order and payment status updates
- Stock restoration upon eligible order cancellation

## Learning Outcomes

### LO1 — Reactive Frameworks

React uses declarative components and reactive state.
When state changes, React updates the relevant interface.

The frontend was created using Vite:

    npm create vite@latest frontend -- --template react

### LO2 — React Hooks and Form Processing

useState manages form inputs, navigation, loading states,
search filters and application feedback.

useEffect retrieves data from REST API endpoints.

Controlled inputs include text fields, numbers, textareas,
checkboxes, radio buttons, select controls and dates.

### LO3 — Components and Props

Reusable components include Header, Footer, Hero,
Collection, ProductCard, ProductForm and InfoRows.

Props pass data and callback functions between components.

### LO4 — State Management and CRUD

Jotai provides shared state between components.

productsAtom shares product catalogue state.

confirmationAtom shares submitted order information
between checkout and confirmation pages.

Immutable array operations:

- Create: spread operator
- Read: map and REST API retrieval
- Update: map
- Delete: filter

### LO5 — Single Page Application Routing

Wouter provides client-side navigation.

Routes:

- /
- /backend
- /manage/products
- /order/:id
- /order/confirmation/:id
- /manage/orders
- /manage/orders/:id

## REST API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /api/products | Active products |
| GET | /api/manage/products | All products |
| POST | /api/manage/products | Create product |
| PUT | /api/manage/products/:id | Update product |
| DELETE | /api/manage/products/:id | Delete product |
| GET | /api/order/:id | Retrieve checkout product |
| POST | /api/order/:id | Create customer order |
| GET | /api/manage/orders | Retrieve orders |
| GET | /api/manage/orders/:id | Retrieve order details |
| PUT | /api/manage/orders/:id | Update order status |

## Database

MariaDB stores products, customers, orders and order items.

The backend uses parameterised SQL queries, server-side
validation and database transactions.

Database transactions protect order creation, stock deduction
and cancellation stock restoration.

## Local Setup

Prerequisites:

- Node.js 22
- npm
- MariaDB
- Git

### Database Configuration

For a new database, create the chocofixco database and
import the schema.sql and seed.sql files.

Inspect delivery_migration.sql and apply it if the delivery
columns are not already included in the database schema.

Do not reseed or reset an existing working database.

Create api/.env using the supplied environment example.
Enter the correct local database credentials.

### Start Backend

    cd api
    npm ci
    node module8.js

Backend: http://localhost:3001

### Start Frontend

In a separate terminal:

    cd frontend
    npm ci
    npm run dev

Frontend: http://localhost:5173

Vite proxies API requests and static assets to Express.

## Validation

    cd frontend
    npm run lint
    npm run build

## Project Structure

    api/
      routes/
      views/
      public/
      db.js
      module8.js
    frontend/
      src/
        components/
        pages/
        state/
        utils/
      vite.config.js
    schema.sql
    seed.sql
    assessment_seed.sql
    delivery_migration.sql

## Assessment Demonstration

1. Open the React storefront.
2. Explain components, props and reactive state.
3. Navigate to Business Management.
4. Demonstrate product creation, reading, editing and deletion.
5. Explain controlled form inputs.
6. Demonstrate Jotai shared state.
7. Explain Axios REST API integration.
8. Demonstrate Wouter navigation.
9. Place a customer order.
10. Demonstrate order management and database persistence.

Learning notes are embedded throughout the source code.

## Limitations

This is a local educational assessment application.

The original Express/EJS pages remain available as a fallback.

React order confirmation is held in memory and is not retained
after a full browser refresh.

Production deployment requires authentication, authorisation,
privacy protection and additional security hardening.

No actual online payments are processed.

## AI-Assisted Development

AI assistance was used for implementation, troubleshooting,
documentation and migration guidance. The application is
developed and tested locally using Visual Studio Code.
