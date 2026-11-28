const express = require('express');

const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  res.send('EMOP server is running');
});

app.listen(PORT, () => {
  console.log(`EMOP server is running on port ${PORT}`);
});
