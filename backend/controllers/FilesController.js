import { v4 as uuidV4 } from 'uuid';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

const fs = require('fs');
const path = require('path');
const { ObjectId } = require('mongodb');

async function findOneUser(client, query) {
  try {
    const newQuery = query;
    // If the passed query contains id, make it a mongo id object
    if (query._id) {
      newQuery._id = new ObjectId(query._id);
    }
    // FInd the mongo document that matches the search query
    const data = await client.db.collection('users').findOne(newQuery);
    // If it is found, it wil be returned, else return null
    return data;
  } catch (err) {
    console.log('Error finding data:', err.message);
    // If there is an error, return false instead of null
    return false;
  }
}

async function findOneFile(client, query) {
  try {
    const newQuery = query;
    // If the passed query contains id, make it a mongo id object
    if (query._id) {
      newQuery._id = new ObjectId(query._id);
    }
    // FInd the mongo document that matches the search query
    const data = await client.db.collection('files').findOne(newQuery);
    // If it is found, it wil be returned, else return null
    return data;
  } catch (err) {
    console.log('Error finding data:', err.message);
    // If there is an error, return false instead of null
    return false;
  }
}

async function updateFile(client, query, updateData) {
  try {
    const newQuery = query;
    // If the passed query contains id, make it a mongo id object
    if (query._id) {
      newQuery._id = new ObjectId(query._id);
    }
    const update = {
      $set: updateData  // Use $set to modify fields in the document
    };
    // Update the document
    const updatedFile = await client.db.collections('files').updateOne(newQuery, update);

  } catch (err) {
    console.log('Error updating file:', err.message);
    return null;
  }
}

async function findAllFiles(client, query, page) {
  try {
    const newQuery = query;
    // If the passed query contains id, make it a mongo id object
    if (query._id) {
      newQuery._id = new ObjectId(query._id);
    }

    // Create a pipeline to paass through the aggregate call
    const pipeline = [
      // Include the search query in this prompt
      { $match: newQuery },
      // Skip the documents from the previous pages
      { $skip: page * 20 },
      // Set a limit to the number of files per page
      { $limit: 20 },
    ];

    // FInd the mongo documents that match the search query
    const data = await client.db.collection('files').aggregate(pipeline).toArray();

    // If it is found, it wil be returned, else return null
    return data;
  } catch (err) {
    console.log('Error finding data:', err.message);
    // If there is an error, return false instead of null
    return false;
  }
}

function decodeBase64Data(base64Data) {
  const data = Buffer.from(base64Data, 'base64').toString('utf8');
  return data;
}

function checkLocalPath() {
  // Check if the path already exists
  const path = process.env.FOLDER_PATH || '/tmp/files_manager';

  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, { recursive: true });
  }

  return path;
}

async function createNewFolder(client, fileData) {
  try {
    const folder = await client.db.collection('files').insertOne(fileData);
    console.log('Created new folder');
    return folder.ops[0]; // This will return the created folder document
  } catch (err) {
    console.log('Error creating new folder', err.message);
    return null;
  }
}

