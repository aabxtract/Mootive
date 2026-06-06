const app = require("./src/app");

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`\n🚚  Mootive backend running on http://localhost:${PORT}`);
  console.log(`    Health check:  GET http://localhost:${PORT}/api/health\n`);
});
