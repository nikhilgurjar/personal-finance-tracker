import React from 'react';

export const ExpenseForm = () => {
  return (
    <form>
      <label>
        Amount:
        <input type="number" name="amount" />
      </label>
      <label>
        Category:
        <input type="text" name="category" />
      </label>
      <button type="submit">Add Expense</button>
    </form>
  );
};