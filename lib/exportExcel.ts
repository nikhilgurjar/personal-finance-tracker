// lib/exportExcel.ts
import type { Goal, Saving, DebtTransaction, SIPSchedule, Income, Expense } from "@/hooks/use-finance-data"

export interface ExportDataInput {
  goals?: Goal[]
  savings?: Saving[]
  expenses?: Expense[]
  debts?: DebtTransaction[]
  sips?: SIPSchedule[]
  income?: Income[]
}

export async function exportToExcel(data: ExportDataInput, filename?: string): Promise<void> {
  const ExcelJS = (await import("exceljs")).default
  const workbook = new ExcelJS.Workbook()

  // 1. Calculate Metrics for Summary
  const totalIncome = (data.income || []).reduce((sum, i) => sum + Number(i.amount || 0), 0)
  const totalExpenses = (data.expenses || []).reduce((sum, e) => sum + Number(e.amount || 0), 0)

  // Net Worth Calculation
  const totalSavings = (data.savings || []).reduce((sum, s) => sum + Number(s.amount || 0), 0)
  const totalGoalCurrentCash = (data.goals || []).reduce((sum, g) => sum + Number(g.current || 0), 0)

  const persons = new Map<string, number>()
  for (const d of data.debts || []) {
    const prev = persons.get(d.personName) ?? 0
    if (d.type === "lent" || d.type === "borrowed_repayment") {
      persons.set(d.personName, prev + d.amount)
    } else if (d.type === "borrowed" || d.type === "lent_repayment") {
      persons.set(d.personName, prev - d.amount)
    }
  }
  let totalReceivable = 0
  let totalPayable = 0
  for (const net of persons.values()) {
    if (net > 0) totalReceivable += net
    else totalPayable += -net
  }
  const netDebtPosition = totalReceivable - totalPayable
  const netWorth = totalSavings + totalGoalCurrentCash + netDebtPosition

  // Sheet 1: Summary
  const summarySheet = workbook.addWorksheet("Summary")
  summarySheet.columns = [
    { header: "Metric", key: "metric", width: 25 },
    { header: "Value", key: "value", width: 20, style: { numFmt: "₹#,##0.00" } },
  ]

  summarySheet.addRow({ metric: "Total Income", value: totalIncome })
  summarySheet.addRow({ metric: "Total Expenses", value: totalExpenses })
  summarySheet.addRow({ metric: "Net Worth", value: netWorth })

  // Style Row 1 of Summary Sheet
  const summaryHeaderRow = summarySheet.getRow(1)
  summaryHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" } }
  summaryHeaderRow.eachCell((cell: { fill?: unknown }) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E293B" },
    }
  })

  // Sheet 2: Expenses
  const expensesSheet = workbook.addWorksheet("Expenses")
  expensesSheet.columns = [
    { header: "Date", key: "date", width: 15 },
    { header: "Category", key: "category", width: 20 },
    { header: "Amount", key: "amount", width: 18, style: { numFmt: "₹#,##0.00" } },
    { header: "Mode", key: "mode", width: 20 },
  ]

  for (const exp of data.expenses || []) {
    expensesSheet.addRow({
      date: exp.date || "",
      category: exp.category || "",
      amount: exp.amount || 0,
      mode: exp.account || (exp as unknown as { mode?: string }).mode || "",
    })
  }

  const amountCol = expensesSheet.getColumn("amount")
  if (amountCol) {
    amountCol.numFmt = "₹#,##0.00"
  }

  expensesSheet.autoFilter = "A1:D1"

  // Sheet 3: Savings & Goals
  const savingsGoalsSheet = workbook.addWorksheet("Savings & Goals")
  savingsGoalsSheet.columns = [
    { header: "Type", key: "type", width: 15 },
    { header: "Name", key: "name", width: 25 },
    { header: "Category / Details", key: "details", width: 25 },
    { header: "Target / Amount", key: "amount", width: 20, style: { numFmt: "₹#,##0.00" } },
    { header: "Current Saved", key: "current", width: 20, style: { numFmt: "₹#,##0.00" } },
    { header: "Status / Owner", key: "status", width: 20 },
  ]

  for (const s of data.savings || []) {
    savingsGoalsSheet.addRow({
      type: "Saving",
      name: s.name,
      details: `${s.type}${s.app ? ` (${s.app})` : ""}`,
      amount: s.amount || 0,
      current: s.amount || 0,
      status: s.owner || "Active",
    })
  }

  for (const g of data.goals || []) {
    savingsGoalsSheet.addRow({
      type: "Goal",
      name: g.name,
      details: g.category || "",
      amount: g.target || 0,
      current: g.current || 0,
      status: g.isArchived ? "Archived" : "Active",
    })
  }

  // Trigger download via Blob and URL.createObjectURL
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const dateStr = new Date().toISOString().slice(0, 10)
  const finalFilename = filename || `finio_export_${dateStr}.xlsx`

  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = finalFilename
  a.style.display = "none"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
