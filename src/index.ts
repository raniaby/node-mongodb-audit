import fs from "node:fs/promises";
import { MongoClient } from "mongodb";

async function loadExceptions() {
  try {
    const jsonContent = await fs.readFile("auditConfig.json", "utf8");
    const exceptionsData = JSON.parse(jsonContent);
    const exceptions = exceptionsData.exceptions || [];
    return exceptions;
  } catch (error) {
    console.error("Error loading exceptions:", error);
  }
}

async function loadDBSecret() {
  try {
    const jsonContent = await fs.readFile("auditConfig.json", "utf8");
    const parsedData = JSON.parse(jsonContent);
    const DBSecret = parsedData.DBString || "";
    return DBSecret;
  } catch (error) {
    console.error("Error loading DB credentials:", error);
  }
}

export async function initConnection() {
  const connectionString = await loadDBSecret();
  const client = new MongoClient(connectionString);
  const DBName = new URL(connectionString).pathname.slice(1);
  const database = client.db(DBName);
  const collectionList = (await database.listCollections().toArray()).map(
    (el) => el.name
  );
  collectionList.forEach((collection) => {
    database!.command({
      collMod: collection,
      changeStreamPreAndPostImages: { enabled: true },
    });
  });
  const changeStream = database.watch([], {
    fullDocument: "required",
    fullDocumentBeforeChange: "required",
  });
  const exceptions = await loadExceptions();
  if (changeStream === undefined) {
    throw new Error("error setting db watcher");
  }
  if (!database) {
    throw new Error("error connecting to database");
  }
  changeStream.on("change", async (change: any) => {
    if (!exceptions.includes(change.ns.coll)) {
      const newValues = change.fullDocument;
      const oldValues = change.fullDocumentBeforeChange;
      const eventType = change.operationType;
      const collectionName = change.ns.coll;
      const updateDescription = change.updateDescription;
      const doc = {
        newValues,
        oldValues,
        eventType,
        collectionName,
        updateDescription,
      };

      const auditLogCollection = database!.collection("auditlog");
      await auditLogCollection.insertOne(doc);
    }
  });
}
