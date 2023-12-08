const axios = require('axios');
const http = require('http');
const fs = require('fs');
const {
  Client,
  RemoteAuth,
  MessageMedia,
} = require('@rahilkazi/whatsapp-web.js');
const SQLiteStore = require('./SQLiteStore');

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

// Function to handle language translation
async function translateMessage(message) {
  const options = {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'X-RapidAPI-Key': '28a1aa8d66msh6d641cebad4d626p1c4f86jsn6d655bf181a3',
      'X-RapidAPI-Host': 'text-translator2.p.rapidapi.com',
    },
    body: new URLSearchParams({
      source_language: 'mr',
      target_language: 'en',
      text: message.body,
    }),
  };
  const promise = fetch(url, options);
  promise
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Request failed with status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      // console.log(data.data.translatedText);
      message.reply(data.data.translatedText); // You can process the data here
    })
    .catch((error) => {
      console.error(error); // Handle any errors here
    });
}

// Load the session data
const store = new SQLiteStore();

const client = new Client({
  authStrategy: new RemoteAuth({
    store: store,
    backupSyncIntervalMs: 300000,
  }),
  puppeteer: {
    headless: "new",
    args: ["--no-sandbox"]
  },
});

const url = 'https://text-translator2.p.rapidapi.com/translate';
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
  console.log('READY');
});

client.on('remote_session_saved', () => {
  console.log('saved');
}); 

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  const indexContent = fs.readFileSync('index.html', 'utf8');
  // Replace [QR_CODE_DATA_URL] with the actual data URL
  const updatedIndexContent = indexContent.replace(
    '[QR_CODE_DATA_URL]',
    qrCodeImage
  );
  res.end(updatedIndexContent);
});


client.on('message', async (message) => {
  message.getContact().then(async (chats) => {
    if (chats.number === '919405013913') {
      try {
        if (message.body === '!ping') {
          await message.reply('pong');
        }

        const apiUrl =
          process.env.URL +
          'api?user_input=' +
          encodeURIComponent(message.body);
        // const apiUrl =
        //   'http://127.0.0.1:5000/api?user_input=' +
        //   encodeURIComponent(message.body);

        const response = await axios.get(apiUrl);
        const data = response.data;
        const content = data.content;
        const image = data.images[0];

        await sendMessage(message, content, image);

        // await translateMessage(message);
      } catch (error) {
        console.error('Message Handling Error:', error.message);
      }
    }
  });
});

const PORT = 3000;
server.listen(PORT, () => console.log('Server is running on port ' + PORT));
// server.listen(process.env.PORT, () =>
  // console.log('Server is running on port ' + process.env.PORT)
// );
