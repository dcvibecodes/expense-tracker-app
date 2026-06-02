# Update Instructions for Expense Tracker

Based on the deployment manual, here are the exact details:
- **VPS IP**: `199.192.16.197`
- **App folder on VPS**: `/root/expense-tracker-app`
- **PM2 process name**: `expense-tracker`
- **Database location**: `/root/expense-tracker-app/data/expenses.db`

---

## Step 1: Open Terminal on Your Mac

Open the **Terminal** app (search for "Terminal" in Spotlight).

---

## Step 2: SSH into the VPS

Copy and paste this command into Terminal, replacing `YOUR_VPS_PASSWORD` with your actual VPS password:

```bash
ssh root@199.192.16.197
```

It will ask for your password. Type it and press Enter.

---

## Step 3: Stop the App (while still in SSH)

Once you're connected to the VPS, run:

```bash
pm2 stop expense-tracker
```

---

## Step 4: Exit the SSH Session (but keep Terminal open)

```bash
exit
```

You'll be back on your Mac.

---

## Step 5: Upload the New Files to the VPS

From your Mac's Terminal, run these one by one:

**First — upload the main files:**
```bash
cd /Users/dc/Documents/DC-Workspace/expense-tracker-app
```

```bash
scp server.js package.json package-lock.json root@199.192.16.197:/root/expense-tracker-app/
```

**Second — upload the public folder (frontend files):**
```bash
scp -r public/ root@199.192.16.197:/root/expense-tracker-app/
```

It will ask for your VPS password each time. Type it and press Enter.

---

## Step 6: SSH Back into the VPS

```bash
ssh root@199.192.16.197
```

---

## Step 7: Install Any Updated Dependencies

```bash
cd /root/expense-tracker-app && npm install --production
```

---

## Step 8: Restart the App

```bash
pm2 restart expense-tracker
```

---

## Step 9: Check That It's Running

```bash
pm2 list
```

You should see `expense-tracker` with a status of **online**.

---

## Step 10: Exit SSH

```bash
exit
```

---

## Step 11: Verify in Browser

Visit [https://exp.darshanchan.de/](https://exp.darshanchan.de/) and refresh. The new version should be live.

---

## Important Notes

- **Your data is safe** — The database file (`data/expenses.db`) is NOT being overwritten. Only the code files are updated.
- **Your app lock PIN will still work** — Same reason, it's stored in the database.
- **No changes to Nginx or SSL** — Those stay exactly as they are.
- **The daily Google Drive backup continues automatically** — No action needed.

---

## If Something Goes Wrong

If the app doesn't come back up after restart, SSH in and check the logs:

```bash
ssh root@199.192.16.197
```

```bash
pm2 logs expense-tracker
```

Tell me what you see and I'll help you fix it.
