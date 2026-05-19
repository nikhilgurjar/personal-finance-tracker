const fs = require('fs');
const file = 'src/components/GoalDetails.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  /const getAccountName = \(accountId: string\) => \{\s+const account = accounts\.find\(acc => acc\.id === accountId\);\s+return account\?\.name \|\| 'Unknown Account';\s+\};/m,
  `const getAccountName = (accountId?: string) => {
    if (!accountId) return 'Linked Instrument';
    const account = accounts.find(acc => acc.id === accountId);
    return account?.name || 'Unknown Account';
  };`
);
fs.writeFileSync(file, content);
console.log('Fixed GoalDetails.tsx');
