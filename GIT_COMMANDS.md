# 🚀 Git Workflow (Step-by-Step)

This guide helps you push changes to GitHub anytime.

---

## 🧱 1. Go to Project Folder

```bash
cd your-project-folder
```

---

## 🔍 2. Check Status

```bash
git status
```

👉 Shows changed / new files

---

## ➕ 3. Add Changes

### Add all files:
```bash
git add .
```

### OR add specific file:
```bash
git add filename
```

---

## 💾 4. Commit Changes

```bash
git commit -m "Describe what you changed"
```

👉 Example:
```bash
git commit -m "Added admin dashboard UI"
```

---

## 🔼 5. Push to GitHub

```bash
git push
```

---

# 🆕 First Time Setup Only

If project is not connected to GitHub:

---

## Initialize Git

```bash
git init
```

---

## Add Remote Repo

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
```

---

## Set Branch

```bash
git branch -M main
```

---

## First Push

```bash
git push -u origin main
```

---

# 🔄 Daily Workflow (Simple Version)

```bash
git add .
git commit -m "update"
git push
```

---

# ⚠️ Important Files to Ignore

Create `.gitignore`:

```
node_modules
.env
dist
```

---

# 🔥 Useful Commands

## Check remote repo
```bash
git remote -v
```

## See commit history
```bash
git log
```

## Undo last commit (safe)
```bash
git commit --amend
```

---

# 🧠 Pro Tip

✔ Commit often  
✔ Write meaningful messages  
✔ Push regularly  

---

# 🎯 Workflow Summary

```
Edit code → git add → git commit → git push → Done ✅
```
