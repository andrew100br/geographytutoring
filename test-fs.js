const https = require('https');

const postData = JSON.stringify({
    name: "Test",
    email: "test@example.com",
    message: "Test message"
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
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = https.request(options, (res) => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => console.log('Status:', res.statusCode, 'Body:', body));
});
req.on('error', e => console.error(e));
req.write(postData);
req.end();
