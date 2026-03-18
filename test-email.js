const https = require('https');
const postData = JSON.stringify({
    name: "Test Node with Headers",
    email: "test@example.com",
    message: "Test message from Node with fake Origin"
});
const options = {
    hostname: 'formsubmit.co',
    path: '/ajax/andrew100br@gmail.com',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': 'https://magenta-kleicha-7d4887.netlify.app',
        'Referer': 'https://magenta-kleicha-7d4887.netlify.app/',
        'Content-Length': Buffer.byteLength(postData)
    }
};
const req = https.request(options, (res) => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => console.log('Status:', res.statusCode, 'Body:', body));
});
req.write(postData);
req.end();
