# Firebase Permissions Guide

## Common Error: "Missing or insufficient permissions"

If you're encountering this error when trying to create or access documents in Firestore, it means your Firebase security rules are preventing the operation.

## How to Fix Firebase Permission Errors

### 1. Check Authentication

Make sure you're properly authenticated. The security rules are configured to only allow authenticated users to perform certain operations.

### 2. Update Firestore Security Rules

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to Firestore Database in the sidebar
4. Click on the "Rules" tab
5. Update your rules to the following:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read and write their own documents
    match /documents/{documentId} {
      allow create: if request.auth != null;
      allow read, update, delete: if request.auth != null && (
        resource.data.createdBy == request.auth.uid || 
        resource.data.collaborators[].email.hasAny([request.auth.token.email])
      );
    }
    
    // Default deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

6. Click "Publish" to apply the changes

These rules will:
- Allow any authenticated user to create new documents
- Allow users to read, update, and delete documents they created
- Allow collaborators to access documents where their email is listed in the collaborators array
- Deny all other access by default

### 3. Deploy Rules via CLI (For Developers)

If you have access to the Firebase CLI, you can deploy rules from your local environment:

1. Create a `firestore.rules` file with the rules above
2. Create a `firebase.json` file if it doesn't exist:

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
```

3. Run the following commands:

```bash
firebase login
firebase use --add
# Select your project
firebase deploy --only firestore:rules
```

### 4. Check Firestore Indexes

Some queries might require composite indexes. If you see index errors, you can add them manually or through the CLI:

1. Create a `firestore.indexes.json` file:

```json
{
  "indexes": [
    {
      "collectionGroup": "documents",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "createdBy", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "documents",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "createdBy", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

2. Deploy the indexes:

```bash
firebase deploy --only firestore:indexes
```

## Understanding Firestore Security Rules

### Basic Structure

```
match /databases/{database}/documents {
  match /<collection>/{documentId} {
    allow read, write: if <condition>;
  }
}
```

### Common Conditions

- `request.auth != null` - User is authenticated
- `request.auth.uid == resource.data.userId` - User owns the document
- `request.resource.data.field == value` - Check submitted data

### Multiple Conditions

```
allow read: if condition1 && condition2;
allow write: if condition1 || condition2;
```

### Testing Rules

You can test your rules in the Firebase Console under the "Rules" tab by clicking "Rules Playground". 