class FilesController {
  static async saveChatFile(req, res) {
    console.log('Running saveChatFile');
    try {
      //console.log(req.cookies)
      const token = req.cookies.authToken;
      if (!token) {
        console.log('No token')
        res.render('error-page', { error: 'Unauthorized, token missing' });
        //res.status(401).send({ error: 'Unauthorized, You need to login again' });
        return;
      }
      const _id = await redisClient.get(`auth_${token}`);
      const mainUser = await findOneUser(dbClient, { _id });
      if (!mainUser) {
        console.log('No user')
        res.render('error-page', { error: 'Your own user info cant be found' });
        //res.status(401).send({ error: 'Unauthorized, You need to login again' });
        return;
      }

      const { channel, message, user2, mediaPath } = req.body;

      // Find or create the channel document
      let channelFile = await findOneFile(dbClient, { name: channel });
      if (!channelFile) {
        const channelData = {
          name: channel,
          users: [mainUser.username, user2],
          data: [] // Initialize data as an array to store messages
        }
        const result = await dbClient.db.collection('files').insertOne(channelData)
        channelFile = result.ops[0];
      }

      // Read media file and encode it as base64
      let mediaData = null;
      if (mediaPath) {
        console.log('Encoding media')
        const fileData = fs.readFileSync(mediaPath.path);
        //console.log(mediaPath)
        if (fileData) {
          console.log('There was file data')
        }
        mediaData = {
          filename: mediaPath.path,
          originalName: mediaPath.originalname,
          uniqueName: `${mediaPath.originalname}++${mediaPath.path}`,
          contentType: mediaPath.mimetype, // Adjust content type based on file type
          data: fileData.toString('base64')
        };
        //await dbClient.collection('media').insertOne(mediaData);
      }

      //console.log('here?')
      // Append the message and media to the channel's data
      const newEntry = [ message ];
      if (mediaData !== null) {
        console.log('Storing media with name:', mediaData.uniqueName)
        newEntry.push(`${mainUser.username}: Stored data: ${mediaData.uniqueName}`);
      }
      await dbClient.db.collection('files').updateOne(
        { name: channel },
        { $push: { data: { $each: newEntry } } }
      );

      // Clean up uploaded file after saving to MongoDB
      //if (mediaPath) {
      //  fs.unlinkSync(mediaPath.path);
      //}


      res.status(200).send({ data: 'Success'});
      //res.redirect(`/getChatChannelFile?channel=${encodeURIComponent(channel)}&user2=${encodeURIComponent(user2)}`)
    } catch (err) {
      console.log('An error occured with SendChat:', err.message);
      res.render('error-page', { error: 'An error occurred while saving your messages' });
      //res.status(500).send({ error: 'An error occurred while saving the message' });
    }
  }

  static async getChatFile(req, res) {
    console.log('Running getChatFile');
    try {
      const token = req.cookies.authToken;
      if (!token) {
        res.render('error-page', { error: 'Unauthorized, token missing' });
        //res.status(401).send({ error: 'Unauthorized, You need to login again' });
        return;
      }
      const _id = await redisClient.get(`auth_${token}`);
      const mainUser = await findOneUser(dbClient, { _id });
      if (!mainUser) {
        res.render('error-page', { error: 'Your own user info cant be found' });
        //res.status(401).send({ error: 'Unauthorized, You need to login again' });
        return;
      }

      const { channel, user2 } = req.query;
      const otherUser = await findOneUser(dbClient, { username: user2 });
      if (!otherUser) {
        res.render('error-page', { error: 'The other party does not have an account' });
        //res.status(401).send({ error: 'The other party does not have an account' });
        return;
      }

      console.log(`Channel: ${channel}, for ${mainUser.username} and ${user2}`);
      // Find or create the channel document
      let channelFile = await findOneFile(dbClient, { name: channel });
      if (!channelFile) {
        // If no channel document exists, initialize an empty array for chat messages
        channelFile = { data: [] };
      }

      // Retrieve messages from the channel document
      const messages = channelFile.data || [];
      // console.log(messages)

      res.render('chat-page', { user1: mainUser, user2: otherUser, channel, chat: messages });
    } catch (err) {
      console.log('An error occured:', err.message);
      res.render('error-page', { error: 'An error occurred while getting your messages' });
      //res.status(500).send({ error: 'An error occurred while getting the messages' });
    }
  }

