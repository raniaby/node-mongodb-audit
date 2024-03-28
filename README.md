# Database Audit Package

This package provides functionality for auditing database changes in MongoDB.

## Installation

To install the package, run the following command:

```bash
npm install node-mongodb-audit
```

Upon installation, a configuration file will be generated in your project directory. This file includes essential information for database connections and an exceptions array. Before utilizing the audit function, ensure that these configurations are properly defined.

## Usage
Importing the Package:

```js
import { initConnection, setupDatabaseAudit } from ('node-mongodb-audit'); 
```

## Setting up Database Connection

```js
initConnection();
```

## Setting up Database Audit

```js
const userId = 1; // Provide the user ID
const username = 'admin'; // Provide the username

setupDatabaseAudit(userId, username);
```

## Configuration

You can configure the exceptions for auditing by editing the exceptions.json file.

Example exceptions.json
```json
{
  "exceptions": ["auditlog"]
}
```
