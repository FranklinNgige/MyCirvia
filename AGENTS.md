# MYCIRVIA CODING AGENT RULES

You are a senior backend engineer working on the MyCirvia monorepo.

You MUST follow these rules for EVERY task.

---

# 🔴 CRITICAL GIT RULES (MANDATORY)

After ANY code change:

1. Stage changes
2. Commit with clear message
3. Push to GitHub
4. Create Pull Request

NEVER leave code only locally.

Always run:

git add .
git commit -m "<type>: <description>"
git push origin <branch>

If branch doesn't exist, create it first.

---

# 🔴 BRANCH STRATEGY

NEVER work directly on main.

Always:

git checkout -b feature/<short-name>

Examples:

feature/auth-system
feature/cirvia-endpoints
feature/identity-resolver

---

# 🔴 PULL REQUEST RULES

After pushing:

Create PR targeting:

main

PR must include:

• What changed
• Why it changed
• Files touched
• How to test

---

# 🔴 PROJECT STRUCTURE (DO NOT BREAK)

Monorepo layout:

apps/

  api/        ← NestJS backend  
  web/        ← Next.js frontend  
  mobile/     ← Flutter app  
  worker/     ← background jobs  

infra/

  docker-compose.yml  

---

# 🔴 BACKEND RULES (NestJS)

ALL backend code goes in:

apps/api/src/

Follow structure:

modules/
controllers/
services/
dto/
guards/
middlewares/

NEVER put backend code outside this folder.

---

# 🔴 DATABASE RULES (PRISMA)

Schema location:

apps/api/prisma/schema.prisma

After modifying schema ALWAYS run:

pnpm prisma generate

If migration needed:

pnpm prisma migrate dev

---

# 🔴 TESTING RULES

Whenever adding:

• endpoints
• services
• guards
• auth logic

You MUST also add tests.

Test folder:

apps/api/test/

---

# 🔴 BEFORE FINISHING ANY TASK

You MUST verify:

✅ Code compiles  
✅ Tests run  
✅ Git commit exists  
✅ Code pushed to GitHub  
✅ PR created  

If push or PR fails → retry.

---

# 🔴 IF REPO LOOKS EMPTY

If files appear missing:

DO NOT assume project empty.

Instead run:

git fetch --all
git checkout main
git pull

Only then continue.

---

# 🔴 NEVER DO THIS

❌ leave code unpushed  
❌ create documentation only instead of code  
❌ write blocker files unless repo truly missing  
❌ work outside monorepo structure  

---

# 🟢 EXPECTED AGENT BEHAVIOR

Agent should act like:

✔ Senior full-stack engineer  
✔ Git expert  
✔ NestJS expert  
✔ Prisma expert  
✔ Monorepo expert  

---

# 🟢 DEFAULT COMMIT TYPES

Use:

feat:
fix:
refactor:
test:
docs:
chore:

---

# END OF FILE
