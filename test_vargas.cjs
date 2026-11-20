const engine = require('./astrologyEngineForChatServer.cjs');

async function run() {
  const req = {
    body: {
      dob: "1990-01-01",
      tob: "12:00:00",
      lat: 28.61,
      lon: 77.2,
      tzone: 5.5
    }
  };
  const res = {
    status: (code) => ({ json: (data) => console.log(JSON.stringify(data, null, 2)) }),
    json: (data) => console.log(JSON.stringify(data, null, 2))
  };
  
  await engine.calculateAstrology(req, res);
}

run();
