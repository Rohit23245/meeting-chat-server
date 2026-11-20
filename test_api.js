const https = require('https');
const data = JSON.stringify({
  dob: "1990-01-01",
  tob: "12:00",
  lat: 28.61,
  lon: 77.2
});
const options = {
  hostname: 'my-chat-server-6ybg.onrender.com',
  port: 443,
  path: '/api/astrology/kundli',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};
const req = https.request(options, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log("BODY:", body));
});
req.write(data);
req.end();
