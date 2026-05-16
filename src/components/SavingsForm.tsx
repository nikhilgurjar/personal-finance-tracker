import React from 'react';

export const SavingsForm = () => {
  return (
    <form>
      <h2>Savings Form</h2>
      <label>
        Amount:
        <input type="number" name="amount" />
      </label>
      <label>
        Savings Instrument:
        <input type="text" name="instrument" />
      </label>
      <label>
        Direction:
        <select name="direction">
          <option value="in">Deposit</option>
          <option value="out">Withdrawal</option>
        </select>
      </label>
      <button type="submit">Submit</button>
    </form>
  );
};