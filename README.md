# 🍊 Nami Budget v2

Offline-first budgeting app (Expo SDK 58 / React Native 0.88) inspired by Nami from One Piece.
Your Total Budget is the origin of a **wallet tree** — branch it into wallets and sub-wallets; every
expense or deposit ripples up the tree to the Total Budget.

## How the wallet tree works
```
Total Budget  (origin parent node)        ₱100
 ├─ GCash  (child)                         ₱50
 │   ├─ For Online Shopping (sub-child)    ₱10
 │   └─ For Gaming (sub-child)             ₱40
 └─ Personal (child)                       ₱20
```
- A wallet's amount = all money in its branch. **Unallocated** = amount − money handed to its sub-wallets.
- **Expense** (−): deducts from the wallet *and every wallet above it* up to Total Budget
  (Personal ₱20 − ₱10 → ₱10, Total Budget → ₱90). Limited to the wallet's unallocated money.
- **Deposit** (+) has two sources: *From parent* moves unallocated money down from the wallet above
  (blocked if the parent doesn't have enough); *New money* adds to the wallet and every wallet above it.
  On the Total Budget, deposit always means new money.
- **Add wallet** (⑂): creates a child (or sub-child) funded from the parent's unallocated money. Max 2 levels below the Total Budget.
- Deleting a wallet returns its money to the parent; past transactions remain in History.

## Screens
1. **Dashboard** – cards, pie (wallet split vs Total Budget), line graph (daily spending), clustered bar chart (child wallets with sub-wallet bars), Export / Import / Reset.
2. **Budget** – the node map, plus the **History Page** button.
3. **Calculator** – independent, safe expression parser (no `eval`).
4. **History** – segmented toggle: Expenses (Wallet, Expense, Amount, Date) / Deposits (Wallet, Amount, Date).

## Excel import / export
Dashboard → Export creates `NamiBudget_YYYY-MM-DD.xlsx` with sheets **Wallets**, **Expenses**, **Deposits**.
Import replaces all data after a confirmation, and rejects files whose wallet amounts don't add up.

## Upgrading from v1
Existing v1 categories, expenses and deposits are migrated automatically on first launch
(categories become child wallets under a new Total Budget).

## Develop
```
npm install            # then: npx expo start -c   (use the latest Expo Go, SDK 58)
npx expo start
npm run typecheck
npm test          # wallet-logic unit tests (Node 22+)
```
Structure: `utils/budget.ts` (pure logic) · `context/BudgetContext.tsx` (state + persistence) ·
`utils/excel.ts`, `utils/files.ts` (import/export) · `components/` · `app/`.

## Deploy & update
```
eas build --platform android --profile preview      # installable APK for testing
eas build --platform android --profile production   # AAB for Google Play
eas update --channel preview    --message "what changed"   # JS/asset-only update to preview builds
eas update --channel production --message "what changed"   # ... to production builds
```
- `runtimeVersion` uses the **fingerprint** policy: an update is only delivered to builds whose native code matches.
  If you add/remove a native package, change the icon/permissions or upgrade the SDK, make a new build instead of an update.
- Channels: `development`, `preview`, `production` (set in `eas.json`). Builds made before `expo-updates` was added never receive updates.