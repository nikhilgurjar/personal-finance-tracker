import { db } from './firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { getFiscalYear } from './utils/date';

/**
 * Creates a transaction, updates the monthly summary, adjusts account balances, and writes an audit log.
 */
export async function createTransactionWithSummary(userId: string, txData: any) {
  const batch = db.batch();
  
  const txRef = db.collection('users').doc(userId).collection('transactions').doc();
  const txId = txRef.id;
  
  const date = new Date(txData.date);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const salaryMonth = `${yyyy}-${mm}`;
  const fiscalYear = getFiscalYear(txData.date);
  
  const finalTxData = {
    ...txData,
    id: txId,
    salaryMonth,
    fiscalYear,
    createdAt: Date.now(),
    createdBy: userId,
  };
  
  batch.set(txRef, finalTxData);
  
  // 2. Update monthly summaries
  const summaryRef = db.collection('users').doc(userId).collection('summaries').doc(salaryMonth);
  const summaryUpdate: any = {};
  const amount = txData.amount;
  
  if (txData.type === 'expense') {
    summaryUpdate.expenses = FieldValue.increment(amount);
    if (txData.category) {
      summaryUpdate[`categories.${txData.category}`] = FieldValue.increment(amount);
    }
  } else if (txData.type === 'income' || txData.type === 'salary') {
    summaryUpdate.income = FieldValue.increment(amount);
  } else if (txData.type === 'savings') {
    summaryUpdate.savings = FieldValue.increment(amount);
  }
  
  batch.set(summaryRef, summaryUpdate, { merge: true });
  
  // 3. Update account balances
  if (txData.fromAccountId) {
    const fromAccRef = db.collection('users').doc(userId).collection('accounts').doc(txData.fromAccountId);
    batch.update(fromAccRef, {
      balance: FieldValue.increment(-amount),
      updatedAt: Date.now(),
    });
  }
  
  if (txData.toAccountId) {
    const toAccRef = db.collection('users').doc(userId).collection('accounts').doc(txData.toAccountId);
    batch.update(toAccRef, {
      balance: FieldValue.increment(amount),
      updatedAt: Date.now(),
    });
  }
  
  // 4. Create Audit Log
  const auditRef = db.collection('users').doc(userId).collection('auditLogs').doc();
  batch.set(auditRef, {
    id: auditRef.id,
    entity: 'transaction',
    entityId: txId,
    action: 'create',
    before: null,
    after: finalTxData,
    by: userId,
    at: Date.now(),
    reason: txData.scheduleId ? 'schedule' : 'manual',
  });
  
  await batch.commit();
  return finalTxData;
}

/**
 * Deletes a transaction, reverses monthly summary adjustments, restores account balances, and writes an audit log.
 */
export async function deleteTransactionWithSummary(userId: string, txId: string, currentTx: any) {
  const batch = db.batch();
  
  const txRef = db.collection('users').doc(userId).collection('transactions').doc(txId);
  batch.delete(txRef);
  
  // Reverse monthly summaries
  const salaryMonth = currentTx.salaryMonth;
  const amount = currentTx.amount;
  const summaryRef = db.collection('users').doc(userId).collection('summaries').doc(salaryMonth);
  const summaryUpdate: any = {};
  
  if (currentTx.type === 'expense') {
    summaryUpdate.expenses = FieldValue.increment(-amount);
    if (currentTx.category) {
      summaryUpdate[`categories.${currentTx.category}`] = FieldValue.increment(-amount);
    }
  } else if (currentTx.type === 'income' || currentTx.type === 'salary') {
    summaryUpdate.income = FieldValue.increment(-amount);
  } else if (currentTx.type === 'savings') {
    summaryUpdate.savings = FieldValue.increment(-amount);
  }
  
  batch.set(summaryRef, summaryUpdate, { merge: true });
  
  // Restore account balances (reverse direction)
  if (currentTx.fromAccountId) {
    const fromAccRef = db.collection('users').doc(userId).collection('accounts').doc(currentTx.fromAccountId);
    batch.update(fromAccRef, {
      balance: FieldValue.increment(amount),
      updatedAt: Date.now(),
    });
  }
  
  if (currentTx.toAccountId) {
    const toAccRef = db.collection('users').doc(userId).collection('accounts').doc(currentTx.toAccountId);
    batch.update(toAccRef, {
      balance: FieldValue.increment(-amount),
      updatedAt: Date.now(),
    });
  }
  
  // Create Audit Log
  const auditRef = db.collection('users').doc(userId).collection('auditLogs').doc();
  batch.set(auditRef, {
    id: auditRef.id,
    entity: 'transaction',
    entityId: txId,
    action: 'delete',
    before: currentTx,
    after: null,
    by: userId,
    at: Date.now(),
    reason: 'manual',
  });
  
  await batch.commit();
}

