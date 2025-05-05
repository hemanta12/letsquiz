const path = require('path');
const jsonServer = require('json-server');
const cors = require('cors');

const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, 'db.json'));
const middlewares = jsonServer.defaults();

// Middleware
server.use(cors());
server.use(middlewares);
server.use(jsonServer.bodyParser);

// Custom login route
server.post('/login', (req, res) => {
  const { email, password } = req.body;
  const users = router.db.get('users').value();
  const user = users.find((u) => u.email === email && u.password === password);

  if (user) {
    res.json({
      token: `mock-token-${user.id}`,
      user: {
        id: user.id,
        email: user.email,
        is_premium: user.is_premium || false,
      },
    });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// Use default JSON Server router
server.use(router);

// Start the server
const PORT = process.env.PORT || 9000;
server.listen(PORT, () => {
  console.log(`✅ JSON Server with custom routes running on http://localhost:${PORT}`);
});
