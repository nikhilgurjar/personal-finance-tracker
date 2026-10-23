import fs from 'fs'

const filePath = 'hooks/use-finance-data.tsx'
let content = fs.readFileSync(filePath, 'utf8')

// Add more diverse mock expenses for demo testing
const moreExpenses = [
  '{ id: "exp_7", date: "2026-05-15", category: "entertainment", amount: 1200, account: "acc_1", note: "Movie Tickets" }',
  '{ id: "exp_8", date: "2026-05-12", category: "transport", amount: 800, account: "acc_1", note: "Uber ride" }',
  '{ id: "exp_9", date: "2026-05-08", category: "health", amount: 2500, account: "acc_2", note: "Pharmacy" }',
  '{ id: "exp_10", date: "2026-05-05", category: "shopping", amount: 4500, account: "acc_1", note: "Clothes" }',
  '{ id: "exp_11", date: "2026-04-28", category: "food_dining", amount: 950, account: "acc_2", note: "Dinner" }',
  '{ id: "exp_12", date: "2026-04-22", category: "utilities", amount: 1500, account: "acc_1", note: "Phone Bill" }',
  '{ id: "exp_13", date: "2026-04-18", category: "groceries", amount: 2200, account: "acc_1", note: "Supermarket" }',
  '{ id: "exp_14", date: "2026-04-10", category: "other", amount: 500, account: "acc_3", note: "Misc" }',
  '{ id: "exp_15", date: "2026-04-05", category: "transport", amount: 300, account: "acc_1", note: "Metro card recharge" }',
  '{ id: "exp_16", date: "2026-03-25", category: "shopping", amount: 3200, account: "acc_2", note: "Shoes" }',
  '{ id: "exp_17", date: "2026-03-20", category: "food_dining", amount: 1800, account: "acc_1", note: "Lunch with team" }',
  '{ id: "exp_18", date: "2026-03-15", category: "health", amount: 1200, account: "acc_1", note: "Dentist" }',
  '{ id: "exp_19", date: "2026-03-10", category: "utilities", amount: 2800, account: "acc_1", note: "Water & Gas" }',
  '{ id: "exp_20", date: "2026-03-05", category: "entertainment", amount: 600, account: "acc_2", note: "Concert tickets" }',
]

const searchStr = `  { id: "exp_6", date: "2026-05-18", category: "groceries", amount: 1540, account: "acc_2", note: "Weekly Groceries" },\n]`
const replaceStr = `  { id: "exp_6", date: "2026-05-18", category: "groceries", amount: 1540, account: "acc_2", note: "Weekly Groceries" },\n  ${moreExpenses.join(',\n  ')}\n]`

if (content.includes(searchStr)) {
  content = content.replace(searchStr, replaceStr)
  fs.writeFileSync(filePath, content, 'utf8')
  console.log('Successfully updated demo expenses')
} else {
  console.log('Could not find the target string to replace')
}
