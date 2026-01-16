# Database Operations

This directory contains database seeders and migration utilities for the Velox application.

## Directory Structure

```
database/
├── seeders/          # Database seeders for initial data
│   ├── admin-user.seeder.ts
│   ├── demo-data.seeder.ts
│   ├── seeder.module.ts
│   └── seed.ts
├── migrations/       # Migration scripts for legacy data
│   └── migrate-legacy-data.ts
└── README.md
```

## Database Seeders

Seeders populate the database with initial data for development and testing.

### Available Commands

```bash
# Seed database with all data (admin + demo)
npm run seed

# Drop all seeded data
npm run seed:drop

# Refresh database (drop + seed)
npm run seed:refresh

# Seed admin user only
npm run seed:admin
```

### Seeded Data

#### Admin User
- **Email:** admin@velox.com
- **Password:** admin123
- **Roles:** admin, user
- **Quota:** 1TB
- ⚠️ **Important:** Change the default password after first login!

#### Demo Users
- **demo@velox.com** - Demo User (10GB quota)
- **john@velox.com** - John Doe (5GB quota)
- **jane@velox.com** - Jane Smith (5GB quota)
- **Password (all):** demo123

#### Demo Boxes
- Demo Personal Box (Private)
- Sample Shared Project (Shared with team)
- Test Public Box (Public read)

## Legacy Data Migration

Migration utilities help you migrate data from the old Velox schema to the new modernized schema.

### Available Commands

```bash
# Migrate all data (users, boxes, files)
npm run migrate:legacy

# Migrate specific entities
npm run migrate:users
npm run migrate:boxes
npm run migrate:files

# Validate migrated data
npm run migrate:validate
```

### What Gets Migrated

#### Users
- Add default `roles` array if missing
- Create `notifications` object with defaults
- Create `preference` object with defaults
- Initialize `usedSize` to 0 if missing

#### Boxes
- Migrate `swift` config to `storageProvider` abstraction
- Set `storageProvider` to 'swift'
- Extract `storageContainerName` from Swift config
- Initialize missing fields (createDate, lastModifyDate, size, fileLength)
- Set default type (4 = private) and status (1 = active)

#### Files (StorageObjects)
- Initialize missing timestamps (uploadDate, lastModifyDate)
- Set default status (1 = active) and type (1 = member insert)
- Initialize empty `tags` and `versions` arrays
- Update `tagsSize` based on tags length

### Migration Process

1. **Backup your database** before running migrations:
   ```bash
   mongodump --uri="mongodb://localhost:27017/velox" --out=./backup
   ```

2. **Run the migration**:
   ```bash
   npm run migrate:legacy
   ```

3. **Validate the results**:
   ```bash
   npm run migrate:validate
   ```

4. **Check the logs** for any errors or warnings

### Validation

The validation command checks:
- Total counts of users, boxes, and files
- Users without required `roles` field
- Boxes without `storageProvider` field
- Any other inconsistencies

Example output:
```
Database contains:
- 150 users
- 423 boxes
- 8,542 files
✅ Validation completed!
```

## Development Workflow

### First-time Setup

1. Start with fresh database seeding:
   ```bash
   npm run seed
   ```

2. Test with demo data (admin + 3 demo users + 3 demo boxes)

3. Access the application:
   - Admin: admin@velox.com / admin123
   - Demo: demo@velox.com / demo123

### Migrating from Legacy

1. Backup existing database

2. Run migration:
   ```bash
   npm run migrate:legacy
   ```

3. Validate:
   ```bash
   npm run migrate:validate
   ```

4. Test the application with migrated data

5. If needed, seed additional demo data:
   ```bash
   npm run seed
   ```

### Resetting Database

To start fresh during development:

```bash
# Drop all seeded data
npm run seed:drop

# Or refresh (drop + reseed)
npm run seed:refresh
```

## Environment Variables

Ensure these are set in your `.env` file:

```env
MONGODB_URI=mongodb://localhost:27017/velox
NODE_ENV=development
```

## Troubleshooting

### Connection Issues

If you get MongoDB connection errors:
1. Ensure MongoDB is running: `mongod`
2. Check MONGODB_URI in .env
3. Verify database exists

### Duplicate Key Errors

If seeding fails with duplicate key errors:
```bash
# Drop existing data first
npm run seed:drop

# Then seed again
npm run seed
```

### Migration Errors

If migration fails:
1. Check the error logs for specific issues
2. Run validation to see what's missing: `npm run migrate:validate`
3. Try migrating specific entities one at a time
4. Restore from backup if needed

## Best Practices

1. **Always backup** before running migrations in production
2. **Test migrations** on a copy of your database first
3. **Review validation** output after migrations
4. **Change default passwords** immediately after seeding
5. **Don't commit** .env files with production credentials
6. **Use seed:refresh** frequently during development to ensure clean state

## Next Steps

After seeding/migrating:

1. Start the application: `npm run start:dev`
2. Access Swagger docs: http://localhost:3000/api/docs
3. Test authentication with admin or demo users
4. Create boxes and upload files
5. Test all CRUD operations

## Support

For issues or questions:
- Check the main project README
- Review logs in `logs/` directory
- Open an issue on GitHub
