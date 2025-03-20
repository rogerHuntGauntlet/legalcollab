# Data Model

## Users Collection
```
users/
  {userId}/
    email: string
    displayName: string
    photoURL: string
    createdAt: timestamp
    lastActive: timestamp
```

## Agreements Collection
```
agreements/
  {agreementId}/
    title: string
    description: string
    createdBy: userId
    createdAt: timestamp
    updatedAt: timestamp
    status: enum ['draft', 'negotiating', 'pending_signatures', 'completed']
    parties: [
      {
        userId: string
        email: string
        role: string
        hasApproved: boolean
        hasSigned: boolean
        signatureTimestamp: timestamp
      }
    ]
    versions: [
      {
        versionNumber: number
        content: string
        createdAt: timestamp
        createdBy: userId
      }
    ]
```

## Changes Collection
```
agreements/{agreementId}/changes/
  {changeId}/
    proposedBy: userId
    proposedAt: timestamp
    section: string
    originalText: string
    newText: string
    status: enum ['proposed', 'accepted', 'rejected']
    approvals: [userId]
    comments: [
      {
        userId: string
        text: string
        timestamp: timestamp
      }
    ]
```

## Messages Collection
```
agreements/{agreementId}/messages/
  {messageId}/
    senderId: string
    senderType: enum ['user', 'ai']
    content: string
    timestamp: timestamp
    attachedChanges: [changeId]
``` 