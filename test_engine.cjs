const engine = require('./astrologyEngineForChatServer.cjs');
async function run() {
  const data = await engine.calculateKundli(new Date('1990-01-01T12:00:00.000Z'), 28.61, 77.2);
  console.log(data.planets.map(p => ({name: p.name, sign: p.signIndex, asc: data.ascendant_d1, house: p.house})));
}
run();
