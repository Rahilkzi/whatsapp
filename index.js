const express = require('express');
const axios = require('axios');
const fs = require('fs');
const {
  Client,
  RemoteAuth,
  MessageMedia,
} = require('@rahilkazi/whatsapp-web.js');
const SQLiteStore = require('./SQLiteStore');

const app = express();
app.use(express.static('./views'));

app.set('view engine', 'ejs');

const url =
  'https://ded98137-ae7a-481c-9ad7-8402fd1f3d29.pushnotifications.pusher.com/publish_api/v1/instances/ded98137-ae7a-481c-9ad7-8402fd1f3d29/publishes';
const headers = {
  'Content-Type': 'application/json',
  Authorization:
    'Bearer CB77445D96FABD2A1F74F54D25E6AB18FE85BCDDE60E6F99E17EBF3D15330B2C',
};
let data = {
  interests: ['hello'],
  web: {
    notification: {
      title: 'Hello',
      body: 'Hello, world!',
    },
  },
};

// Function to handle sending messages
async function sendMessage(message, content, image) {
  if (image) {
    await client.sendMessage(
      message.from,
      await MessageMedia.fromUrl(image, { unsafeMime: true })
    );
  }
  if (content) {
    await client.sendMessage(message.from, content);
  }
}

// Load the session data
const store = new SQLiteStore();

const client = new Client({
  authStrategy: new RemoteAuth({
    store: store,
    backupSyncIntervalMs: 300000,
  }),
  puppeteer: {
    headless: 'new',
    args: ['--no-sandbox'],
  },
});

let qrCodeImage = ''; // Define a variable to store the QR code image data URL

client.initialize();

client.on('loading_screen', (percent, message) => {
  console.log('LOADING SCREEN', percent, message);
});

client.on('qr', (qr) => {
  // console.log('QR RECEIVED', qr);
  qrCodeImage = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    qr
  )}`;
});

client.on('authenticated', () => {
  console.log('AUTHENTICATED');
});

client.on('auth_failure', (msg) => {
  // Fired if session restore was unsuccessful
  console.error('AUTHENTICATION FAILURE', msg);
});

client.on('ready', () => {
  data = {
    interests: ['hello'],
    web: {
      notification: {
        title: 'Ready',
        body: 'whatsapp is ready',
      },
    },
  };
  pushnot(url, data, headers);
  console.log('READY');
});

client.on('remote_session_saved', () => {
  let data = {
    interests: ['hello'],
    web: {
      notification: {
        title: 'Saved',
        body: 'Whatsapp Session Saved',
      },
    },
  };
  pushnot(url, data, headers);
  console.log('saved');
});

client.on('message', async (message) => {
  // message.getContact().then(async (chats) => {
  //   if (chats.number === '919405013913') {
  try {
    if (message.body === '!ping') {
      await message.reply('pong');
    }

    const apiUrl =
      process.env.URL + 'api?user_input=' + encodeURIComponent(message.body);
    // const apiUrl =
    //   'http://127.0.0.1:5000/api?user_input=' +
    //   encodeURIComponent(message.body);
    // const apiUrl =
    //   'https://bard-api-three.vercel.app/api?user_input=' +
    //   encodeURIComponent(message.body);

    const response = await axios.get(apiUrl);
    const data = response.data;
    const content = data.content;
    const image = data.images[0];

    await sendMessage(message, content, image);
  } catch (error) {
    console.error('Message Handling Error:', error.message);
  }
  //   }
  // });
});

const PORT = process.env.PORT || 3000;

// Serve the QR code on the root path
app.get('/', async (req, res) => {
  const exists = await store.sessionExists({ session: 'RemoteAuth' });
  // Use the result as needed
  if (exists) {
    res.render('index', {
      qr: '',
      hide: 'hidden',
      errmsg: 'your are loged in already',
    });
  } else {
    res.render('index', { qr: qrCodeImage, hide: '', errmsg: '' });
  }
});

const pushnot = (url, data, headers) => {
  axios
    .post(url, data, { headers })
    .then((response) => {
      console.log(response.data);
    })
    .catch((error) => {
      console.error(error.message);
    });
};

app.listen(PORT, () => console.log('Server is running on port ' + PORT));
