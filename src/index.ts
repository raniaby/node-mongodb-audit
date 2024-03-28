import fs from 'node:fs/promises';
import { ChangeStream, ChangeStreamDocument, Db, MongoClient } from "mongodb";


let changeStream: ChangeStream<Document, ChangeStreamDocument<Document>> | undefined;
let database : Db | undefined;

async function loadExceptions() {
  try {
    const jsonContent = await fs.readFile('auditConfig.json', 'utf8');
    const exceptionsData = JSON.parse(jsonContent);
    const exceptions = exceptionsData.exceptions || [];
    return exceptions; 
  } catch (error) {
    console.error('Error loading exceptions:', error);
  }
}

async function loadDBSecret(){
  try {
    const jsonContent = await fs.readFile('auditConfig.json', 'utf8');
    const parsedData = JSON.parse(jsonContent);
    const DBSecret = parsedData.DBSecret || '';
    return DBSecret; 
  } catch (error) {
    console.error('Error loading DB credentials:', error);
  }
}


export async function initConnection(){
    const connectionString= await loadDBSecret();
    const client= new MongoClient(connectionString);
    const DBName= new URL(connectionString).pathname.slice(1);
    database = client.db(DBName);
    const collectionList= (await database.listCollections().toArray()).map((el)=> el.name);
    collectionList.forEach((collection) => {
        database!.command({
            collMod: collection,
            changeStreamPreAndPostImages: {enabled: true}
        })
    })
    changeStream = database.watch([], {
        fullDocument: "required",
        fullDocumentBeforeChange: "required"
    })

}

export async function setupDatabaseAudit(
    userId: number | null,
    username: string | null
  ) {
    try {
      const exceptions = await loadExceptions();
      if(changeStream === undefined) {
        throw new Error('error setting db watcher')
      }
      if(!database){
        throw new Error('error connecting to database')
      }
      changeStream.on('change', async (change: any)=> {

        if(!exceptions.includes(change.ns.coll)){
          const newValues= change.fullDocument;
          const oldValues= change.fullDocumentBeforeChange;
          const eventType= change.operationType;
          const collectionName= change.ns.coll;
          const updateDescription= change.updateDescription;
          const doc= {
           newValues,
           oldValues,
           eventType,
           collectionName,
           updateDescription,
           userId,
           username
          }
       
          const auditLogCollection= database!.collection('auditlog');
          await auditLogCollection.insertOne(doc);
    
        }
      })
  
    } catch (error) {
      console.error(error);
    }
  }