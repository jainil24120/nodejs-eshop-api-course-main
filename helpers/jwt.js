const expressJwt = require('express-jwt');
require('dotenv/config');

function authJwt() {
    const secret = process.env.secret;
    const api = process.env.API_URL;

    return expressJwt({
        secret,
        algorithms: ['HS256'],
        isRevoked: isRevoked
    }).unless({
        path: [
            { url: /\/public\/uploads(.*)/, methods: ['GET', 'OPTIONS'] },
            { url: /\/api\/v1\/products(.*)/, methods: ['GET', 'OPTIONS'] },
            { url: /\/api\/v1\/categories(.*)/, methods: ['GET', 'OPTIONS'] },
            { url: /\/api\/v1\/orders(.*)/, methods: ['GET', 'OPTIONS', 'POST'] },
            `${api}/users/login`,
            `${api}/users/register`,
             '/',
        ]
    });
}

async function isRevoked(req, payload, done) {
    console.log("Payload received in isRevoked:", payload);
    
    if (!payload || !payload.userId) {
        console.log("🚨 Token is invalid or missing userId");
        return done(null, true); // Reject if token is invalid
    }
    
    return done(null, false); // Allow all authenticated users
}
app.get('/', (req, res) => {
    res.send('Server is running');
});


module.exports = authJwt;
