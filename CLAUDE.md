# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Velox is an enterprise-grade private cloud storage solution for secure file sharing and collaboration. It provides a web-based interface for file management, integrating with OpenStack Swift for object storage, MongoDB for metadata, Redis for sessions, and WebSocket for real-time collaboration.

## Architecture

### Framework & Server
- **Railway.js** (Express 2.x-based MVC framework) - main application framework
- **Cluster Mode**: Production runs with one worker per CPU core ([server.js:76-92](server.js#L76-L92))
- **WebSocket Server**: Separate process for real-time communication ([socket.js](socket.js))
  - Runs on port 6831 (non-SSL) and 443 (SSL)
  - Handles join/message/disconnect events for multi-user collaboration

### Data Layer
- **MongoDB** (Mongoose 3.4.x) - stores users, boxes, files, notes, and public objects
- **Redis** - session storage via connect-redis
- **OpenStack Swift** - object storage backend via Keystone authentication

### Core Domain Models
- **User** - authentication, settings, locale, storage quota
- **Box** - shared workspaces (containers) for organizing files
- **File** - file metadata, versioning, tags, thumbnails
- **Note** - notepaper for collaboration within boxes
- **StorageObject** - interface to Swift storage
- **PublicObject** - temporary share links and delivery boxes

### Controllers & Routing
See [config/routes.js](config/routes.js) for complete routing structure:
- **authenticate_controller** - signin/signup, settings, password management
- **assets_controller** - main file browsing interface, search, thumbnails
- **files_controller** - upload, download, versioning, trash/restore, copy
- **boxes_controller** - create/edit/delete shared boxes
- **tags_controller** - user tags and auto-tags for filtering
- **notes_controller** - collaborative notepaper
- **delivery_controller** - external file sharing via temporary links ("sendbox")
- **administration_controller** - admin interface

### Services
Located in [app/services/](app/services/):
- **copy.js** - file copy operations between boxes
- **delivery.js** - external sharing and sendbox logic
- **download.js** - single and multiple file downloads, ZIP creation
- **files.js** - file upload, thumbnail generation, document preview
- **middlewares/** - request processing middleware

### Real-time Collaboration
WebSocket implementation ([socket.js](socket.js)) enables:
- Multi-user presence tracking in shared boxes
- Real-time notifications for file operations
- Notepaper synchronization
- Connection count display per box

## Development Commands

### Start Server
```bash
node server.js
```
- Development mode: runs on single process, auto-removes temp files
- Production mode: clusters across all CPU cores, minifies JS assets

### Start WebSocket Server
```bash
node socket.js
```
Run separately for real-time features. Requires SSL certificates at `/etc/nginx/ssl/` for secure connections.

### Install Dependencies
```bash
npm update
```

## Configuration

### Required Configuration Files
1. **[config/config.json](config/config.json)** - main configuration
   - `socket`: WebSocket server host/port
   - `redis`: Redis connection
   - `keystone`: OpenStack Swift authentication
   - `email`: SMTP settings for notifications
   - `bitly`: URL shortening for share links
   - `trackCode`: Google Analytics

2. **[config/database.json](config/database.json)** - MongoDB connection settings
   - Separate configs for development/production environments

### Storage Configuration
Storage types are defined in [config/storagetypes/](config/storagetypes/):
- MIME type mappings
- Cloud storage provider configurations (in [config/cloudfiles/](config/cloudfiles/))

## Key Technical Details

### File Upload Flow
1. Files upload to `/files/:box/upload` (new) or `/files/:box/upload/:id` (version)
2. Stored in Swift container via StorageObject model
3. Thumbnails generated asynchronously using ImageMagick/FFmpeg
4. Document previews via Scribd API
5. Real-time notifications broadcast to connected users in the box

### Asset Compilation
In production mode, [server.js:48-72](server.js#L48-L72) minifies and concatenates:
- Vendor libraries → `public/javascripts/dist/libraries.js`
- Application code → `public/javascripts/dist/application.js`

### Multi-language Support
Localization resources in [config/locales/](config/locales/):
- Supports en-US, ko-KR, ja-JP
- User locale stored in User model
- Help documents at [public/documents/help.{en,ko,ja}.md](public/documents/)

### File Sharing Modes
1. **Box Sharing**: Invite users to shared boxes with role-based access
2. **Share Links**: Temporary authenticated links to specific files
3. **Sendbox**: External users upload to a user's inbox without login

### Environment Modes
- **Development**: Single process, verbose logging, temp cleanup on start
- **Production**: Multi-core clustering, asset minification, Redis sessions, NginX static file serving

## Database Schema
See [db/schema.js](db/schema.js) for Mongoose schema definitions.

## Version History
Current version: 1.0.1c (see [package.json](package.json))

Versioning follows: `major.minor[.maintenance[.revision]]`