  static async postUpload(req, res) {
    try {
      const token = req.header('X-Token');
      const _id = await redisClient.get(`auth_${token}`);
      const user = await findOneUser(dbClient, { _id });

      if (!user) {
        res.status(401).send({ error: 'Unauthorized' });
        return;
      }
      const acceptedTypes = ['folder', 'file', 'image'];
      const {
        name, type, parentId, isPublic, data,
      } = req.body;

      if (!name) {
        res.status(400).send({ error: 'Missing name' });
        return;
      }

      if (!acceptedTypes.includes(type)) {
        res.status(400).send({ error: 'Missing type' });
        return;
      }

      if (!data && type !== 'folder') {
        res.status(400).send({ error: 'Missing data' });
        return;
      }

      let openFolder = '';
      if (parentId) {
        openFolder = await findOneFile(dbClient, { _id: parentId });
        if (!openFolder) {
          res.status(400).send({ error: 'Parent not found' });
          return;
        }

        if (openFolder.type !== 'folder') {
          res.status(400).send({ error: 'Parent is not a folder' });
          return;
        }
      }

      if (type === 'folder') {
        const newFolder = await createNewFolder(dbClient, {
          userId: _id,
          name,
          type,
          isPublic: isPublic || false,
          parentId: parentId || 0,
        });
        newFolder.id = newFolder._id;
        delete newFolder._id;
        res.status(201).send(newFolder);
        return;
      }
      const folderPath = checkLocalPath();
      const fileName = `${uuidV4()}`;
      const filePath = path.join(folderPath, fileName);

      const decodedData = decodeBase64Data(data);
      fs.writeFileSync(filePath, decodedData);

      const saveData = {
        userId: _id,
        name,
        type,
        isPublic: isPublic || false,
        parentId: parentId || 0,
        localPath: filePath,
      };

      const newFile = await dbClient.db.collection('files').insertOne(saveData);
      const endPointData = {
        id: newFile.insertedId,
        userId: _id,
        name,
        type,
        isPublic: isPublic || false,
        parentId: parentId || 0,
      };
      res.status(201).send(endPointData);
    } catch (err) {
      console.log('An error occured:', err.message);
      res.status(400).send({ error: 'Error during upload' });
    }
  }

  static async getShow(req, res) {
    try {
      console.log('Running getShow');
      const token = req.header('X-Token');
      const _id = await redisClient.get(`auth_${token}`);
      const user = await findOneUser(dbClient, { _id });

      if (!user) {
        res.status(401).send({ error: 'Unauthorized' });
        return;
      }

      const fileId = req.params.id;
      const file = await findOneFile(dbClient, { userId: _id, _id: fileId });
      if (file) {
        file.id = file._id;
        delete file._id;
        res.send(file);
      } else {
        res.status(404).send({ error: 'Not found' });
      }
    } catch (err) {
      console.log('An error occured:', err.message);
      res.status(400).send({ error: 'Error during upload' });
    }
  }

  static async getIndex(req, res) {
    console.log('Running index');
    try {
      const token = req.header('X-Token');
      const _id = await redisClient.get(`auth_${token}`);
      const user = await findOneUser(dbClient, { _id });

      if (!user) {
        res.status(401).send({ error: 'Unauthorized' });
        return;
      }

      const parentId = req.query.parentId || 0;
      const page = req.query.page || 0;

      const parentFiles = await findAllFiles(dbClient, { parentId }, page);
      if (parentFiles) {
        const fixedFiles = [];
        for (const files of parentFiles) {
          files.id = files._id;
          delete files._id;
          fixedFiles.push(files);
        }
        res.send(fixedFiles);
      } else {
        res.send([]);
      }
    } catch (err) {
      console.log('An error occured:', err.message);
      res.status(400).send({ error: 'Error during upload' });
    }
  }

  static async putPublish(req, res) {
    try {
      console.log('Running getShow');
      const token = req.header('X-Token');
      const _id = await redisClient.get(`auth_${token}`);
      const user = await findOneUser(dbClient, { _id });

      if (!user) {
        res.status(401).send({ error: 'Unauthorized' });
        return;
      }

      const fileId = req.params.id;
      const file = await findOneFile(dbClient, { userId: _id, _id: fileId });
      if (file) {
        res.send(file);
      } else {
        res.status(404).send({ error: 'Not found' });
      }
    } catch (err) {
      console.log('An error occured:', err.message);
      res.status(400).send({ error: 'Error during upload' });
    }
  }

  static async putUnpublish(req, res) {
    try {
      console.log('Running getShow');
      const token = req.header('X-Token');
      const _id = await redisClient.get(`auth_${token}`);
      const user = await findOneUser(dbClient, { _id });

      if (!user) {
        res.status(401).send({ error: 'Unauthorized' });
        return;
      }

      const fileId = req.params.id;
      const file = await findOneFile(dbClient, { userId: _id, _id: fileId });
      if (file) {
        res.send(file);
      } else {
        res.status(404).send({ error: 'Not found' });
      }
    } catch (err) {
      console.log('An error occured:', err.message);
      res.status(400).send({ error: 'Error during upload' });
    }
  }
}

export default FilesController;
