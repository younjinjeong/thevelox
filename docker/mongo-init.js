// MongoDB initialization script for Velox
// This script creates the velox database user

db = db.getSiblingDB('velox');

db.createUser({
  user: 'velox',
  pwd: 'dev-password',
  roles: [
    {
      role: 'readWrite',
      db: 'velox'
    }
  ]
});

// Create initial collections with indexes
db.createCollection('users');
db.createCollection('boxes');
db.createCollection('files');
db.createCollection('notes');
db.createCollection('tags');

// Create indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ name: 1 });
db.boxes.createIndex({ owner: 1 });
db.boxes.createIndex({ 'members.user': 1 });
db.files.createIndex({ boxId: 1 });
db.files.createIndex({ 'uploadedBy': 1 });
db.files.createIndex({ tags: 1 });
db.files.createIndex({ name: 'text' });

print('Velox database initialized successfully');
