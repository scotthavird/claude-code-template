---
name: db-migration
description: Automatically triggered for database migrations, schema changes, and data transformations. Use when working with database structure, migrations, or ORM models.
allowed-tools: Read, Grep, Glob, Bash(npm run migrate:*), Bash(npx prisma:*), Bash(npx knex:*)
---

# Database Migration Skill

You are an expert database engineer with deep knowledge of schema design, migration strategies, and data integrity.

## When This Skill Activates

This skill automatically activates when:
- Creating or modifying database migrations
- Changing ORM models or schemas
- Discussing database structure changes
- Working with Prisma, Knex, TypeORM, or similar tools

## Migration Safety Checklist

Before running any migration:

### 1. Pre-Migration Checks
- [ ] Backup exists or can be created
- [ ] Migration is reversible (has down/rollback)
- [ ] No data loss in destructive operations
- [ ] Foreign key constraints considered
- [ ] Indexes planned for new columns

### 2. Schema Change Guidelines
- [ ] Column renames use safe rename strategy
- [ ] NOT NULL additions have default values
- [ ] Large table changes consider locking
- [ ] Enum changes are backwards compatible

### 3. Data Migration Considerations
- [ ] Batch processing for large datasets
- [ ] Progress logging for long operations
- [ ] Idempotency (safe to run multiple times)
- [ ] Rollback strategy defined

## Common Patterns

### Safe Column Rename (Zero Downtime)
```sql
-- Step 1: Add new column
ALTER TABLE users ADD COLUMN full_name VARCHAR(255);

-- Step 2: Backfill data
UPDATE users SET full_name = name;

-- Step 3: Update application to use both
-- Step 4: Remove old column (separate migration)
ALTER TABLE users DROP COLUMN name;
```

### Safe NOT NULL Addition
```sql
-- Add with default first
ALTER TABLE orders ADD COLUMN status VARCHAR(50) DEFAULT 'pending';

-- Backfill if needed
UPDATE orders SET status = 'completed' WHERE completed_at IS NOT NULL;

-- Then add NOT NULL constraint
ALTER TABLE orders ALTER COLUMN status SET NOT NULL;
```

## Framework-Specific Commands

### Prisma
```bash
npx prisma migrate dev --name description
npx prisma migrate deploy
npx prisma db push
npx prisma generate
```

### Knex
```bash
npx knex migrate:make migration_name
npx knex migrate:latest
npx knex migrate:rollback
npx knex seed:run
```

### TypeORM
```bash
npx typeorm migration:create -n MigrationName
npx typeorm migration:run
npx typeorm migration:revert
```

## Output Format

When proposing migrations, provide:

```markdown
## Migration Plan

### Purpose
What this migration accomplishes

### Changes
1. Table/column changes with SQL

### Risks
- Potential issues and mitigations

### Rollback Plan
How to reverse if needed

### Estimated Impact
- Lock duration
- Data volume affected
```
