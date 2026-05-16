import React from 'react';

export const SalaryForm = () => {
  return (
    <form>
      <h2>Salary Form</h2>
      <label>
        Amount:
        <input type="number" name="amount" />
      </label>
      <label>
        Employer:
        <input type="text" name="employer" />
      </label>
      <label>
        Month:
        <input type="month" name="month" />
      </label>
      <button type="submit">Submit</button>
    </form>
  );
};