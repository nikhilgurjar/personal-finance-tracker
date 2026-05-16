# Architecture Prompt: Firestore Schema and Refactor Instructions

## Firestore Collections and Schemas

### 1. Accounts

Path: `/users/{userId}/accounts/{accountId}`

```json
{
  "id": "string",
  "name": "string",
  "type": "bank | cash | wallet | credit_card",
  "balance": "number",
  "currency": "string",
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

### 2. Expenses

Path: `/users/{userId}/expenses/{expenseId}`

```json
{
  "id": "string",
  "date": "Timestamp",
  "amount": "number",
  "categoryId": "string",
  "accountId": "string | null",
  "description": "string | null",
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

### 3. Incomes

Path: `/users/{userId}/incomes/{incomeId}`

```json
{
  "id": "string",
  "date": "Timestamp",
  "amount": "number",
  "toAccountId": "string",
  "source": "string",
  "notes": "string | null",
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

### 4. Transfers

Path: `/users/{userId}/transfers/{transferId}`

```json
{
  "id": "string",
  "date": "Timestamp",
  "amount": "number",
  "fromAccountId": "string",
  "toAccountId": "string",
  "note": "string | null",
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

### 5. Savings

Path: `/users/{userId}/savings/{savingId}`

```json
{
  "id": "string",
  "date": "Timestamp",
  "amount": "number",
  "fromAccountId": "string",
  "savingsInstrument": {
    "type": "string",
    "provider": "string",
    "instrumentId": "string | null"
  },
  "direction": "in | out",
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

### 6. Salaries

Path: `/users/{userId}/salaries/{salaryId}`

```json
{
  "id": "string",
  "month": "string",
  "date": "Timestamp",
  "amount": "number",
  "toAccountId": "string",
  "employer": "string",
  "recurringRuleId": "string | null",
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

### 7. Audit Logs

Path: `/users/{userId}/auditLogs/{logId}`

```json
{
  "id": "string",
  "system": "expense | income | transfer | savings | salary",
  "entityId": "string",
  "action": "create | update | delete",
  "payload": "object",
  "timestamp": "Timestamp",
  "userId": "string"
}
```

## Refactor Instructions

### Backend

1. Update CRUD APIs to target the correct Firestore collections.
2. Write an audit log entry for every create, update, or delete operation.
3. Summaries and reports should aggregate data across all collections.

### Frontend

1. Create separate pages/forms for each system (Expense, Income, Transfer, Savings, Salary).
2. Update the dashboard to fetch and merge data from all collections.
3. Highlight salaries separately in the dashboard.

### TypeScript

1. Keep all types in sync with the Firestore schema.
2. Use discriminated unions for transaction types to simplify extensibility.
