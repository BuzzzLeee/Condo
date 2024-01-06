const { error } = require('console');
const express = require('express')
const app = express()
const port = 2000
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bcrypt = require('bcrypt');


//express.json
app.use(express.json())

// MongoDB setup
const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://Bazli:Bazli35@cluster0.maezorf.mongodb.net/CondoVisitorManagement';

const swaggerUi = require('swagger-ui-express');

const swaggerJsdoc = require('swagger-jsdoc');
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Condo Visitor Management API',
      version: '1.0.0',
    },
  },
  apis: ['./swagger.js'],
};

const swaggerSpec = swaggerJsdoc(options);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

//const client = new MongoClient(uri);

let visitDetailCollection;
let hostCollection;
let adminCollection;


MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
.then(client => {
  console.log('Connected to MongoDB'); 
  const db = client.db('CondoVisitorManagement');
  adminCollection = db.collection('adminCollection');
  visitDetailCollection = db.collection('visitDetailCollectionName');
  hostCollection = db.collection('hostCollectionName');
  
  
  // Start the server or perform other operations

  const { ObjectId } = require('mongodb');

  ////Function User Login
  async function Userlogin(reqUsername, reqPassword) {
    const client = new MongoClient(uri);
    try {
      await client.connect();
  
      // Validate the request payload
      if (!reqUsername || !reqPassword) {
        throw new Error('Missing required fields');
      }
  
      let matchuser = await hostCollection.findOne({ Username: reqUsername });
  
      if (!matchuser) {
        throw new Error('User not found!');
      }

      const passwordMatch = await bcrypt.compare(reqPassword, matchuser.Password);

      if (passwordMatch) {
        return {
          user: matchuser,
        };
      } else {
        throw new Error('Invalid password');
      }
    } catch (error) {
      console.error('Login Error:', error);
      throw new Error('An error occurred during login.');
    } finally {
      await client.close();
    }
  }

  //Function Admin Login
  async function Adminlogin(reqAdminUsername, reqAdminPassword) {
   const client = new MongoClient(uri);
   try {
     await client.connect();

     // Validate the request payload
     if (!reqAdminUsername || !reqAdminPassword) {
       throw new Error('Missing required fields');
     }
     let matchuser = await adminCollection.findOne({ Username: reqAdminUsername });

     if (!matchuser) {
       throw new Error('User not found!');
     }

     const passwordMatch = await bcrypt.compare(reqAdminPassword, matchuser.Password);

     if (passwordMatch) {
       const token = generateToken(matchuser);
       return {
        user: matchuser,
        token: token,
       };
     } else {
       throw new Error('Invalid password');
     }
   } catch (error) {
     console.error('Login Error:', error);
     throw new Error('An error occurred during login.');
   } finally {
     await client.close();
   }
  }
 
  //Function Admin Register
  async function registerAdmin(reqAdminUsername, reqAdminPassword, reqAdminName, reqAdminEmail) {
    const client = new MongoClient(uri);
    try {
      await client.connect();
 
 
      // Validate the request payload
      if (!reqAdminUsername || !reqAdminPassword || !reqAdminName || !reqAdminEmail) {
        throw new Error('Missing required fields');
      }
      
      const hashedPassword = await bcrypt.hash(reqAdminPassword, 10);

      await adminCollection.insertOne({
        Username: reqAdminUsername,
        Password: hashedPassword,
        name: reqAdminName,
        email: reqAdminEmail,
      });
 
      return 'Registration Complete!!';
      } catch (error) {
      console.error('Registration Error:', error);
      throw new Error('An error occurred during registration.');
     } finally {
      await client.close();
    }
  }

  //Function User Register
  async function register(reqUsername, reqPassword, reqName, reqEmail) {
    const client = new MongoClient(uri);
    try {
      await client.connect();
 
 
      // Validate the request payload
      if (!reqUsername || !reqPassword || !reqName || !reqEmail ) {
        throw new Error('Missing required fields');
      }

      const hashedPassword = await bcrypt.hash(reqPassword, 10);
      
      const visitorPass = generateVisitorPass();

      await hostCollection.insertOne({
        Username: reqUsername,
        Password: hashedPassword,
        name: reqName,
        email: reqEmail,
        visitorPass: visitorPass,
      });
 
      return 'Registration Complete!! Visitor Pass: ' + visitorPass;
      } catch (error) {
      console.error('Registration Error:', error);
      throw new Error('An error occurred during registration.');
     } finally {
      await client.close();
    }
   }

   // Function to generate a random visitor pass
  function generateVisitorPass() {
    const passLength = 8;
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    
    let pass = '';
    for (let i = 0; i < passLength; i++) {
      pass += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return pass;
  }

  //Function Generate Token
  function generateToken(user) {
    const payload = 
    {
      username: user.AdminUsername,
    };
    const token = jwt.sign
    (
      payload, 'inipassword', 
      { expiresIn: '1h' }
    );
    return token;
  }
  
  //Function Verify
  function verifyToken(req, res, next) {
    let header = req.headers.authorization;
    console.log(header);
  
    let token = header.split(' ')[1];
  
    jwt.verify(token, 'inipassword', function (err, decoded) {
      if (err) {
        return res.status(401).send('Invalid Token');
      }
  
      req.user = decoded;
      next();
    });
  }
  
  // Express setup
  app.use(express.json());

  //Login User
  app.post('/Userlogin', (req, res) => {
    console.log(req.body);
  
    Userlogin(req.body.Username, req.body.Password)
      .then((result) => {
        res.json(result.user); // Return user information without generating a token
      })
      .catch((error) => {
        res.status(400).send(error.message);
      });
  });
  
  //Register User
  app.post('/register', (req, res) => {
    console.log(req.body);

    register(req.body.Username, req.body.Password, req.body.name, req.body.email)
      .then((result) => {
        res.send(result);
      })
      .catch((error) => {
      res.status(400).send(error.message);
      });
  });
  
  app.post('/create-visit', async (req, res) => {
    try {
      const {visitorName, gender, citizenship, visitorAddress, phoneNo, vehicleNo, hostId, visitDate,place , purpose } = req.body;

      // Ensure all required fields are present
      if (!visitorName || !gender || !hostId || !visitDate || !purpose || !place || !citizenship || !visitorAddress || !phoneNo || !vehicleNo) {
        throw new Error('Missing required fields');
      }

      const db = client.db('CondoVisitorManagement');
      const visitDetailCollection = db.collection('visitDetailCollectionName');

      // Insert the visit data into the visitDetailCollection
      const visitData = {
        visitorName,
        gender,
        citizenship,
        visitorAddress,
        phoneNo,
        vehicleNo,
        hostId,
        visitDate,
        place,
        purpose
      };
      await visitDetailCollection.insertOne(visitData);

      res.send('Visit created successfully');
    } catch (error) {
      console.error('Error creating visit:', error);
      res.status(500).send('An error occurred while creating the visit');
    }
  });

 // Update visitor (only admin)
 app.patch('/update-visit/:visitName',verifyToken, (req, res) => {
  const visitName = req.params.visitName;
  const {visitorName, gender, citizenship, visitorAddress, phoneNo, vehicleNo, hostId, visitDate, place, purpose } = req.body;

  if (!visitorName && !gender && !citizenship && !visitorAddress && !phoneNo && !vehicleNo && !hostId && !visitDate && !place && !purpose) {
    res.status(400).send('No fields provided for update');
    return;
  }

  const updateData = {};

  if (visitorName) updateData.visitorName = visitorName;
  if (gender) updateData.gender = gender;
  if (citizenship) updateData.citizenship = citizenship;
  if (visitorAddress) updateData.visitorAddress = visitorAddress;
  if (phoneNo) updateData.phoneNo = phoneNo;
  if (vehicleNo) updateData.vehicleNo = vehicleNo;
  if (hostId) updateData.hostId = hostId;
  if (visitDate) updateData.visitDate = visitDate;
  if (place) updateData.place = place;
  if (purpose) updateData.purpose = purpose;

  visitDetailCollection
    .findOneAndUpdate({ _id: new ObjectId(visitName) }, { $set: updateData })
    .then((result) => {
      if (!result.value) {
        // No matching document found
        throw new Error('Done Update');
      }
      res.send('Visit updated successfully');
    })
    .catch((error) => {
      console.error('Error updating visit:', error);
      if (error.message === 'Done Update') {
        res.status(404).send('Done Update');
      } else {
        res.status(500).send('An error occurred while updating the visit');
      }
    });
});

  // Delete visit (only admin)
  app.delete('/delete-visit/:visitDetailId',verifyToken, (req, res) => {
    const visitDetailId = req.params.visitDetailId;
  
    visitDetailCollection
      .deleteOne({ _id: new ObjectId(visitDetailId) })
      .then(() => {
        res.send('Visit detail deleted successfully');
      })
      .catch((error) => {
        console.error('Error deleting visit detail:', error);
        res.status(500).send('An error occurred while deleting the visit detail');
      });
  });
  
  // Read visit details (only admin)  
  app.get('/visit-details',verifyToken, (req, res) => {
    visitDetailCollection
      .find({})
      .toArray()
      .then((visitDetails) => {
        res.json(visitDetails);
      })
      .catch((error) => {
        console.error('Error retrieving visit details:', error);
        res.status(500).send('An error occurred while retrieving visit details');
      });
  });
  
  //Register Admin
  app.post('/register-admin', (req, res) => {
    console.log(req.body);
  
    registerAdmin(req.body.Username, req.body.Password, req.body.name, req.body.email)
      .then((result) => {
        res.send(result);
      })
      .catch((error) => {
        res.status(400).send(error.message);
      });
  });

  //Login Admin
  app.post('/login-Admin', (req, res) => {
    console.log(req.body);
  
    Adminlogin(req.body.Username, req.body.Password)
      .then((result) => {
        let token = generateToken(result);
        res.send(token);
      })
      .catch((error) => {
        res.status(400).send(error.message);
      });
  });
  

  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
})
  .catch(err => {
  console.error('Failed to connect to MongoDB:', err);
});