/**
 * Updates a transaction by running a deletion-like reversal of the old data followed by a creation-like application of the new data.
 */
export async function updateTransactionWithSummary(userId: string, txId: string, oldTx: any, newTxData: any) {
  const batch = db.batch();
  
  const txRef = db.collection('users').doc(userId).collection('transactions').doc(txId);
  
  const date = new Date(newTxData.date);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const salaryMonth = `${yyyy}-${mm}`;
  const fiscalYear = getFiscalYear(newTxData.date);
  
  const finalTxData = {
    ...newTxData,
    id: txId,
    salaryMonth,
    fiscalYear,
    createdAt: oldTx.createdAt,
    createdBy: userId,
    updatedAt: Date.now(),
  };
  
  batch.set(txRef, finalTxData);
  
  // 1. Reverse old transaction contributions from summary & balances
  const oldSummaryRef = db.collection('users').doc(userId).collection('summaries').doc(oldTx.salaryMonth);
  const oldSummaryUpdate: any = {};
  if (oldTx.type === 'expense') {
    oldSummaryUpdate.expenses = FieldValue.increment(-oldTx.amount);
    if (oldTx.category) oldSummaryUpdate[`categories.${oldTx.category}`] = FieldValue.increment(-oldTx.amount);
  } else if (oldTx.type === 'income' || oldTx.type === 'salary') {
    oldSummaryUpdate.income = FieldValue.increment(-oldTx.amount);
  } else if (oldTx.type === 'savings') {
    oldSummaryUpdate.savings = FieldValue.increment(-oldTx.amount);
  }
  batch.set(oldSummaryRef, oldSummaryUpdate, { merge: true });
  
  if (oldTx.fromAccountId) {
    const fromAccRef = db.collection('users').doc(userId).collection('accounts').doc(oldTx.fromAccountId);
    batch.update(fromAccRef, { balance: FieldValue.increment(oldTx.amount) });
  }
  if (oldTx.toAccountId) {
    const toAccRef = db.collection('users').doc(userId).collection('accounts').doc(oldTx.toAccountId);
    batch.update(toAccRef, { balance: FieldValue.increment(-oldTx.amount) });
  }
  
  // 2. Apply new transaction contributions to summary & balances
  const newSummaryRef = db.collection('users').doc(userId).collection('summaries').doc(salaryMonth);
  const newSummaryUpdate: any = {};
  if (finalTxData.type === 'expense') {
    newSummaryUpdate.expenses = FieldValue.increment(finalTxData.amount);
    if (finalTxData.category) newSummaryUpdate[`categories.${finalTxData.category}`] = FieldValue.increment(finalTxData.amount);
  } else if (finalTxData.type === 'income' || finalTxData.type === 'salary') {
    newSummaryUpdate.income = FieldValue.increment(finalTxData.amount);
  } else if (finalTxData.type === 'savings') {
    newSummaryUpdate.savings = FieldValue.increment(finalTxData.amount);
  }
  batch.set(newSummaryRef, newSummaryUpdate, { merge: true });
  
  if (finalTxData.fromAccountId) {
    const fromAccRef = db.collection('users').doc(userId).collection('accounts').doc(finalTxData.fromAccountId);
    batch.update(fromAccRef, { balance: FieldValue.increment(-finalTxData.amount) });
  }
  if (finalTxData.toAccountId) {
    const toAccRef = db.collection('users').doc(userId).collection('accounts').doc(finalTxData.toAccountId);
    batch.update(toAccRef, { balance: FieldValue.increment(finalTxData.amount) });
  }
  
  // 3. Create Audit Log
  const auditRef = db.collection('users').doc(userId).collection('auditLogs').doc();
  batch.set(auditRef, {
    id: auditRef.id,
    entity: 'transaction',
    entityId: txId,
    action: 'update',
    before: oldTx,
    after: finalTxData,
    by: userId,
    at: Date.now(),
    reason: 'manual',
  });
  
  await batch.commit();
  return finalTxData;
}
